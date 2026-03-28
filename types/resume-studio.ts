export type ResumeDocumentType = "resume" | "cover_letter";

export type ResumePageSize = "A4" | "Letter";
export type ResumeSchemaVersion = 1 | 2;
export type ResumeAiModel = "gpt-5.3" | "gpt-5.2";
export type ResumeEditorModelVersion = 1 | 2;
export type ResumeEditorEngine = "legacy" | "tiptap";
export type ResumeContentFormat = "section-data" | "pm-json";

export type ResumeMarginBox = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ResumeBlockAttributes = {
  textAlign?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  spacingBefore?: number;
  spacingAfter?: number;
  indentLevel?: number;
  firstLineIndent?: number;
  hangingIndent?: number;
  direction?: "ltr" | "rtl" | "auto";
  language?: string;
  keepWithNext?: boolean;
  pageBreakBefore?: boolean;
  columnSpan?: number;
};

export type ResumeTextMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "strike" }
  | { type: "superscript" }
  | { type: "subscript" }
  | { type: "code" }
  | { type: "highlight"; attrs?: { color?: string } }
  | { type: "textColor"; attrs: { color: string } }
  | { type: "fontFamily"; attrs: { value: string } }
  | { type: "fontSize"; attrs: { value: string } }
  | { type: "link"; attrs: { href: string; target?: string; rel?: string } };

export type ResumeTextNode = {
  type: "text";
  text: string;
  marks?: ResumeTextMark[];
};

export type ResumeHardBreakNode = {
  type: "hardBreak";
};

export type ResumeEmojiNode = {
  type: "emoji";
  attrs: {
    shortcode: string;
    value: string;
  };
};

export type ResumeMentionNode = {
  type: "mention";
  attrs: {
    id: string;
    label: string;
  };
};

export type ResumeTagNode = {
  type: "tag";
  attrs: {
    value: string;
  };
};

export type ResumeFootnoteRefNode = {
  type: "footnoteRef";
  attrs: {
    id: string;
  };
};

export type ResumeBookmarkNode = {
  type: "bookmark";
  attrs: {
    id: string;
    label?: string;
  };
};

export type ResumeInlineNode =
  | ResumeTextNode
  | ResumeHardBreakNode
  | ResumeEmojiNode
  | ResumeMentionNode
  | ResumeTagNode
  | ResumeFootnoteRefNode
  | ResumeBookmarkNode;

export type ResumeParagraphNode = {
  type: "paragraph";
  attrs?: ResumeBlockAttributes;
  content?: ResumeInlineNode[];
};

export type ResumeHeadingNode = {
  type: "heading";
  attrs?: ResumeBlockAttributes & { level?: 1 | 2 | 3 | 4 | 5 | 6 };
  content?: ResumeInlineNode[];
};

export type ResumeListItemNode = {
  type: "listItem";
  content: Array<ResumeParagraphNode | ResumeHeadingNode | ResumeBulletListNode | ResumeOrderedListNode | ResumeBlockquoteNode>;
};

export type ResumeBulletListNode = {
  type: "bulletList";
  content: ResumeListItemNode[];
};

export type ResumeOrderedListNode = {
  type: "orderedList";
  content: ResumeListItemNode[];
};

export type ResumeBlockquoteNode = {
  type: "blockquote";
  content: Array<ResumeParagraphNode | ResumeHeadingNode | ResumeBulletListNode | ResumeOrderedListNode>;
};

export type ResumeHorizontalRuleNode = {
  type: "horizontalRule";
};

export type ResumePageBreakNode = {
  type: "pageBreak";
};

export type ResumeCodeBlockNode = {
  type: "codeBlock";
  attrs?: ResumeBlockAttributes & {
    language?: string;
  };
  content?: ResumeInlineNode[];
};

export type ResumeChecklistItemNode = {
  type: "checklistItem";
  attrs?: {
    checked?: boolean;
  };
  content: Array<ResumeParagraphNode | ResumeHeadingNode>;
};

export type ResumeChecklistNode = {
  type: "checklist";
  content: ResumeChecklistItemNode[];
};

export type ResumeTableCellNode = {
  type: "tableCell";
  attrs?: ResumeBlockAttributes & {
    colSpan?: number;
    rowSpan?: number;
    header?: boolean;
  };
  content: Array<ResumeParagraphNode | ResumeHeadingNode | ResumeBulletListNode | ResumeOrderedListNode>;
};

export type ResumeTableRowNode = {
  type: "tableRow";
  content: ResumeTableCellNode[];
};

export type ResumeTableNode = {
  type: "table";
  attrs?: ResumeBlockAttributes & {
    caption?: string;
  };
  content: ResumeTableRowNode[];
};

export type ResumeImageNode = {
  type: "image";
  attrs: {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
  } & ResumeBlockAttributes;
};

export type ResumeColumnsNode = {
  type: "columns";
  attrs?: ResumeBlockAttributes & {
    count?: 1 | 2;
    gap?: number;
  };
  content: Array<ResumeParagraphNode | ResumeHeadingNode | ResumeBulletListNode | ResumeOrderedListNode | ResumeBlockquoteNode>;
};

export type ResumeAttachmentPlaceholderNode = {
  type: "attachmentPlaceholder";
  attrs: {
    fileName: string;
    mimeType?: string;
    nonExportable?: boolean;
  };
};

export type ResumeVideoPlaceholderNode = {
  type: "videoPlaceholder";
  attrs: {
    url: string;
    label?: string;
    nonExportable?: boolean;
  };
};

export type ResumeTocPlaceholderNode = {
  type: "tocPlaceholder";
};

export type ResumeBlockNode =
  | ResumeParagraphNode
  | ResumeHeadingNode
  | ResumeBulletListNode
  | ResumeOrderedListNode
  | ResumeListItemNode
  | ResumeChecklistNode
  | ResumeChecklistItemNode
  | ResumeBlockquoteNode
  | ResumeCodeBlockNode
  | ResumeTableNode
  | ResumeTableRowNode
  | ResumeTableCellNode
  | ResumeImageNode
  | ResumeColumnsNode
  | ResumeHorizontalRuleNode
  | ResumePageBreakNode
  | ResumeAttachmentPlaceholderNode
  | ResumeVideoPlaceholderNode
  | ResumeTocPlaceholderNode;

export type ResumeRichTextDoc = {
  type: "doc";
  content: ResumeBlockNode[];
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
  contentHtmlLegacy?: string;
  contentDoc?: ResumeRichTextDoc;
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
  editorModelVersion: ResumeEditorModelVersion;
  editorEngine: ResumeEditorEngine;
  contentFormat: ResumeContentFormat;
  type: ResumeDocumentType;
  title: string;
  linkedJobId?: string | null;
  templateId: string;
  page: {
    size: ResumePageSize;
    margins?: number;
    marginBox: ResumeMarginBox;
    sectionSpacing: number;
    header?: {
      enabled: boolean;
      contentDoc?: ResumeRichTextDoc;
    };
    footer?: {
      enabled: boolean;
      contentDoc?: ResumeRichTextDoc;
    };
    pageNumbers?: {
      enabled: boolean;
      format?: "numeric" | "page_of_total";
      position?: "left" | "center" | "right";
    };
    columns?: number;
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
    defaultDirection?: "ltr" | "rtl" | "auto";
  };
  collaboration?: {
    roomId?: string;
    lockMode?: "single_editor" | "multi_editor";
    lastSyncedAt?: string;
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

export type ResumeExportType = "pdf" | "txt" | "html" | "markdown" | "docx";

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
