import type {
  ResumeDocumentRecord,
  ResumeMarginBox,
  ResumeSectionBlock,
  ResumeSectionKind,
  ResumeTemplateCategory,
  ResumeTemplateRecord
} from "@/types/resume-studio";
import { syncResumeSectionContent } from "@/lib/resume-studio/editor-v2/content";
import { RESUME_STUDIO_SCHEMA_VERSION, createMarginBox } from "@/lib/resume-studio/normalize";

export const ATS_SAFE_SECTION_SLOTS: ResumeSectionKind[] = [
  "header",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "languages",
  "volunteering",
  "interests",
  "awards",
  "custom"
];

type BuiltInTemplateInput = {
  id: string;
  name: string;
  category: ResumeTemplateCategory;
  description: string;
  paperSize?: "A4";
  margins?: number;
  marginBox?: ResumeMarginBox;
  columns?: string;
  mainColumns?: string;
  sidebarColumns?: string;
  accent: string;
  text: string;
  background?: string;
  headingFont?: string;
  bodyFont?: string;
  atsFriendly?: boolean;
  supportsTwoColumn?: boolean;
  iconStyle?: "none" | "line" | "solid";
  regionOrder?: Array<"header" | "main" | "sidebar" | "footer">;
};

function createBuiltInTemplate(input: BuiltInTemplateInput): ResumeTemplateRecord & { description: string } {
  const regionOrder = input.regionOrder ?? ["header", "main", "sidebar", "footer"];

  return {
    id: input.id,
    ownerId: "system",
    schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
    name: input.name,
    category: input.category,
    description: input.description,
    previewImagePath: "",
    paper: {
      size: input.paperSize ?? "A4",
      defaultMargins: input.margins ?? 22,
      defaultMarginBox: input.marginBox ?? createMarginBox(input.margins ?? 22)
    },
    layout: {
      grid: {
        columns: input.columns ?? "1fr",
        rows: "auto 1fr auto",
        gap: 14
      },
      regions: regionOrder.map((region) => {
        if (region === "header") {
          return {
            region,
            columns: "1fr",
            gap: 8,
            sectionSlots: ["header", "summary"]
          };
        }

        if (region === "sidebar") {
          return {
            region,
            columns: input.sidebarColumns ?? "1fr",
            gap: 8,
            sectionSlots: ["skills", "languages", "interests", "awards", "volunteering", "custom"]
          };
        }

        if (region === "footer") {
          return {
            region,
            columns: "1fr",
            gap: 8,
            sectionSlots: ["custom"]
          };
        }

        return {
          region,
          columns: input.mainColumns ?? "1fr",
          gap: 12,
          sectionSlots: ["experience", "projects", "education", "publications", "research", "custom"]
        };
      }),
      pageBreak: {
        minLinesPerBlock: 3,
        avoidSplitKinds: ["header", "summary", "skills"],
        preferSplitKinds: ["experience", "projects", "education", "research", "publications"]
      }
    },
    styleTokens: {
      fonts: {
        heading: input.headingFont ?? "Arimo",
        body: input.bodyFont ?? "Arimo"
      },
      sizes: {
        title: 31,
        heading: 12,
        body: 10.5,
        small: 9
      },
      colors: {
        text: input.text,
        accent: input.accent,
        muted: "#475569",
        background: input.background ?? "#ffffff"
      },
      spacing: {
        section: 12,
        item: 7,
        line: 1.35
      },
      borderRadius: 8,
      iconStyle: input.iconStyle ?? "none"
    },
    constraints: {
      atsFriendly: input.atsFriendly ?? true,
      supportsTwoColumn: input.supportsTwoColumn ?? false,
      supportsPhoto: false
    },
    source: "built_in"
  };
}

export const BUILT_IN_RESUME_TEMPLATES = [
  createBuiltInTemplate({
    id: "classic-single-column",
    name: "Classic Single Column",
    description: "ATS-first traditional hierarchy with clear section rhythm.",
    category: "single_column",
    columns: "1fr",
    accent: "#0f172a",
    text: "#111827",
    atsFriendly: true
  }),
  createBuiltInTemplate({
    id: "modern-single-column",
    name: "Modern Single Column",
    description: "Contemporary spacing and headings while staying ATS-safe.",
    category: "modern",
    columns: "1fr",
    accent: "#1d4ed8",
    text: "#0f172a",
    atsFriendly: true,
    iconStyle: "line"
  }),
  createBuiltInTemplate({
    id: "two-column-professional",
    name: "Two Column Professional",
    description: "Professional balance of dense skills sidebar and narrative main flow.",
    category: "two_column",
    columns: "2fr 1fr",
    mainColumns: "1fr",
    sidebarColumns: "1fr",
    accent: "#0f766e",
    text: "#111827",
    supportsTwoColumn: true,
    atsFriendly: true,
    iconStyle: "line",
    regionOrder: ["header", "main", "sidebar", "footer"]
  }),
  createBuiltInTemplate({
    id: "two-column-minimal",
    name: "Two Column Minimal",
    description: "Minimalist two-column layout with gentle contrast and compact sections.",
    category: "two_column",
    columns: "1.7fr 1fr",
    accent: "#374151",
    text: "#111827",
    supportsTwoColumn: true,
    atsFriendly: true,
    regionOrder: ["header", "main", "sidebar", "footer"]
  }),
  createBuiltInTemplate({
    id: "executive-leadership",
    name: "Executive",
    description: "Leadership-forward layout with high-impact summary and strategic outcomes.",
    category: "executive",
    columns: "1fr",
    accent: "#7c2d12",
    text: "#1f2937",
    headingFont: "Georgia",
    bodyFont: "Arimo",
    atsFriendly: true
  }),
  createBuiltInTemplate({
    id: "tech-projects-first",
    name: "Tech Projects First",
    description: "Engineering layout emphasizing projects and technical outcomes above education.",
    category: "modern",
    columns: "1fr",
    accent: "#0f766e",
    text: "#0f172a",
    atsFriendly: true,
    iconStyle: "line"
  }),
  createBuiltInTemplate({
    id: "academic-research",
    name: "Academic",
    description: "Academic profile with publications and research-focused section flow.",
    category: "academic",
    columns: "1fr",
    accent: "#4c1d95",
    text: "#1f2937",
    headingFont: "Georgia",
    bodyFont: "Times New Roman",
    atsFriendly: true
  }),
  createBuiltInTemplate({
    id: "creative-accent",
    name: "Creative",
    description: "Controlled creative accent with modern typography and clear readability.",
    category: "modern",
    columns: "1fr",
    accent: "#be123c",
    text: "#0f172a",
    atsFriendly: false,
    iconStyle: "solid"
  }),
  createBuiltInTemplate({
    id: "compact-efficiency",
    name: "Compact",
    description: "Space-efficient one-page-focused template for concise profiles.",
    category: "compact",
    columns: "1fr",
    accent: "#0f766e",
    text: "#111827",
    margins: 18,
    atsFriendly: true
  }),
  createBuiltInTemplate({
    id: "timeline-experience",
    name: "Timeline Experience",
    description: "Timeline-style chronology with dates emphasized for recruiters.",
    category: "modern",
    columns: "1fr",
    accent: "#1e40af",
    text: "#111827",
    atsFriendly: true,
    iconStyle: "line"
  }),
  createBuiltInTemplate({
    id: "modern-sidebar-icons",
    name: "Modern Sidebar with Icons",
    description: "Modern sidebar pattern with icon-assisted labels and strong scannability.",
    category: "sidebar",
    columns: "1.8fr 1fr",
    accent: "#0f766e",
    text: "#0f172a",
    supportsTwoColumn: true,
    atsFriendly: true,
    iconStyle: "line",
    regionOrder: ["header", "sidebar", "main", "footer"]
  }),
  createBuiltInTemplate({
    id: "monochrome-ats",
    name: "Monochrome ATS",
    description: "Strict ATS-safe monochrome rendering with no icons and simple DOM order.",
    category: "single_column",
    columns: "1fr",
    accent: "#111827",
    text: "#111827",
    atsFriendly: true,
    iconStyle: "none"
  })
] as const;

export const RESUME_TEMPLATES = BUILT_IN_RESUME_TEMPLATES.map((template) => ({
  id: template.id,
  name: template.name,
  description: template.description,
  layout:
    template.category === "sidebar"
      ? "sidebar"
      : template.constraints.supportsTwoColumn
        ? "two-column"
        : "single"
}));

export const SECTION_CATALOG: Array<{ kind: ResumeSectionKind; label: string; description: string }> = [
  { kind: "summary", label: "Summary", description: "Professional summary paragraph." },
  { kind: "experience", label: "Experience", description: "Work history with bullet points." },
  { kind: "education", label: "Education", description: "Degrees and certifications." },
  { kind: "skills", label: "Skills", description: "Hard and soft skills list." },
  { kind: "projects", label: "Projects", description: "Project highlights and outcomes." },
  { kind: "languages", label: "Languages", description: "Language proficiency list." },
  { kind: "volunteering", label: "Volunteering", description: "Volunteer work and impact." },
  { kind: "interests", label: "Interests", description: "Personal interests (optional)." },
  { kind: "publications", label: "Publications", description: "Academic and technical publications." },
  { kind: "research", label: "Research", description: "Research summaries and findings." },
  { kind: "awards", label: "Awards", description: "Awards and recognitions." },
  { kind: "custom", label: "Custom", description: "Custom section with title and content." }
];

export function createStableId(prefix = "id") {
  const base =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${base}`;
}

function defaultSectionData(kind: ResumeSectionKind): Record<string, unknown> {
  switch (kind) {
    case "header":
      return {
        fullName: "",
        headline: "",
        email: "",
        phone: "",
        location: "",
        links: [""]
      };
    case "summary":
      return {
        text: ""
      };
    case "experience":
      return {
        items: [
          {
            id: createStableId("exp"),
            company: "",
            role: "",
            location: "",
            startDate: "",
            endDate: "",
            bullets: [""]
          }
        ]
      };
    case "education":
      return {
        items: [
          {
            id: createStableId("edu"),
            school: "",
            degree: "",
            startDate: "",
            endDate: "",
            details: ""
          }
        ]
      };
    case "skills":
      return {
        items: [
          {
            id: createStableId("skill"),
            name: "",
            level: ""
          }
        ]
      };
    case "projects":
      return {
        items: [
          {
            id: createStableId("proj"),
            name: "",
            link: "",
            description: "",
            bullets: [""]
          }
        ]
      };
    case "languages":
      return {
        items: ["English"]
      };
    case "volunteering":
      return {
        items: [
          {
            id: createStableId("vol"),
            organization: "",
            role: "",
            details: ""
          }
        ]
      };
    case "interests":
      return {
        items: ["Open source"]
      };
    case "publications":
      return {
        items: [
          {
            id: createStableId("pub"),
            title: "",
            venue: "",
            year: "",
            details: ""
          }
        ]
      };
    case "research":
      return {
        items: [
          {
            id: createStableId("research"),
            title: "",
            details: ""
          }
        ]
      };
    case "awards":
      return {
        items: [
          {
            id: createStableId("award"),
            title: "",
            issuer: "",
            year: ""
          }
        ]
      };
    case "custom":
      return {
        title: "Custom Section",
        text: ""
      };
    default:
      return {};
  }
}

export function createSection(kind: ResumeSectionKind): ResumeSectionBlock {
  return syncResumeSectionContent({
    id: createStableId("section"),
    kind,
    data: defaultSectionData(kind),
    locked: kind === "header"
  });
}

export function createDefaultSections() {
  return [
    createSection("header"),
    createSection("summary"),
    createSection("experience"),
    createSection("education"),
    createSection("skills"),
    createSection("projects")
  ];
}

export function createDefaultResumeDocument(input: {
  ownerId: string;
  type?: "resume" | "cover_letter";
  title?: string;
  linkedJobId?: string | null;
  templateId?: string;
}): Omit<ResumeDocumentRecord, "id" | "createdAt" | "updatedAt"> {
  const type = input.type ?? "resume";
  const templateId = input.templateId ?? (type === "cover_letter" ? "modern-single-column" : "classic-single-column");

  return {
    ownerId: input.ownerId,
    schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
    editorModelVersion: 2,
    editorEngine: "tiptap",
    contentFormat: "pm-json",
    type,
    title: input.title ?? (type === "resume" ? "Untitled Resume" : "Untitled Cover Letter"),
    linkedJobId: input.linkedJobId ?? null,
    templateId,
    page: {
      size: "A4",
      margins: 22,
      marginBox: createMarginBox(22),
      sectionSpacing: 14,
      header: { enabled: false },
      footer: { enabled: false },
      pageNumbers: { enabled: false, format: "numeric", position: "right" },
      columns: 1
    },
    style: {
      primaryColor: "#0f172a",
      accentColor: "#2563eb",
      fontFamily: "Arimo",
      fontScale: 1,
      lineHeight: 1.4,
      background: "#ffffff",
      inheritTemplateColors: false,
      inheritTemplateFonts: false
    },
    language: {
      mode: "auto",
      defaultDirection: "auto"
    },
    collaboration: {
      lockMode: "multi_editor"
    },
    sections: createDefaultSections(),
    ats: {},
    pinned: false,
    tags: []
  };
}

export function getBuiltInTemplateById(templateId: string) {
  const aliasMap: Record<string, string> = {
    "single-classic": "classic-single-column",
    "modern-sidebar": "modern-sidebar-icons",
    "two-column-pro": "two-column-professional",
    compact: "compact-efficiency",
    elegant: "modern-single-column",
    "high-performer": "executive-leadership"
  };

  const resolvedId = aliasMap[templateId] ?? templateId;
  return BUILT_IN_RESUME_TEMPLATES.find((template) => template.id === resolvedId) ?? BUILT_IN_RESUME_TEMPLATES[0];
}
