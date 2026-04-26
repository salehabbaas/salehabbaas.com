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

// Common tech/professional synonyms for better matching
const SYNONYM_MAP: Record<string, string[]> = {
  javascript: ["js", "node", "nodejs", "react", "vue", "angular", "typescript", "ts"],
  python: ["py", "django", "flask", "fastapi", "pandas", "numpy"],
  "machine learning": ["ml", "ai", "deep learning", "neural", "tensorflow", "pytorch"],
  "project management": ["pm", "pmp", "scrum", "agile", "kanban", "jira"],
  sql: ["mysql", "postgresql", "postgres", "sqlite", "mssql", "oracle", "database"],
  aws: ["amazon web services", "ec2", "s3", "lambda", "cloud", "azure", "gcp"],
  leadership: ["managed", "led", "directed", "oversaw", "supervised"],
  communication: ["presented", "collaborated", "communicated", "stakeholder"],
  "data analysis": ["analytics", "data science", "reporting", "tableau", "powerbi"],
  kubernetes: ["k8s", "docker", "containerization", "devops", "ci/cd"],
  healthcare: ["clinical", "patient", "ehr", "emr", "hl7", "fhir", "hipaa"],
  "software engineer": ["software developer", "swe", "programmer", "developer"],
  manager: ["director", "lead", "head", "senior"],
  api: ["rest", "graphql", "microservices", "integration", "endpoint"],
  testing: ["qa", "unit test", "integration test", "tdd", "jest", "cypress"],
};

// Industry-specific high-value keywords that get extra weight
const HIGH_VALUE_KEYWORDS = new Set([
  "led", "managed", "built", "designed", "implemented", "improved", "increased",
  "reduced", "delivered", "launched", "optimized", "developed", "created",
  "architected", "deployed", "scaled", "automated", "transformed",
]);

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

/** Extract multi-word phrases (bigrams + trigrams) from text */
function extractPhrases(text: string, maxN = 3): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 1);
  const phrases: string[] = [];

  for (let n = 2; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      phrases.push(words.slice(i, i + n).join(" "));
    }
  }

  return phrases;
}

/** Check if a job keyword matches any synonym in the resume */
function matchesWithSynonyms(keyword: string, resumeText: string): boolean {
  const lower = resumeText.toLowerCase();
  if (lower.includes(keyword.toLowerCase())) return true;

  // Check synonym map
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    const allVariants = [canonical, ...synonyms];
    if (allVariants.some(v => v.toLowerCase() === keyword.toLowerCase())) {
      // keyword is related to this group — check if any variant appears in resume
      return allVariants.some(v => lower.includes(v.toLowerCase()));
    }
  }

  return false;
}

function measureSectionCompleteness(doc: ResumeDocumentRecord, issues: AtsIssue[]) {
  const required: Array<{ kind: ResumeSectionBlock["kind"]; label: string; criticalScore: number }> = [
    { kind: "header", label: "Header", criticalScore: 8 },
    { kind: "summary", label: "Summary", criticalScore: 5 },
    { kind: "experience", label: "Experience", criticalScore: 5 },
    { kind: "skills", label: "Skills", criticalScore: 4 }
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
      score += Math.floor(section.criticalScore * 0.4);
      continue;
    }

    score += section.criticalScore;
  }

  // Bonus: check for LinkedIn URL presence
  const header = findSection(doc, "header");
  const links = header?.data ? JSON.stringify(header.data) : "";
  if (links.includes("linkedin")) {
    score += 2;
  } else {
    addIssue(issues, {
      id: "contact-linkedin-missing",
      severity: "minor",
      group: "sections",
      message: "No LinkedIn URL found in header.",
      recommendation: "Add your LinkedIn profile URL to improve recruiter outreach."
    });
  }

  return clamp(score, 0, 24);
}

function measureContactScore(doc: ResumeDocumentRecord, issues: AtsIssue[]) {
  const email = getHeaderField(doc, "email");
  const phone = getHeaderField(doc, "phone");
  const fullName = getHeaderField(doc, "fullName");
  const location = getHeaderField(doc, "location");

  let score = 0;

  if (fullName) score += 3;
  if (email) score += 4;
  if (phone) score += 3;
  if (location) score += 2;

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

  if (!location) {
    addIssue(issues, {
      id: "contact-location-missing",
      severity: "minor",
      group: "sections",
      message: "No location found in header.",
      recommendation: "Add your city/region (e.g. 'Toronto, ON') to help with geo-targeted searches."
    });
  }

  return clamp(score, 0, 12);
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
  const withActionVerbs = bullets.filter((bullet) => HIGH_VALUE_KEYWORDS.has(bullet.trim().split(/\s+/)[0]?.toLowerCase() ?? "")).length;
  const pastTense = bullets.filter((bullet) => /\b(led|built|improved|designed|implemented|delivered|increased|reduced|optimized|launched|managed|created|developed|deployed|scaled|automated)\b/i.test(bullet)).length;
  const presentTense = bullets.filter((bullet) => /\b(lead|build|improve|design|implement|deliver|increase|reduce|optimize|launch|manage|create|develop|deploy|scale|automate)\b/i.test(bullet)).length;

  let score = 14;

  if (tooLong > 0) {
    score -= clamp(tooLong * 1.2, 0, 4);
    addIssue(issues, {
      id: "readability-long-bullets",
      severity: "minor",
      group: "readability",
      message: `${tooLong} bullet(s) are too long for ATS and recruiter scanning.`,
      recommendation: "Keep most bullets between 8 and 24 words for maximum impact."
    });
  }

  if (tooShort > 1) {
    score -= clamp(tooShort * 0.8, 0, 3);
    addIssue(issues, {
      id: "readability-short-bullets",
      severity: "minor",
      group: "readability",
      message: `${tooShort} bullet(s) are too short to describe impact.`,
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
      message: `Only ${Math.round(metricsRatio * 100)}% of bullets include measurable outcomes.`,
      recommendation: "Add numbers, percentages, dollar amounts, or scale metrics to at least 40% of bullets."
    });
  }

  const actionVerbRatio = withActionVerbs / bullets.length;
  if (actionVerbRatio < 0.5) {
    score -= 1;
    addIssue(issues, {
      id: "readability-action-verbs",
      severity: "minor",
      group: "readability",
      message: "Fewer than 50% of bullets start with strong action verbs.",
      recommendation: "Start bullets with impactful verbs like 'Led', 'Built', 'Delivered', 'Optimized'."
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
      recommendation: "Use consistent tense per role (past tense for previous roles, present for current)."
    });
  }

  return clamp(score, 0, 14);
}

function measureFormatting(doc: ResumeDocumentRecord, issues: AtsIssue[]) {
  let score = 10;
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
      recommendation: "Use page margins between 14 and 28pt for ATS-safe layouts."
    });
  }

  if (doc.templateId.includes("two-column") || doc.templateId.includes("sidebar")) {
    score -= 2;
    addIssue(issues, {
      id: "formatting-columns",
      severity: "minor",
      group: "formatting",
      message: "Two-column/sidebar layouts can confuse older ATS parsers.",
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
      recommendation: "Avoid table-like formatting and keep sections in linear flow."
    });
  }

  // Check for excessively long summary
  const summary = findSection(doc, "summary");
  if (summary) {
    const summaryText = JSON.stringify(summary.data || "");
    const wordCount = countWords(summaryText);
    if (wordCount > 120) {
      score -= 1;
      addIssue(issues, {
        id: "formatting-summary-too-long",
        severity: "minor",
        group: "formatting",
        message: "Professional summary may be too long (over 120 words).",
        recommendation: "Aim for 3-5 concise sentences (50-80 words) that highlight your value proposition."
      });
    }
  }

  return clamp(score, 0, 10);
}

/** Enhanced keyword matching with phrases, synonyms, and variants */
function measureKeywordCoverage(doc: ResumeDocumentRecord, jobDescription: string, issues: AtsIssue[]) {
  const resumePlainText = resumeToPlainText(doc);
  const resumeTokens = tokenize(resumePlainText);
  const resumeTokenSet = new Set(resumeTokens);
  const jobTokens = tokenize(jobDescription);

  // Extract top single-word keywords
  const topSingleKeywords = extractKeywords(jobDescription, 25);

  // Extract top phrases from job description
  const jobPhrases = extractPhrases(jobDescription, 3);
  const phraseCounts = new Map<string, number>();
  for (const phrase of jobPhrases) {
    phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
  }

  // Top repeated phrases (bigrams/trigrams that appear 2+ times)
  const topPhrases = [...phraseCounts.entries()]
    .filter(([phrase, count]) => count >= 2 && phrase.split(" ").every(w => w.length > 2))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase]) => phrase);

  // Combine: prioritized unique keywords
  const allJobKeywords = [...new Set([...topSingleKeywords, ...topPhrases])].slice(0, 35);

  if (!allJobKeywords.length) {
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

  // Use enhanced synonym-aware matching
  const matchedKeywords = allJobKeywords.filter((keyword) =>
    matchesWithSynonyms(keyword, resumePlainText) || resumeTokenSet.has(keyword)
  );
  const missingKeywords = allJobKeywords.filter((keyword) =>
    !matchesWithSynonyms(keyword, resumePlainText) && !resumeTokenSet.has(keyword)
  );

  const keywordMatrix = allJobKeywords.map((keyword) => {
    const resumeCount = countOccurrences(resumeTokens, keyword);
    const jobCount = countOccurrences(jobTokens, keyword);
    const matched = matchesWithSynonyms(keyword, resumePlainText) || resumeCount > 0;
    return {
      keyword,
      resumeCount,
      jobCount,
      matched
    } satisfies AtsKeywordMatrixRow;
  });

  const coveragePercent = Math.round((matchedKeywords.length / allJobKeywords.length) * 100);

  // Weighted scoring: high-value action keywords get bonus
  const highValueMatched = matchedKeywords.filter(kw => HIGH_VALUE_KEYWORDS.has(kw)).length;
  const baseScore = Math.round((coveragePercent / 100) * ATS_WEIGHTING.keywordMax);
  const bonus = clamp(highValueMatched, 0, 3);
  const keywordScore = clamp(baseScore + bonus, 0, ATS_WEIGHTING.keywordMax);

  if (coveragePercent < 40) {
    addIssue(issues, {
      id: "keywords-coverage-critical",
      severity: "critical",
      group: "keywords",
      message: `Keyword coverage is only ${coveragePercent}% — very low for ATS matching.`,
      recommendation: "Add missing high-signal keywords to your summary, skills, and experience bullets."
    });
  } else if (coveragePercent < 60) {
    addIssue(issues, {
      id: "keywords-coverage-low",
      severity: "minor",
      group: "keywords",
      message: `Keyword coverage is ${coveragePercent}%, below the recommended 60%+ threshold.`,
      recommendation: "Incorporate more job-specific terms naturally throughout your resume."
    });
  }

  if (missingKeywords.length > 0) {
    const topMissing = missingKeywords.slice(0, 6);
    addIssue(issues, {
      id: "keywords-missing",
      severity: missingKeywords.length > 8 ? "critical" : "minor",
      group: "keywords",
      message: `${missingKeywords.length} keywords missing: ${topMissing.join(", ")}${missingKeywords.length > 6 ? "..." : ""}`,
      recommendation: "Incorporate missing terms naturally where experience evidence exists."
    });
  }

  // Check for keyword stuffing (same keyword too many times)
  const stuffed = keywordMatrix.filter(row => row.resumeCount > 5 && row.resumeCount > row.jobCount * 3);
  if (stuffed.length > 0) {
    addIssue(issues, {
      id: "keywords-stuffing",
      severity: "minor",
      group: "keywords",
      message: `Possible keyword stuffing detected for: ${stuffed.map(r => r.keyword).join(", ")}.`,
      recommendation: "Use keywords naturally — most should appear 1-3 times at most."
    });
  }

  return {
    keywordScore,
    totalKeywords: allJobKeywords.length,
    matchedKeywords: matchedKeywords.length,
    coveragePercent,
    topKeywords: allJobKeywords,
    missingKeywords,
    keywordMatrix
  };
}

function defaultRecommendations(resultIssues: AtsIssue[], missingKeywords: string[]) {
  const recommendations = new Set<string>();

  if (missingKeywords.length) {
    recommendations.add(`Add these high-value keywords where relevant: ${missingKeywords.slice(0, 8).join(", ")}.`);
  }

  for (const issue of resultIssues.filter(i => i.severity === "critical").slice(0, 4)) {
    recommendations.add(issue.recommendation);
  }

  for (const issue of resultIssues.filter(i => i.severity === "minor").slice(0, 4)) {
    recommendations.add(issue.recommendation);
  }

  return [...recommendations].slice(0, 10);
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

  const keywordDetails = jobDescription.trim()
    ? measureKeywordCoverage(doc, jobDescription, issues)
    : {
        keywordScore: 0,
        totalKeywords: 0,
        matchedKeywords: 0,
        coveragePercent: 0,
        topKeywords: [],
        missingKeywords: [],
        keywordMatrix: [] as AtsKeywordMatrixRow[]
      };

  const keyword = keywordDetails.keywordScore;

  const aiHints = (aiRecommendations ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 6);
  const ai = clamp(aiHints.length >= 3 ? ATS_WEIGHTING.aiMax : aiHints.length * 4, 0, ATS_WEIGHTING.aiMax);

  const score = clamp(deterministic + keyword + ai, 0, 100);

  const criticalIssues = issues.filter((issue) => issue.severity === "critical");
  const minorIssues = issues.filter((issue) => issue.severity === "minor");

  const recommendations = aiHints.length
    ? [...new Set([...aiHints, ...defaultRecommendations(issues, keywordDetails.missingKeywords)])]
    : defaultRecommendations(issues, keywordDetails.missingKeywords);

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
