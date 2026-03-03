import type { JobTrackerCompanyRecord } from "@/types/resume-studio";

export const DEFAULT_COMPANY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "startup", label: "Startup" },
  { value: "enterprise", label: "Enterprise" },
  { value: "agency", label: "Agency" },
  { value: "government", label: "Government" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "healthcare", label: "Healthcare" },
  { value: "other", label: "Other" }
];

export const DEFAULT_CITY_OPTIONS: string[] = [
  "Remote",
  "Riyadh",
  "Jeddah",
  "Dubai",
  "Abu Dhabi",
  "Cairo",
  "London",
  "Berlin",
  "Amsterdam",
  "Toronto",
  "New York",
  "San Francisco",
  "Austin",
  "Seattle"
];

export function normalizeCompanyNameKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,'`’"!@#$%^&*()_+=[\]{};:\\|<>/?~-]+/g, "")
    .trim();
}

export function normalizeCompanyInput(input: {
  name: string;
  city?: string;
  companyType?: string;
  careersUrl?: string;
  websiteUrl?: string;
  notes?: string;
}) {
  const name = input.name.trim();
  return {
    name,
    normalizedName: normalizeCompanyNameKey(name),
    city: input.city?.trim() || "",
    companyType: input.companyType?.trim() || "other",
    careersUrl: input.careersUrl?.trim() || "",
    websiteUrl: input.websiteUrl?.trim() || "",
    notes: input.notes?.trim() || ""
  };
}

export function dedupeCompaniesByName<T extends { name?: string; normalizedName?: string }>(rows: T[]) {
  const byKey = new Map<string, T>();
  rows.forEach((item) => {
    const normalized = item.normalizedName?.trim() || normalizeCompanyNameKey(String(item.name ?? ""));
    if (!normalized) return;
    if (!byKey.has(normalized)) {
      byKey.set(normalized, item);
    }
  });
  return Array.from(byKey.values());
}

export function toCompanySuggestions(companies: JobTrackerCompanyRecord[]) {
  const citySet = new Set<string>();
  const typeSet = new Set<string>();

  companies.forEach((company) => {
    const city = company.city?.trim();
    const type = company.companyType?.trim();
    if (city) citySet.add(city);
    if (type) typeSet.add(type);
  });

  return {
    cityOptions: Array.from(new Set([...DEFAULT_CITY_OPTIONS, ...citySet])).sort((a, b) => a.localeCompare(b)),
    typeOptions: Array.from(new Set([...DEFAULT_COMPANY_TYPE_OPTIONS.map((item) => item.value), ...typeSet])).sort((a, b) => a.localeCompare(b))
  };
}
