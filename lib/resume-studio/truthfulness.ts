const FACT_PATTERN =
  /\b(?:at|for|with|from|project|projects|certification|certified|certificate|employer|company)\s+([A-Z][A-Za-z0-9&+.'-]*(?:\s+[A-Z][A-Za-z0-9&+.'-]*){0,3})/g;

function normalizeFact(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function collectFactCandidates(text: string) {
  const candidates = new Set<string>();
  const matches = text.matchAll(FACT_PATTERN);
  for (const match of matches) {
    const value = match[1];
    if (!value) continue;
    const normalized = normalizeFact(value);
    if (normalized.length < 3) continue;
    candidates.add(normalized);
  }
  return candidates;
}

export function validateNoFabricatedClaims(input: {
  sourceResumeText: string;
  jobDescription?: string;
  generatedText: string;
}) {
  const sourcePool = `${input.sourceResumeText}\n${input.jobDescription ?? ""}`;
  const sourceFacts = collectFactCandidates(sourcePool);
  const generatedFacts = collectFactCandidates(input.generatedText);
  const addedClaims = [...generatedFacts].filter((fact) => !sourceFacts.has(fact));

  return {
    isValid: addedClaims.length === 0,
    addedClaims
  };
}
