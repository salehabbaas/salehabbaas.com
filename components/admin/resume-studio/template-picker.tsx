"use client";

/**
 * Template Picker — visual gallery of all built-in and custom resume templates.
 * Shows ATS badges, layout info, and lets you apply a template with one click.
 */

import { useState } from "react";
import { Check, CheckCircle2, Layout, Layers, LayoutTemplate, Minimize2, ShieldCheck, X } from "lucide-react";
import { BUILT_IN_RESUME_TEMPLATES } from "@/lib/resume-studio/defaults";
import type { ResumeDocumentRecord, ResumeTemplateRecord } from "@/types/resume-studio";
import { cn } from "@/lib/utils";

// ─── Visual template thumbnail ────────────────────────────────────────────────

function TemplateThumbnail({ template, isActive }: {
  template: typeof BUILT_IN_RESUME_TEMPLATES[number] | ResumeTemplateRecord;
  isActive: boolean;
}) {
  const accent = template.styleTokens.colors.accent;
  const text = template.styleTokens.colors.text;
  const isTwoCol = template.constraints.supportsTwoColumn;

  return (
    <div
      className="w-full aspect-[0.707] bg-white rounded border overflow-hidden relative"
      style={{ boxShadow: isActive ? `0 0 0 2px ${accent}` : "0 1px 3px rgba(0,0,0,0.1)" }}
    >
      {/* Header area */}
      <div className="px-2 pt-2 pb-1.5" style={{ borderBottom: `1.5px solid ${accent}20` }}>
        <div className="h-1.5 rounded-full w-3/4 mb-1" style={{ backgroundColor: text, opacity: 0.8 }} />
        <div className="h-1 rounded-full w-1/2" style={{ backgroundColor: accent, opacity: 0.7 }} />
        <div className="flex gap-2 mt-1">
          <div className="h-0.5 rounded w-1/4 bg-slate-300" />
          <div className="h-0.5 rounded w-1/4 bg-slate-300" />
          <div className="h-0.5 rounded w-1/4 bg-slate-300" />
        </div>
      </div>

      {/* Body */}
      {isTwoCol ? (
        <div className="flex gap-1 px-1.5 pt-1.5 flex-1">
          {/* Main column */}
          <div className="flex-[1.8] flex flex-col gap-1.5">
            {[3, 4, 3, 4].map((rows, si) => (
              <div key={si}>
                <div className="h-0.5 rounded-full mb-1 w-10" style={{ backgroundColor: accent, opacity: 0.6 }} />
                {Array.from({ length: rows }).map((_, ri) => (
                  <div key={ri} className="h-0.5 rounded-full mb-0.5 bg-slate-200" style={{ width: `${70 + Math.random() * 25}%` }} />
                ))}
              </div>
            ))}
          </div>
          {/* Sidebar */}
          <div className="flex-1 bg-slate-50 rounded px-1 py-1 flex flex-col gap-1.5">
            {[2, 3, 2].map((rows, si) => (
              <div key={si}>
                <div className="h-0.5 rounded-full mb-0.5 w-8" style={{ backgroundColor: accent, opacity: 0.5 }} />
                {Array.from({ length: rows }).map((_, ri) => (
                  <div key={ri} className="h-0.5 rounded-full mb-0.5 bg-slate-300" style={{ width: `${60 + Math.random() * 30}%` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-2 pt-1.5 flex flex-col gap-1.5">
          {[3, 4, 3, 2, 3].map((rows, si) => (
            <div key={si}>
              <div className="h-0.5 rounded-full mb-1 w-10" style={{ backgroundColor: accent, opacity: 0.6 }} />
              {Array.from({ length: rows }).map((_, ri) => (
                <div key={ri} className="h-0.5 rounded-full mb-0.5 bg-slate-200" style={{ width: `${65 + Math.random() * 30}%` }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
}

// ─── Layout badge ─────────────────────────────────────────────────────────────

function LayoutBadge({ template }: { template: typeof BUILT_IN_RESUME_TEMPLATES[number] | ResumeTemplateRecord }) {
  if (template.category === "sidebar") return (
    <span className="flex items-center gap-0.5 text-[9px] text-slate-400">
      <Layers className="w-2.5 h-2.5" /> Sidebar
    </span>
  );
  if (template.constraints.supportsTwoColumn) return (
    <span className="flex items-center gap-0.5 text-[9px] text-slate-400">
      <Layout className="w-2.5 h-2.5" /> 2-Col
    </span>
  );
  if (template.category === "compact") return (
    <span className="flex items-center gap-0.5 text-[9px] text-slate-400">
      <Minimize2 className="w-2.5 h-2.5" /> Compact
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-[9px] text-slate-400">
      <LayoutTemplate className="w-2.5 h-2.5" /> Single
    </span>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterId = "all" | "ats" | "single" | "two_column" | "modern" | "executive";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ats", label: "ATS Safe" },
  { id: "single", label: "Single Column" },
  { id: "two_column", label: "Two Column" },
  { id: "modern", label: "Modern" },
  { id: "executive", label: "Executive" },
];

function filterTemplates(templates: (typeof BUILT_IN_RESUME_TEMPLATES[number] | ResumeTemplateRecord)[], filter: FilterId) {
  switch (filter) {
    case "ats":         return templates.filter(t => t.constraints.atsFriendly);
    case "single":      return templates.filter(t => !t.constraints.supportsTwoColumn && t.category !== "sidebar");
    case "two_column":  return templates.filter(t => t.constraints.supportsTwoColumn || t.category === "sidebar");
    case "modern":      return templates.filter(t => t.category === "modern");
    case "executive":   return templates.filter(t => t.category === "executive");
    default:            return templates;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

type TemplatePickerProps = {
  doc: ResumeDocumentRecord;
  customTemplates?: ResumeTemplateRecord[];
  onApply: (templateId: string) => void;
  applying?: boolean;
};

export function TemplatePicker({ doc, customTemplates = [], onApply, applying }: TemplatePickerProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const allTemplates = [
    ...BUILT_IN_RESUME_TEMPLATES,
    ...customTemplates,
  ];

  const filtered = filterTemplates(allTemplates, filter);

  const handleApply = (templateId: string) => {
    if (templateId === doc.templateId) return;
    setPendingId(templateId);
    onApply(templateId);
    setTimeout(() => setPendingId(null), 1500);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-1">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition",
              filter === f.id
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map(template => {
          const isActive = template.id === doc.templateId;
          const isPending = pendingId === template.id;

          return (
            <button
              key={template.id}
              onClick={() => handleApply(template.id)}
              onMouseEnter={() => setHoverId(template.id)}
              onMouseLeave={() => setHoverId(null)}
              className={cn(
                "flex flex-col gap-2 p-2 rounded-xl border transition text-left",
                isActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <TemplateThumbnail template={template} isActive={isActive} />

              <div className="px-0.5">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-semibold text-slate-700 leading-tight">{template.name}</p>
                  {isPending && <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <LayoutBadge template={template} />
                  {template.constraints.atsFriendly && (
                    <span className="flex items-center gap-0.5 text-[9px] text-green-600">
                      <ShieldCheck className="w-2.5 h-2.5" /> ATS
                    </span>
                  )}
                </div>

                {hoverId === template.id && (template as { description?: string }).description && (
                  <p className="mt-1 text-[9.5px] text-slate-400 leading-relaxed line-clamp-2">
                    {(template as { description?: string }).description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          No templates match this filter.
        </div>
      )}
    </div>
  );
}
