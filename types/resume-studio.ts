export type ResumeDocumentType = "resume" | "cover_letter";

export type ResumePageSize = "A4";
export type ResumeSchemaVersion = 1 | 2;
export type ResumeAiModel = "gpt-5.3" | "gpt-5.2";

export type ResumeMarginBox = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ResumeSectionKind =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "languages"
  | "volunteering"
  | "interests"
  | "publications"
  | "research"
  | "awards"
  | "custom";

export type ResumeSectionData = Record<string, unknown>;

export type ResumeSectionBlock = {
  id: string;
  kind: ResumeSectionKind;
  data: ResumeSectionData;
  locked?: boolean;
};

export type ResumeTemplateCategory =
  | "single_column"
  | "two_column"
  | "sidebar"
  | "compact"
  | "executive"
  | "modern"
  | "academic";

export type TemplateRegion = "header" | "main" | "sidebar" | "footer";

export type TemplateRegionConfig = {
  region: TemplateRegion;
  columns: string;
  gap: number;
  sectionSlots: ResumeSectionKind[];
};

export type TemplateGridSchema = {
  columns: string;
  rows: string;
  gap: number;
};

export type TemplatePageBreakRules = {
  minLinesPerBlock: number;
  avoidSplitKinds: ResumeSectionKind[];
  preferSplitKinds: ResumeSectionKind[];
};

export type TemplateLayoutSchema = {
  grid: TemplateGridSchema;
  regions: TemplateRegionConfig[];
  pageBreak: TemplatePageBreakRules;
};

export type TemplateStyleTokens = {
  fonts: {
    heading: string;
    body: string;
  };
  sizes: {
    title: number;
    heading: number;
    body: number;
    small: number;
  };
  colors: {
    text: string;
    accent: string;
    muted: string;
    background: string;
  };
  spacing: {
    section: number;
    item: number;
    line: number;
  };
  borderRadius: number;
  iconStyle: "none" | "line" | "solid";
};

export type TemplateConstraints = {
  atsFriendly: boolean;
  supportsTwoColumn: boolean;
  supportsPhoto: boolean;
};

export type ResumeTemplateSource = "built_in" | "custom" | "pdf_extracted";

export type ResumeTemplateRecord = {
  id: string;
  ownerId: string;
  schemaVersion: ResumeSchemaVersion;
  name: string;
  description?: string;
  category: ResumeTemplateCategory;
  previewImagePath: string;
  paper: {
    size: ResumePageSize;
    defaultMargins?: number;
    defaultMarginBox: ResumeMarginBox;
  };
  layout: TemplateLayoutSchema;
  styleTokens: TemplateStyleTokens;
  constraints: TemplateConstraints;
  source: ResumeTemplateSource;
  archived?: boolean;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ResumeDocumentRecord = {
  id: string;
  ownerId: string;
  schemaVersion: ResumeSchemaVersion;
  type: ResumeDocumentType;
  title: string;
  linkedJobId?: string | null;
  templateId: string;
  page: {
    size: ResumePageSize;
    margins?: number;
    marginBox: ResumeMarginBox;
    sectionSpacing: number;
  };
  style: {
    primaryColor: string;
    accentColor?: string;
    fontFamily: string;
    fontScale: number;
    lineHeight: number;
    background?: string;
    inheritTemplateColors?: boolean;
    inheritTemplateFonts?: boolean;
  };
  language: {
    mode: "auto" | "manual";
    value?: string;
  };
  sections: ResumeSectionBlock[];
  ats: {
    lastScore?: number;
    lastCheckedAt?: string;
    lastJobHash?: string;
    issues?: AtsIssue[];
  };
  createdAt?: string;
  updatedAt?: string;
  pinned?: boolean;
  tags?: string[];
};

export type ResumeVersionRecord = {
  id: string;
  docId: string;
  ownerId: string;
  createdAt?: string;
  note?: string;
  snapshot: Omit<ResumeDocumentRecord, "id">;
};

export type ResumeExportType = "pdf" | "txt";

export type ResumeExportRecord = {
  id: string;
  docId: string;
  ownerId: string;
  createdAt?: string;
  fileName: string;
  type: ResumeExportType;
  storagePath?: string;
  deliveredByEmail?: boolean;
};

export type JobTrackerStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "archived";

export type JobTrackerCompanyType =
  | "startup"
  | "enterprise"
  | "agency"
  | "government"
  | "nonprofit"
  | "healthcare"
  | "other";

export type JobTrackerCompanyRecord = {
  id: string;
  ownerId: string;
  name: string;
  normalizedName: string;
  city?: string;
  companyType?: JobTrackerCompanyType | string;
  careersUrl?: string;
  websiteUrl?: string;
  notes?: string;
  lastCheckedAt?: string;
  lastCheckNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type JobTrackerJobRecord = {
  id: string;
  ownerId: string;
  companyId?: string;
  company: string;
  title: string;
  location?: string;
  jobUrl?: string;
  status: JobTrackerStatus;
  appliedAt?: string;
  nextFollowUpAt?: string;
  descriptionText: string;
  descriptionSource?: "paste" | "url" | "import";
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type JobResumeLinkRecord = {
  id: string;
  ownerId: string;
  jobId: string;
  docId: string;
  createdAt?: string;
  atsScore?: number;
  notes?: string;
};

export type ResumeActivityRecord = {
  id: string;
  ownerId: string;
  entityType: "resumeDocument" | "job" | "company";
  entityId: string;
  action: string;
  from?: string;
  to?: string;
  createdAt?: string;
};

export type AtsIssueSeverity = "critical" | "minor";

export type AtsIssueGroup = "keywords" | "sections" | "formatting" | "readability";

export type AtsIssue = {
  id: string;
  severity: AtsIssueSeverity;
  group: AtsIssueGroup;
  message: string;
  recommendation: string;
};

export type AtsKeywordCoverage = {
  totalKeywords: number;
  matchedKeywords: number;
  coveragePercent: number;
  topKeywords: string[];
  missingKeywords: string[];
};

export type AtsKeywordMatrixRow = {
  keyword: string;
  resumeCount: number;
  jobCount: number;
  matched: boolean;
};

export type AtsResult = {
  score: number;
  criticalIssues: AtsIssue[];
  minorIssues: AtsIssue[];
  issues: AtsIssue[];
  keywordCoverage: AtsKeywordCoverage;
  recommendations: string[];
  topMissingKeywords: string[];
  keywordMatrix: AtsKeywordMatrixRow[];
  breakdown: {
    deterministic: number;
    keyword: number;
    ai: number;
  };
};

export type ResumeAiImproveMode =
  | "rewrite_bullets"
  | "improve_summary"
  | "fix_grammar"
  | "tailor_to_job"
  | "generate_cover_letter"
  | "custom_prompt";

export type ResumeQualityIssue = {
  id: string;
  severity: "critical" | "minor";
  category: "spelling" | "grammar" | "readability";
  message: string;
  recommendation: string;
  excerpt?: string;
};

export type ResumeQualityResult = {
  score: number;
  issues: ResumeQualityIssue[];
  spellingIssues: ResumeQualityIssue[];
  grammarIssues: ResumeQualityIssue[];
  readabilityIssues: ResumeQualityIssue[];
  aiSuggestions: string[];
  scannedAt: string;
};

export type ResumeImproveResponse = {
  suggestion: string;
  original: string;
  sectionId: string;
  sectionKind: ResumeSectionKind;
  mode: ResumeAiImproveMode;
  modelUsed?: ResumeAiModel;
  fallbackUsed?: boolean;
  contract?: {
    summary?: string;
    bullets?: string[];
    coverLetter?: string;
  };
  diff: {
    originalLines: string[];
    suggestedLines: string[];
    removed: string[];
    added: string[];
  };
};

export type ResumeJobParseResponse = {
  title?: string;
  company?: string;
  normalizedJobDescription: string;
  sourceUrl: string;
  confidence: number;
  warnings: string[];
};

export type ResumeTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  layout: "single" | "sidebar" | "two-column";
};
