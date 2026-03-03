import type { AtsIssue, AtsKeywordMatrixRow, AtsResult, ResumeDocumentRecord, ResumeSectionBlock } from "@/types/resume-studio";
import { countWords, extractKeywords, hashString, resumeToPlainText, tokenize } from "@/lib/resume-studio/text";
import { resolveMarginBox } from "@/lib/resume-studio/normalize";

type BuildAtsInput = {
  doc: ResumeDocumentRecord;
  jobDescription: string;
  aiRecommendations?: string[];
};

export const ATS_WEIGHTING = {
  deterministicMax: 50,
  keywordMax: 35,
  aiMax: 15
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function addIssue(issues: AtsIssue[], issue: AtsIssue) {
  if (issues.some((item) => item.id === issue.id)) return;
  issues.push(issue);
}

function findSection(doc: ResumeDocumentRecord, kind: ResumeSectionBlock["kind"]) {
  return doc.sections.find((section) => section.kind === kind);
}

function listBullets(doc: ResumeDocumentRecord) {
  const bullets: string[] = [];

  for (const section of doc.sections) {
    const items = Array.isArray((section.data as Record<string, unknown>).items)
      ? ((section.data as Record<string, unknown>).items as Array<Record<string, unknown>>)
      : [];

    for (const item of items) {
      const rawBullets = Array.isArray(item.bullets) ? item.bullets : [];
      for (const bullet of rawBullets) {
        if (typeof bullet === "string" && bullet.trim()) {
          bullets.push(bullet.trim());
        }
      }
    }
  }

  return bullets;
}

function getHeaderField(doc: ResumeDocumentRecord, key: string) {
  const header = findSection(doc, "header");
  if (!header) return "";
  const value = (header.data as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function measureSectionCompleteness(doc: ResumeDocumentRecord, issues: AtsIssue[]) {
  const required: Array<{ kind: ResumeSectionBlock["kind"]; label: string }> = [
    { kind: "header", label: "Header" },
    { kind: "summary", label: "Summary" },
    { kind: "experience", label: "Experience" },
    { kind: "skills", label: "Skills" }
  ];

  let score = 0;

  for (const section of required) {
    const found = findSection(doc, section.kind);
    if (!found) {
      addIssue(issues, {
        id: `missing-${section.kind}`,
        severity: "critical",
        group: "sections",
        message: `${section.label} section is missing.`,
        recommendation: `Add a ${section.label.toLowerCase()} section to improve ATS parse quality.`
      });
      continue;
    }

    const text = JSON.stringify(found.data || {});
    if (text.length < 18) {
      addIssue(issues, {
        id: `thin-${section.kind}`,
        severity: "minor",
        group: "sections",
        message: `${section.label} section is very brief.`,
        recommendation: `Expand ${section.label.toLowerCase()} with concrete details.`
      });
      score += 2;
      continue;
    }

    score += 5;
  }

  return clamp(score, 0, 20);
}

function measureContactScore(doc: ResumeDocumentRecord, issues: AtsIssue[]) {
  const email = getHeaderField(doc, "email");
  const phone = getHeaderField(doc, "phone");
  const fullName = getHeaderField(doc, "fullName");

  let score = 0;

  if (fullName) score += 3;
  if (email) score += 4;
  if (phone) score += 3;

  if (!email) {
    addIssue(issues, {
      id: "contact-email-missing",
      severity: "critical",
      group: "sections",
      message: "Header is missing email.",
      recommendation: "Add a professional email address in the header section."
    });
  }

  if (!phone) {
    addIssue(issues, {
      id: "contact-phone-missing",
      severity: "minor",
      group: "sections",
      message: "Header is missing phone number.",
      recommendation: "Add a phone number to increase recruiter contact options."
    });
  }

  return score;
}

function measureReadability(doc: ResumeDocumentRecord, issues: AtsIssue[]) {
  const bullets = listBullets(doc);
  if (!bullets.length) {
    addIssue(issues, {
      id: "readability-bullets-missing",
      severity: "critical",
      group: "readability",
      message: "No measurable bullet points found.",
      recommendation: "Add bullets under experience/projects to communicate impact quickly."
    });
    return 0;
  }

  const bulletWordCounts = bullets.map((bullet) => countWords(bullet));
  const tooLong = bulletWordCounts.filter((count) => count > 32).length;
  const tooShort = bulletWordCounts.filter((count) => count < 5).length;
  const withMetrics = bullets.filter((bullet) => /\d/.test(bullet)).length;
  const pastTense = bullets.filter((bullet) => /\b(led|built|improved|designed|implemented|delivered|increased|reduced|optimized|launched)\b/i.test(bullet)).length;
  const presentTense = bullets.filter((bullet) => /\b(lead|build|improve|design|implement|deliver|increase|reduce|optimize|launch)\b/i.test(bullet)).length;

  let score = 12;

  if (tooLong > 0) {
    score -= clamp(tooLong * 1.2, 0, 4);
    addIssue(issues, {
      id: "readability-long-bullets",
      severity: "minor",
      group: "readability",
      message: "Some bullets are too long for ATS and recruiter scanning.",
      recommendation: "Keep most bullets between 8 and 24 words."
    });
  }

  if (tooShort > 1) {
    score -= clamp(tooShort * 0.8, 0, 3);
    addIssue(issues, {
      id: "readability-short-bullets",
      severity: "minor",
      group: "readability",
      message: "Some bullets are too short to describe impact.",
      recommendation: "Rewrite short bullets with context, action, and measurable result."
    });
  }

  const metricsRatio = withMetrics / bullets.length;
  if (metricsRatio < 0.35) {
    score -= 2;
    addIssue(issues, {
      id: "readability-metrics",
      severity: "minor",
      group: "readability",
      message: "Few bullets include measurable outcomes.",
      recommendation: "Add numbers, percentages, or scale metrics in bullet points."
    });
  }

  const tenseGap = Math.abs(pastTense - presentTense);
  if (pastTense > 0 && presentTense > 0 && tenseGap < bullets.length * 0.7) {
    score -= 2;
    addIssue(issues, {
      id: "readability-tense",
      severity: "minor",
      group: "readability",
      message: "Bullet tense appears inconsistent.",
      recommendation: "Use consistent tense per role (past for previous roles, present for current role)."
    });
  }

  return clamp(score, 0, 12);
}

function measureFormatting(doc: ResumeDocumentRecord, issues: AtsIssue[]) {
  let score = 8;
  const marginBox = resolveMarginBox({
    marginBox: doc.page.marginBox,
    margins: doc.page.margins,
    fallback: 22
  });
  const minMargin = Math.min(marginBox.top, marginBox.right, marginBox.bottom, marginBox.left);

  if (minMargin < 10) {
    score -= 2;
    addIssue(issues, {
      id: "formatting-margins",
      severity: "minor",
      group: "formatting",
      message: "Margins are very tight and may reduce readability.",
      recommendation: "Use page margins between 14 and 28 for ATS-safe layouts."
    });
  }

  if (doc.templateId.includes("two-column")) {
    score -= 1;
    addIssue(issues, {
      id: "formatting-columns",
      severity: "minor",
      group: "formatting",
      message: "Two-column layouts can confuse older ATS parsers.",
      recommendation: "Use a single-column template for strict ATS workflows."
    });
  }

  const plainText = resumeToPlainText(doc);
  if (/\|\s*\|/.test(plainText)) {
    score -= 2;
    addIssue(issues, {
      id: "formatting-table-like",
      severity: "minor",
      group: "formatting",
      message: "Table-like separators detected.",
      recommendation: "Avoid table-like formatting and keep sections linear."
    });
  }

  return clamp(score, 0, 8);
}

function measureKeywordCoverage(doc: ResumeDocumentRecord, jobDescription: string, issues: AtsIssue[]) {
  const resumePlainText = resumeToPlainText(doc);
  const resumeTokens = tokenize(resumePlainText);
  const resumeTokenSet = new Set(resumeTokens);
  const jobTokens = tokenize(jobDescription);
  const topKeywords = extractKeywords(jobDescription, 30);
  if (!topKeywords.length) {
    return {
      keywordScore: 0,
      totalKeywords: 0,
      matchedKeywords: 0,
      coveragePercent: 0,
      topKeywords: [],
      missingKeywords: [],
      keywordMatrix: [] as AtsKeywordMatrixRow[]
    };
  }

  const countOccurrences = (tokens: string[], keyword: string) => {
    let count = 0;
    for (const token of tokens) {
      if (token === keyword) count += 1;
    }
    return count;
  };

  const matchedKeywords = topKeywords.filter((keyword) => resumeTokenSet.has(keyword));
  const missingKeywords = topKeywords.filter((keyword) => !resumeTokenSet.has(keyword));
  const keywordMatrix = topKeywords.map((keyword) => {
    const resumeCount = countOccurrences(resumeTokens, keyword);
    const jobCount = countOccurrences(jobTokens, keyword);
    return {
      keyword,
      resumeCount,
      jobCount,
      matched: resumeCount > 0
    } satisfies AtsKeywordMatrixRow;
  });
  const coveragePercent = Math.round((matchedKeywords.length / topKeywords.length) * 100);
  const keywordScore = clamp(Math.round((coveragePercent / 100) * ATS_WEIGHTING.keywordMax), 0, ATS_WEIGHTING.keywordMax);

  if (coveragePercent < 55) {
    addIssue(issues, {
      id: "keywords-coverage-low",
      severity: "critical",
      group: "keywords",
      message: `Keyword coverage is ${coveragePercent}%, which is low for ATS matching.`,
      recommendation: "Add missing high-signal keywords to summary, skills, and experience bullets."
    });
  }

  if (missingKeywords.length > 0) {
    addIssue(issues, {
      id: "keywords-missing",
      severity: missingKeywords.length > 8 ? "critical" : "minor",
      group: "keywords",
      message: `Missing keywords: ${missingKeywords.slice(0, 6).join(", ")}${missingKeywords.length > 6 ? "..." : ""}`,
      recommendation: "Incorporate missing terms naturally where experience evidence exists."
    });
  }

  return {
    keywordScore,
    totalKeywords: topKeywords.length,
    matchedKeywords: matchedKeywords.length,
    coveragePercent,
    topKeywords,
    missingKeywords,
    keywordMatrix
  };
}

function defaultRecommendations(resultIssues: AtsIssue[], missingKeywords: string[]) {
  const recommendations = new Set<string>();

  if (missingKeywords.length) {
    recommendations.add(`Add these keywords where relevant: ${missingKeywords.slice(0, 8).join(", ")}.`);
  }

  for (const issue of resultIssues.slice(0, 6)) {
    recommendations.add(issue.recommendation);
  }

  return [...recommendations].slice(0, 8);
}

export function buildAtsResult({ doc, jobDescription, aiRecommendations }: BuildAtsInput): AtsResult {
  const issues: AtsIssue[] = [];

  const sectionScore = measureSectionCompleteness(doc, issues);
  const contactScore = measureContactScore(doc, issues);
  const readabilityScore = measureReadability(doc, issues);
  const formattingScore = measureFormatting(doc, issues);

  const deterministic = clamp(
    Math.round(sectionScore + contactScore + readabilityScore + formattingScore),
    0,
    ATS_WEIGHTING.deterministicMax
  );

  const keywordDetails = measureKeywordCoverage(doc, jobDescription, issues);
  const keyword = keywordDetails.keywordScore;

  const aiHints = (aiRecommendations ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 6);
  const ai = clamp(aiHints.length >= 3 ? ATS_WEIGHTING.aiMax : aiHints.length * 4, 0, ATS_WEIGHTING.aiMax);

  const score = clamp(deterministic + keyword + ai, 0, 100);

  const criticalIssues = issues.filter((issue) => issue.severity === "critical");
  const minorIssues = issues.filter((issue) => issue.severity === "minor");

  const recommendations = aiHints.length ? [...new Set([...aiHints, ...defaultRecommendations(issues, keywordDetails.missingKeywords)])] : defaultRecommendations(issues, keywordDetails.missingKeywords);

  return {
    score,
    issues,
    criticalIssues,
    minorIssues,
    keywordCoverage: {
      totalKeywords: keywordDetails.totalKeywords,
      matchedKeywords: keywordDetails.matchedKeywords,
      coveragePercent: keywordDetails.coveragePercent,
      topKeywords: keywordDetails.topKeywords,
      missingKeywords: keywordDetails.missingKeywords
    },
    recommendations: recommendations.slice(0, 10),
    topMissingKeywords: keywordDetails.missingKeywords.slice(0, 12),
    keywordMatrix: keywordDetails.keywordMatrix,
    breakdown: {
      deterministic,
      keyword,
      ai
    }
  };
}

export function buildJobHash(jobDescription: string) {
  return hashString(jobDescription.trim().toLowerCase());
}
