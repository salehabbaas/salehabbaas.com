import type { ResumeDocumentRecord, ResumeQualityIssue, ResumeQualityResult } from "@/types/resume-studio";
import { resumeToPlainText, splitLines, countWords } from "@/lib/resume-studio/text";

const COMMON_TYPOS: Array<{ bad: RegExp; good: string; id: string }> = [
  { id: "typo-receieve", bad: /\breceieve\b/gi, good: "receive" },
  { id: "typo-definately", bad: /\bdefinately\b/gi, good: "definitely" },
  { id: "typo-seperate", bad: /\bseperate\b/gi, good: "separate" },
  { id: "typo-managment", bad: /\bmanagment\b/gi, good: "management" },
  { id: "typo-responsibl", bad: /\bresponsibl(e|ity)?\b/gi, good: "responsible / responsibility" },
  { id: "typo-expereince", bad: /\bexpereince\b/gi, good: "experience" }
];

function findExcerpt(line: string, word: string) {
  const index = line.toLowerCase().indexOf(word.toLowerCase());
  if (index === -1) return line.slice(0, 120);
  const start = Math.max(0, index - 18);
  const end = Math.min(line.length, index + word.length + 32);
  return line.slice(start, end).trim();
}

function addIssue(target: ResumeQualityIssue[], issue: ResumeQualityIssue) {
  if (target.some((item) => item.id === issue.id)) return;
  target.push(issue);
}

export function buildQualityScan(doc: ResumeDocumentRecord): ResumeQualityResult {
  const plainText = resumeToPlainText(doc);
  const lines = splitLines(plainText);
  const issues: ResumeQualityIssue[] = [];

  for (const typo of COMMON_TYPOS) {
    const match = plainText.match(typo.bad);
    if (!match?.length) continue;
    addIssue(issues, {
      id: typo.id,
      severity: "minor",
      category: "spelling",
      message: `Possible typo detected (${match[0]}).`,
      recommendation: `Replace with "${typo.good}".`,
      excerpt: findExcerpt(plainText, match[0])
    });
  }

  lines.forEach((line, index) => {
    if (!line) return;

    const repeated = line.match(/\b([a-z]{3,})\s+\1\b/i);
    if (repeated?.[1]) {
      addIssue(issues, {
        id: `repeat-word-${index}`,
        severity: "minor",
        category: "grammar",
        message: `Repeated word "${repeated[1]}" found.`,
        recommendation: "Remove duplicated words for cleaner grammar.",
        excerpt: line.slice(0, 140)
      });
    }

    const words = countWords(line);
    if (words > 34) {
      addIssue(issues, {
        id: `long-line-${index}`,
        severity: words > 42 ? "critical" : "minor",
        category: "readability",
        message: "Line is too long for quick recruiter scanning.",
        recommendation: "Split into shorter bullet points (8-24 words each when possible).",
        excerpt: line.slice(0, 160)
      });
    }

    if (/^(i|my)\b/i.test(line) && words > 16) {
      addIssue(issues, {
        id: `pronoun-heavy-${index}`,
        severity: "minor",
        category: "readability",
        message: "Sentence starts with first-person phrasing and may read less professionally.",
        recommendation: "Prefer action-led phrasing (e.g., Built, Delivered, Led).",
        excerpt: line.slice(0, 160)
      });
    }
  });

  const spellingIssues = issues.filter((issue) => issue.category === "spelling");
  const grammarIssues = issues.filter((issue) => issue.category === "grammar");
  const readabilityIssues = issues.filter((issue) => issue.category === "readability");

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          spellingIssues.length * 4 -
          grammarIssues.length * 5 -
          readabilityIssues.reduce((acc, issue) => acc + (issue.severity === "critical" ? 10 : 4), 0)
      )
    )
  );

  return {
    score,
    issues,
    spellingIssues,
    grammarIssues,
    readabilityIssues,
    aiSuggestions: [],
    scannedAt: new Date().toISOString()
  };
}
