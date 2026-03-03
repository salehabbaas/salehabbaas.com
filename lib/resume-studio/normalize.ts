import type {
  ResumeDocumentRecord,
  ResumeMarginBox,
  ResumeSchemaVersion,
  ResumeSectionBlock,
  ResumeSectionKind,
  ResumeTemplateRecord
} from "@/types/resume-studio";

export const RESUME_STUDIO_SCHEMA_VERSION = 2 as const;

const DEFAULT_MARGIN = 22;
const DEFAULT_SECTION_SPACING = 14;
const DEFAULT_GRID_GAP = 14;
const DEFAULT_REGION_GAP = 8;

const KNOWN_TEMPLATE_CATEGORIES: ResumeTemplateRecord["category"][] = [
  "single_column",
  "two_column",
  "sidebar",
  "compact",
  "executive",
  "modern",
  "academic"
];

const KNOWN_TEMPLATE_SOURCES: ResumeTemplateRecord["source"][] = ["built_in", "custom", "pdf_extracted"];
const KNOWN_ICON_STYLES: ResumeTemplateRecord["styleTokens"]["iconStyle"][] = ["none", "line", "solid"];

const KNOWN_SECTION_KINDS: ResumeSectionKind[] = [
  "header",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "languages",
  "volunteering",
  "interests",
  "publications",
  "research",
  "awards",
  "custom"
];

const KNOWN_SECTION_KIND_SET = new Set<ResumeSectionKind>(KNOWN_SECTION_KINDS);

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

export function createMarginBox(value = DEFAULT_MARGIN): ResumeMarginBox {
  const margin = Math.max(0, asNumber(value, DEFAULT_MARGIN));
  return {
    top: margin,
    right: margin,
    bottom: margin,
    left: margin
  };
}

export function collapseMarginBox(marginBox: ResumeMarginBox) {
  const average = (marginBox.top + marginBox.right + marginBox.bottom + marginBox.left) / 4;
  return Math.round(average * 100) / 100;
}

export function resolveMarginBox(input: {
  marginBox?: unknown;
  margins?: unknown;
  fallback?: number;
}) {
  const fallback = asNumber(input.fallback, DEFAULT_MARGIN);
  const marginBox = asObject(input.marginBox);

  const hasMarginBox = ["top", "right", "bottom", "left"].some((key) => key in marginBox);
  if (hasMarginBox) {
    return {
      top: Math.max(0, asNumber(marginBox.top, fallback)),
      right: Math.max(0, asNumber(marginBox.right, fallback)),
      bottom: Math.max(0, asNumber(marginBox.bottom, fallback)),
      left: Math.max(0, asNumber(marginBox.left, fallback))
    } satisfies ResumeMarginBox;
  }

  const scalar = asNumber(input.margins, fallback);
  return createMarginBox(scalar);
}

function normalizeSchemaVersion(value: unknown): ResumeSchemaVersion {
  if (value === 1) return 1;
  return RESUME_STUDIO_SCHEMA_VERSION;
}

function normalizeSectionKind(value: unknown): ResumeSectionKind {
  if (typeof value === "string" && KNOWN_SECTION_KIND_SET.has(value as ResumeSectionKind)) {
    return value as ResumeSectionKind;
  }
  return "custom";
}

function normalizeSections(value: unknown): ResumeSectionBlock[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const record = asObject(item);
    return {
      id: asString(record.id, `section-${index + 1}`),
      kind: normalizeSectionKind(record.kind),
      data: asObject(record.data),
      locked: Boolean(record.locked)
    } satisfies ResumeSectionBlock;
  });
}

function normalizeTemplateRegions(value: unknown): ResumeTemplateRecord["layout"]["regions"] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = asObject(item);
      const region = asString(record.region, "main");
      if (region !== "header" && region !== "main" && region !== "sidebar" && region !== "footer") {
        return null;
      }

      const sectionSlots = Array.isArray(record.sectionSlots)
        ? record.sectionSlots
            .map((slot) => normalizeSectionKind(slot))
            .filter((slot, idx, arr) => arr.indexOf(slot) === idx)
        : [];

      const gap = Math.max(0, asNumber(record.gap, DEFAULT_REGION_GAP));

      return {
        region,
        columns: asString(record.columns, "1fr"),
        gap,
        sectionSlots
      } satisfies ResumeTemplateRecord["layout"]["regions"][number];
    })
    .filter((item): item is ResumeTemplateRecord["layout"]["regions"][number] => Boolean(item));
}

function defaultTemplateRegions(): ResumeTemplateRecord["layout"]["regions"] {
  return [
    { region: "header", columns: "1fr", gap: DEFAULT_REGION_GAP, sectionSlots: ["header", "summary"] },
    {
      region: "main",
      columns: "1fr",
      gap: 12,
      sectionSlots: ["experience", "projects", "education", "publications", "research", "custom"]
    },
    {
      region: "sidebar",
      columns: "1fr",
      gap: DEFAULT_REGION_GAP,
      sectionSlots: ["skills", "languages", "interests", "awards", "volunteering"]
    },
    { region: "footer", columns: "1fr", gap: DEFAULT_REGION_GAP, sectionSlots: [] }
  ];
}

function normalizeTemplateCategory(value: unknown): ResumeTemplateRecord["category"] {
  if (typeof value === "string" && KNOWN_TEMPLATE_CATEGORIES.includes(value as ResumeTemplateRecord["category"])) {
    return value as ResumeTemplateRecord["category"];
  }
  return "single_column";
}

function normalizeTemplateSource(value: unknown): ResumeTemplateRecord["source"] {
  if (typeof value === "string" && KNOWN_TEMPLATE_SOURCES.includes(value as ResumeTemplateRecord["source"])) {
    return value as ResumeTemplateRecord["source"];
  }
  return "custom";
}

function normalizeIconStyle(value: unknown): ResumeTemplateRecord["styleTokens"]["iconStyle"] {
  if (typeof value === "string" && KNOWN_ICON_STYLES.includes(value as ResumeTemplateRecord["styleTokens"]["iconStyle"])) {
    return value as ResumeTemplateRecord["styleTokens"]["iconStyle"];
  }
  return "none";
}

export function normalizeResumeDocumentRecord(input: {
  id: string;
  data: Record<string, unknown>;
}): ResumeDocumentRecord {
  const data = input.data;
  const page = asObject(data.page);
  const style = asObject(data.style);
  const language = asObject(data.language);
  const ats = asObject(data.ats);

  const marginBox = resolveMarginBox({
    marginBox: page.marginBox,
    margins: page.margins,
    fallback: DEFAULT_MARGIN
  });

  return {
    id: input.id,
    ownerId: asString(data.ownerId),
    schemaVersion: normalizeSchemaVersion(data.schemaVersion),
    type: data.type === "cover_letter" ? "cover_letter" : "resume",
    title: asString(data.title, "Untitled Resume"),
    linkedJobId: typeof data.linkedJobId === "string" ? data.linkedJobId : null,
    templateId: asString(data.templateId, "classic-single-column"),
    page: {
      size: "A4",
      margins: collapseMarginBox(marginBox),
      marginBox,
      sectionSpacing: Math.max(0, asNumber(page.sectionSpacing, DEFAULT_SECTION_SPACING))
    },
    style: {
      primaryColor: asString(style.primaryColor, "#0f172a"),
      accentColor: style.accentColor ? asString(style.accentColor) : undefined,
      fontFamily: asString(style.fontFamily, "Arimo"),
      fontScale: asNumber(style.fontScale, 1),
      lineHeight: asNumber(style.lineHeight, 1.4),
      background: style.background ? asString(style.background) : undefined,
      inheritTemplateColors: typeof style.inheritTemplateColors === "boolean" ? style.inheritTemplateColors : false,
      inheritTemplateFonts: typeof style.inheritTemplateFonts === "boolean" ? style.inheritTemplateFonts : false
    },
    language: {
      mode: language.mode === "manual" ? "manual" : "auto",
      value: language.value ? asString(language.value) : undefined
    },
    sections: normalizeSections(data.sections),
    ats: {
      lastScore: typeof ats.lastScore === "number" ? ats.lastScore : undefined,
      lastCheckedAt: asIso(ats.lastCheckedAt),
      lastJobHash: typeof ats.lastJobHash === "string" ? ats.lastJobHash : undefined,
      issues: Array.isArray(ats.issues) ? (ats.issues as ResumeDocumentRecord["ats"]["issues"]) : []
    },
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
    pinned: Boolean(data.pinned),
    tags: Array.isArray(data.tags) ? data.tags.filter((item): item is string => typeof item === "string") : []
  };
}

export function normalizeResumeTemplateRecord(input: {
  id: string;
  data: Record<string, unknown>;
}): ResumeTemplateRecord {
  const data = input.data;
  const paper = asObject(data.paper);
  const layout = asObject(data.layout);
  const grid = asObject(layout.grid);
  const pageBreak = asObject(layout.pageBreak);
  const styleTokens = asObject(data.styleTokens);
  const fonts = asObject(styleTokens.fonts);
  const sizes = asObject(styleTokens.sizes);
  const colors = asObject(styleTokens.colors);
  const spacing = asObject(styleTokens.spacing);
  const constraints = asObject(data.constraints);
  const normalizedRegions = normalizeTemplateRegions(layout.regions);

  const defaultMarginBox = resolveMarginBox({
    marginBox: paper.defaultMarginBox,
    margins: paper.defaultMargins,
    fallback: DEFAULT_MARGIN
  });

  return {
    id: input.id,
    ownerId: asString(data.ownerId),
    schemaVersion: normalizeSchemaVersion(data.schemaVersion),
    name: asString(data.name, "Untitled Template"),
    description: typeof data.description === "string" ? data.description : undefined,
    category: normalizeTemplateCategory(data.category),
    previewImagePath: asString(data.previewImagePath),
    paper: {
      size: "A4",
      defaultMargins: collapseMarginBox(defaultMarginBox),
      defaultMarginBox
    },
    layout: {
      grid: {
        columns: asString(grid.columns, "1fr"),
        rows: asString(grid.rows, "auto 1fr auto"),
        gap: Math.max(0, asNumber(grid.gap, DEFAULT_GRID_GAP))
      },
      regions: normalizedRegions.length ? normalizedRegions : defaultTemplateRegions(),
      pageBreak: {
        minLinesPerBlock: Math.max(1, Math.floor(asNumber(pageBreak.minLinesPerBlock, 3))),
        avoidSplitKinds: Array.isArray(pageBreak.avoidSplitKinds)
          ? pageBreak.avoidSplitKinds.map((kind) => normalizeSectionKind(kind))
          : [],
        preferSplitKinds: Array.isArray(pageBreak.preferSplitKinds)
          ? pageBreak.preferSplitKinds.map((kind) => normalizeSectionKind(kind))
          : []
      }
    },
    styleTokens: {
      fonts: {
        heading: asString(fonts.heading, "Arimo"),
        body: asString(fonts.body, "Arimo")
      },
      sizes: {
        title: asNumber(sizes.title, 31),
        heading: asNumber(sizes.heading, 12),
        body: asNumber(sizes.body, 10.5),
        small: asNumber(sizes.small, 9)
      },
      colors: {
        text: asString(colors.text, "#111827"),
        accent: asString(colors.accent, "#2563eb"),
        muted: asString(colors.muted, "#475569"),
        background: asString(colors.background, "#ffffff")
      },
      spacing: {
        section: asNumber(spacing.section, 12),
        item: asNumber(spacing.item, 8),
        line: asNumber(spacing.line, 1.35)
      },
      borderRadius: asNumber(styleTokens.borderRadius, 8),
      iconStyle: normalizeIconStyle(styleTokens.iconStyle)
    },
    constraints: {
      atsFriendly: constraints.atsFriendly !== false,
      supportsTwoColumn: asBoolean(constraints.supportsTwoColumn, false),
      supportsPhoto: asBoolean(constraints.supportsPhoto, false)
    },
    source: normalizeTemplateSource(data.source),
    archived: asBoolean(data.archived, false),
    archivedAt: asIso(data.archivedAt),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt)
  };
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined) continue;
      output[key] = stripUndefinedDeep(entry);
    }
    return output as T;
  }

  return value;
}

export function toPersistedResumeDocument(doc: ResumeDocumentRecord): Omit<ResumeDocumentRecord, "id" | "createdAt" | "updatedAt"> {
  const marginBox = resolveMarginBox({
    marginBox: doc.page.marginBox,
    margins: doc.page.margins,
    fallback: DEFAULT_MARGIN
  });

  return stripUndefinedDeep({
    ownerId: doc.ownerId,
    schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
    type: doc.type,
    title: doc.title,
    linkedJobId: doc.linkedJobId ?? null,
    templateId: doc.templateId,
    page: {
      size: "A4",
      margins: collapseMarginBox(marginBox),
      marginBox,
      sectionSpacing: asNumber(doc.page.sectionSpacing, DEFAULT_SECTION_SPACING)
    },
    style: {
      primaryColor: doc.style.primaryColor,
      accentColor: doc.style.accentColor,
      fontFamily: doc.style.fontFamily,
      fontScale: asNumber(doc.style.fontScale, 1),
      lineHeight: asNumber(doc.style.lineHeight, 1.4),
      background: doc.style.background,
      inheritTemplateColors: Boolean(doc.style.inheritTemplateColors),
      inheritTemplateFonts: Boolean(doc.style.inheritTemplateFonts)
    },
    language: doc.language,
    sections: doc.sections,
    ats: doc.ats,
    pinned: doc.pinned ?? false,
    tags: doc.tags ?? []
  });
}

export function toPersistedResumeTemplate(template: ResumeTemplateRecord): Omit<ResumeTemplateRecord, "id" | "createdAt" | "updatedAt"> {
  const defaultMarginBox = resolveMarginBox({
    marginBox: template.paper.defaultMarginBox,
    margins: template.paper.defaultMargins,
    fallback: DEFAULT_MARGIN
  });

  return stripUndefinedDeep({
    ownerId: template.ownerId,
    schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
    name: template.name,
    description: template.description,
    category: template.category,
    previewImagePath: template.previewImagePath,
    paper: {
      size: "A4",
      defaultMargins: collapseMarginBox(defaultMarginBox),
      defaultMarginBox
    },
    layout: template.layout,
    styleTokens: template.styleTokens,
    constraints: template.constraints,
    source: template.source,
    archived: Boolean(template.archived),
    archivedAt: template.archivedAt
  });
}

export function marginBoxToCssPadding(marginBox: ResumeMarginBox) {
  return `${marginBox.top}px ${marginBox.right}px ${marginBox.bottom}px ${marginBox.left}px`;
}

export function minimumMargin(marginBox: ResumeMarginBox) {
  return Math.min(marginBox.top, marginBox.right, marginBox.bottom, marginBox.left);
}
