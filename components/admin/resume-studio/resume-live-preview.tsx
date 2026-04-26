"use client";

/**
 * Resume Live Preview — renders the resume as it would look on paper.
 * Shows a real-time A4/Letter preview that updates as the user edits.
 * Includes PDF download button.
 */

import { useState } from "react";
import { Download, Loader2, ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import type { ResumeDocumentRecord, ResumeTemplateRecord } from "@/types/resume-studio";
import { BUILT_IN_RESUME_TEMPLATES } from "@/lib/resume-studio/defaults";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHeaderData(doc: ResumeDocumentRecord) {
  const section = doc.sections.find(s => s.kind === "header");
  if (!section) return { fullName: "", headline: "", email: "", phone: "", location: "", links: [] };
  const d = section.data as Record<string, unknown>;
  return {
    fullName: String(d.fullName ?? ""),
    headline: String(d.headline ?? ""),
    email: String(d.email ?? ""),
    phone: String(d.phone ?? ""),
    location: String(d.location ?? ""),
    links: Array.isArray(d.links) ? d.links as Array<{ label: string; url: string }> : [],
  };
}

function getSummary(doc: ResumeDocumentRecord): string {
  const section = doc.sections.find(s => s.kind === "summary");
  if (!section) return "";
  const d = section.data as Record<string, unknown>;
  return String(d.text ?? "");
}

function getExperience(doc: ResumeDocumentRecord) {
  const section = doc.sections.find(s => s.kind === "experience");
  if (!section) return [];
  const d = section.data as Record<string, unknown>;
  return Array.isArray(d.items) ? d.items as Array<{
    company: string; role: string; location?: string;
    startDate?: string; endDate?: string; current?: boolean; bullets: string[];
  }> : [];
}

function getEducation(doc: ResumeDocumentRecord) {
  const section = doc.sections.find(s => s.kind === "education");
  if (!section) return [];
  const d = section.data as Record<string, unknown>;
  return Array.isArray(d.items) ? d.items as Array<{
    school: string; degree: string; field?: string;
    startDate?: string; endDate?: string; gpa?: string; details?: string;
  }> : [];
}

function getSkills(doc: ResumeDocumentRecord) {
  const section = doc.sections.find(s => s.kind === "skills");
  if (!section) return [];
  const d = section.data as Record<string, unknown>;
  return Array.isArray(d.items) ? d.items as Array<{ name: string; level?: string }> : [];
}

function getProjects(doc: ResumeDocumentRecord) {
  const section = doc.sections.find(s => s.kind === "projects");
  if (!section) return [];
  const d = section.data as Record<string, unknown>;
  return Array.isArray(d.items) ? d.items as Array<{
    name: string; link?: string; description?: string;
    bullets: string[]; techStack?: string;
    startDate?: string; endDate?: string;
  }> : [];
}

function getLanguages(doc: ResumeDocumentRecord) {
  const section = doc.sections.find(s => s.kind === "languages");
  if (!section) return [];
  const d = section.data as Record<string, unknown>;
  return Array.isArray(d.items) ? d.items as Array<{ name: string; level?: string }> : [];
}

function getAwards(doc: ResumeDocumentRecord) {
  const section = doc.sections.find(s => s.kind === "awards");
  if (!section) return [];
  const d = section.data as Record<string, unknown>;
  return Array.isArray(d.items) ? d.items as Array<{ title: string; issuer?: string; year?: string; description?: string }> : [];
}

function getVolunteering(doc: ResumeDocumentRecord) {
  const section = doc.sections.find(s => s.kind === "volunteering");
  if (!section) return [];
  const d = section.data as Record<string, unknown>;
  return Array.isArray(d.items) ? d.items as Array<{
    organization: string; role: string; startDate?: string; endDate?: string; details?: string;
  }> : [];
}

function getInterests(doc: ResumeDocumentRecord): string[] {
  const section = doc.sections.find(s => s.kind === "interests");
  if (!section) return [];
  const d = section.data as Record<string, unknown>;
  return Array.isArray(d.items) ? d.items as string[] : [];
}

function resolveTemplate(doc: ResumeDocumentRecord, customTemplates?: ResumeTemplateRecord[]) {
  const builtIn = BUILT_IN_RESUME_TEMPLATES.find(t => t.id === doc.templateId);
  if (builtIn) return builtIn;
  if (customTemplates) {
    const custom = customTemplates.find(t => t.id === doc.templateId);
    if (custom) return custom;
  }
  return BUILT_IN_RESUME_TEMPLATES[0];
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: accent }}>{title}</h3>
      <div className="flex-1 h-px" style={{ backgroundColor: accent, opacity: 0.25 }} />
    </div>
  );
}

// ─── Date range ───────────────────────────────────────────────────────────────

function DateRange({ start, end, current }: { start?: string; end?: string; current?: boolean }) {
  if (!start && !end) return null;
  return (
    <span className="text-slate-400 text-[10px] font-normal whitespace-nowrap">
      {start}{start && (current || end) ? " – " : ""}{current ? "Present" : end}
    </span>
  );
}

// ─── Resume renderer ──────────────────────────────────────────────────────────

function ResumeContent({ doc, accent, font }: { doc: ResumeDocumentRecord; accent: string; font: string }) {
  const header = getHeaderData(doc);
  const summary = getSummary(doc);
  const experience = getExperience(doc);
  const education = getEducation(doc);
  const skills = getSkills(doc);
  const projects = getProjects(doc);
  const languages = getLanguages(doc);
  const awards = getAwards(doc);
  const volunteering = getVolunteering(doc);
  const interests = getInterests(doc);

  // Collect custom sections
  const customSections = doc.sections.filter(s => s.kind === "custom");

  const hasContent = (items: unknown[]) => items.length > 0;

  return (
    <div style={{ fontFamily: font, fontSize: "10.5px", lineHeight: 1.4, color: "#111827" }}>
      {/* Header */}
      <div className="text-center mb-4 pb-3 border-b" style={{ borderColor: `${accent}30` }}>
        {header.fullName && (
          <h1 className="font-bold leading-tight mb-0.5" style={{ fontSize: "22px", color: "#0f172a" }}>
            {header.fullName}
          </h1>
        )}
        {header.headline && (
          <p className="font-medium" style={{ fontSize: "11px", color: accent }}>{header.headline}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-1.5" style={{ fontSize: "9.5px", color: "#64748b" }}>
          {header.email && <span>{header.email}</span>}
          {header.phone && <span>{header.phone}</span>}
          {header.location && <span>{header.location}</span>}
          {header.links.map((link, i) => (
            <span key={i}>{link.label || link.url}</span>
          ))}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-3.5">
          <SectionHeading title="Summary" accent={accent} />
          <p className="text-slate-600 leading-relaxed" style={{ fontSize: "10px" }}>{summary}</p>
        </div>
      )}

      {/* Experience */}
      {hasContent(experience) && (
        <div className="mb-3.5">
          <SectionHeading title="Experience" accent={accent} />
          <div className="flex flex-col gap-2.5">
            {experience.map((item, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-800" style={{ fontSize: "10.5px" }}>{item.role}</span>
                    {item.company && <span className="text-slate-500" style={{ fontSize: "10px" }}> · {item.company}</span>}
                    {item.location && <span className="text-slate-400" style={{ fontSize: "9.5px" }}> · {item.location}</span>}
                  </div>
                  <DateRange start={item.startDate} end={item.endDate} current={item.current} />
                </div>
                {item.bullets?.length > 0 && (
                  <ul className="mt-1 ml-3 flex flex-col gap-0.5 list-disc list-outside marker:text-slate-400">
                    {item.bullets.filter(Boolean).map((b, j) => (
                      <li key={j} className="text-slate-600" style={{ fontSize: "10px" }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {hasContent(projects) && (
        <div className="mb-3.5">
          <SectionHeading title="Projects" accent={accent} />
          <div className="flex flex-col gap-2.5">
            {projects.map((item, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-800" style={{ fontSize: "10.5px" }}>{item.name}</span>
                    {item.techStack && <span className="text-slate-400" style={{ fontSize: "9px" }}> · {item.techStack}</span>}
                  </div>
                  <DateRange start={item.startDate} end={item.endDate} />
                </div>
                {item.description && (
                  <p className="text-slate-600 mt-0.5" style={{ fontSize: "10px" }}>{item.description}</p>
                )}
                {item.bullets?.length > 0 && (
                  <ul className="mt-1 ml-3 flex flex-col gap-0.5 list-disc list-outside marker:text-slate-400">
                    {item.bullets.filter(Boolean).map((b, j) => (
                      <li key={j} className="text-slate-600" style={{ fontSize: "10px" }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {hasContent(education) && (
        <div className="mb-3.5">
          <SectionHeading title="Education" accent={accent} />
          <div className="flex flex-col gap-2">
            {education.map((item, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-800" style={{ fontSize: "10.5px" }}>{item.school}</span>
                  </div>
                  <DateRange start={item.startDate} end={item.endDate} />
                </div>
                <div className="text-slate-600" style={{ fontSize: "10px" }}>
                  {item.degree}{item.field ? ` · ${item.field}` : ""}
                  {item.gpa ? ` · GPA: ${item.gpa}` : ""}
                </div>
                {item.details && <p className="text-slate-500 mt-0.5" style={{ fontSize: "9.5px" }}>{item.details}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {hasContent(skills) && (
        <div className="mb-3.5">
          <SectionHeading title="Skills" accent={accent} />
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded text-slate-700 border"
                style={{ fontSize: "9.5px", borderColor: `${accent}30`, backgroundColor: `${accent}08` }}
              >
                {skill.name}{skill.level ? ` (${skill.level})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {hasContent(languages) && (
        <div className="mb-3.5">
          <SectionHeading title="Languages" accent={accent} />
          <div className="flex flex-wrap gap-3">
            {languages.map((lang, i) => (
              <span key={i} className="text-slate-600" style={{ fontSize: "10px" }}>
                <span className="font-medium text-slate-700">{lang.name}</span>
                {lang.level && <span className="text-slate-400"> · {lang.level}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Awards */}
      {hasContent(awards) && (
        <div className="mb-3.5">
          <SectionHeading title="Awards" accent={accent} />
          <div className="flex flex-col gap-1.5">
            {awards.map((item, i) => (
              <div key={i} className="flex items-start justify-between">
                <div>
                  <span className="font-medium text-slate-700" style={{ fontSize: "10px" }}>{item.title}</span>
                  {item.issuer && <span className="text-slate-400" style={{ fontSize: "9.5px" }}> · {item.issuer}</span>}
                  {item.description && <p className="text-slate-500 mt-0.5" style={{ fontSize: "9.5px" }}>{item.description}</p>}
                </div>
                {item.year && <span className="text-slate-400 text-[10px] whitespace-nowrap">{item.year}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Volunteering */}
      {hasContent(volunteering) && (
        <div className="mb-3.5">
          <SectionHeading title="Volunteering" accent={accent} />
          <div className="flex flex-col gap-2">
            {volunteering.map((item, i) => (
              <div key={i}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-slate-800" style={{ fontSize: "10.5px" }}>{item.role}</span>
                    <span className="text-slate-500" style={{ fontSize: "10px" }}> · {item.organization}</span>
                  </div>
                  <DateRange start={item.startDate} end={item.endDate} />
                </div>
                {item.details && <p className="text-slate-600 mt-0.5" style={{ fontSize: "9.5px" }}>{item.details}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interests */}
      {hasContent(interests) && (
        <div className="mb-3.5">
          <SectionHeading title="Interests" accent={accent} />
          <p className="text-slate-600" style={{ fontSize: "10px" }}>
            {interests.join(" · ")}
          </p>
        </div>
      )}

      {/* Custom sections */}
      {customSections.map((section, i) => {
        const d = section.data as Record<string, string>;
        if (!d.text && !d.title) return null;
        return (
          <div key={i} className="mb-3.5">
            <SectionHeading title={d.title || "Additional"} accent={accent} />
            <p className="text-slate-600 whitespace-pre-wrap leading-relaxed" style={{ fontSize: "10px" }}>{d.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ResumeLivePreviewProps = {
  doc: ResumeDocumentRecord;
  customTemplates?: ResumeTemplateRecord[];
  docId: string;
};

export function ResumeLivePreview({ doc, customTemplates, docId }: ResumeLivePreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(0.62);

  const template = resolveTemplate(doc, customTemplates);
  const accent = doc.style.primaryColor || template.styleTokens.colors.accent;
  const font = doc.style.fontFamily || template.styleTokens.fonts.body;

  // A4 dimensions in pixels at 96dpi
  const A4_W = 794;
  const A4_H = 1123;

  const marginBox = doc.page.marginBox;
  const paddingPx = {
    top: ((marginBox?.top ?? 22) / 25.4) * 96,
    right: ((marginBox?.right ?? 22) / 25.4) * 96,
    bottom: ((marginBox?.bottom ?? 22) / 25.4) * 96,
    left: ((marginBox?.left ?? 22) / 25.4) * 96,
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/resume-studio/export/pdf?docId=${docId}&delivery=download`);
      if (!res.ok) throw new Error("PDF export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title || "resume"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const openPrintView = () => {
    window.open(`/admin/resume-studio/${docId}/print`, "_blank");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Preview</span>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1">
            <button
              onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
              className="p-1 text-slate-400 hover:text-slate-600 transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-slate-500 w-9 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
              className="p-1 text-slate-400 hover:text-slate-600 transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openPrintView}
            className="flex items-center gap-1.5 px-3 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </button>
          <button
            onClick={downloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 h-7 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-60"
          >
            {downloading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />
            }
            {downloading ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="flex-1 overflow-auto bg-slate-200 flex items-start justify-center p-6">
        <div
          style={{
            width: A4_W * zoom,
            minHeight: A4_H * zoom,
            transform: `scale(1)`,
            transformOrigin: "top center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: A4_W,
              minHeight: A4_H,
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
              paddingTop: paddingPx.top,
              paddingRight: paddingPx.right,
              paddingBottom: paddingPx.bottom,
              paddingLeft: paddingPx.left,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <ResumeContent doc={doc} accent={accent} font={font} />
          </div>
        </div>
      </div>
    </div>
  );
}
