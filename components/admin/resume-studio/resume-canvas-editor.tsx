"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import { GripVertical, List, Plus, Sparkles, Trash2 } from "lucide-react";

import { ResumeRichTextEditor } from "@/components/admin/resume-studio/editor-v2/resume-rich-text-editor";
import {
  mapSectionsToRegions,
  resolveDocumentMarginBox,
  resolveDocumentStyles,
  resolveTemplateForDocument,
  toA4Pixels,
  useTwoColumnLayout
} from "@/lib/resume-studio/layout";
import { syncResumeSectionContent } from "@/lib/resume-studio/editor-v2/content";
import { marginBoxToCssPadding } from "@/lib/resume-studio/normalize";
import { stripHtmlMarkup } from "@/lib/resume-studio/text";
import { cn } from "@/lib/utils";
import { Toolbar, type ToolbarAction, type ToolbarAlignment } from "@/components/ui/toolbar";
import type { ResumeDocumentRecord, ResumeSectionBlock, ResumeTemplateRecord } from "@/types/resume-studio";

type ItemRecord = Record<string, unknown>;
const HIGHLIGHT_COLOR = "#fef08a";
const RICH_ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SPAN", "BR", "DIV", "P"]);
const RICH_ALLOWED_STYLES = new Set([
  "background-color",
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "text-align",
  "text-decoration"
]);

function legacyFontSizeToCss(value: string) {
  const sizeMap: Record<string, string> = {
    "1": "10px",
    "2": "12px",
    "3": "14px",
    "4": "16px",
    "5": "18px",
    "6": "24px",
    "7": "32px"
  };
  return sizeMap[value.trim()] ?? "";
}

function sanitizeStyleValue(property: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (property === "font-family") {
    const normalized = trimmed.replace(/['"]/g, "").trim();
    return normalized.slice(0, 60);
  }
  if (property === "font-size") {
    if (/^\d{1,2}px$/.test(trimmed) || /^\d{1,2}pt$/.test(trimmed)) return trimmed;
    return "";
  }
  if (property === "color") {
    if (/^#[0-9a-f]{3,8}$/i.test(trimmed) || /^rgb(a?)\([^)]+\)$/i.test(trimmed) || /^hsl(a?)\([^)]+\)$/i.test(trimmed)) return trimmed;
    return "";
  }
  if (property === "background-color") {
    if (/^#[0-9a-f]{3,8}$/i.test(trimmed) || /^rgb(a?)\([^)]+\)$/i.test(trimmed) || /^hsl(a?)\([^)]+\)$/i.test(trimmed)) return trimmed;
    return "";
  }
  if (property === "font-weight") {
    if (/^(normal|bold|[1-9]00)$/i.test(trimmed)) return trimmed;
    return "";
  }
  if (property === "font-style") {
    if (/^(normal|italic|oblique)$/i.test(trimmed)) return trimmed;
    return "";
  }
  if (property === "text-decoration") {
    if (/^(none|underline|line-through)$/i.test(trimmed)) return trimmed;
    return "";
  }
  if (property === "text-align") {
    if (/^(left|center|right|justify)$/i.test(trimmed)) return trimmed;
    return "";
  }
  return "";
}

function sanitizeRichHtml(input: string) {
  if (typeof window === "undefined") return input;
  const template = document.createElement("template");
  template.innerHTML = input;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  const nodes: Element[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Element);
  }

  for (const node of nodes) {
    if (node.tagName === "FONT") {
      const parent = node.parentNode;
      if (!parent) continue;

      const span = document.createElement("span");
      const styleEntries: string[] = [];
      const color = sanitizeStyleValue("color", node.getAttribute("color") ?? "");
      const fontFamily = sanitizeStyleValue("font-family", node.getAttribute("face") ?? "");
      const fontSize = sanitizeStyleValue("font-size", legacyFontSizeToCss(node.getAttribute("size") ?? ""));

      if (color) styleEntries.push(`color:${color}`);
      if (fontFamily) styleEntries.push(`font-family:${fontFamily}`);
      if (fontSize) styleEntries.push(`font-size:${fontSize}`);
      if (styleEntries.length) span.setAttribute("style", styleEntries.join(";"));

      while (node.firstChild) {
        span.appendChild(node.firstChild);
      }

      parent.replaceChild(span, node);
      continue;
    }

    if (!RICH_ALLOWED_TAGS.has(node.tagName)) {
      const parent = node.parentNode;
      if (!parent) continue;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
      continue;
    }

    const alignValue = sanitizeStyleValue("text-align", node.getAttribute("align") ?? "");
    for (const attr of [...node.attributes]) {
      if (attr.name !== "style") {
        node.removeAttribute(attr.name);
      }
    }

    if (node.hasAttribute("style")) {
      const entries = node
        .getAttribute("style")
        ?.split(";")
        .map((part) => part.trim())
        .filter(Boolean);

      const safeStyles: string[] = [];
      for (const entry of entries ?? []) {
        const [rawProp, ...rawValue] = entry.split(":");
        const prop = rawProp?.trim().toLowerCase();
        if (!prop || !RICH_ALLOWED_STYLES.has(prop)) continue;
        const value = sanitizeStyleValue(prop, rawValue.join(":"));
        if (!value) continue;
        safeStyles.push(`${prop}:${value}`);
      }

      if (alignValue) {
        safeStyles.push(`text-align:${alignValue}`);
      }

      if (safeStyles.length) {
        node.setAttribute("style", safeStyles.join(";"));
      } else {
        node.removeAttribute("style");
      }
    } else if (alignValue) {
      node.setAttribute("style", `text-align:${alignValue}`);
    }
  }

  return template.innerHTML.trim();
}

function toHexColor(color: string) {
  const normalized = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized;
  const rgbMatch = normalized.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (!rgbMatch) return "#111827";
  const [r, g, b] = rgbMatch.slice(1).map((value) => Math.max(0, Math.min(255, Number(value))));
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function sectionTitle(section: ResumeSectionBlock) {
  const title = typeof (section.data as Record<string, unknown>).title === "string" ? String((section.data as Record<string, unknown>).title) : "";
  if (title.trim()) return title.trim();
  return section.kind.charAt(0).toUpperCase() + section.kind.slice(1);
}

function EditableText({
  value,
  onCommit,
  className,
  placeholder,
  multiline = false,
  rich = false
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  rich?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const hasValue = stripHtmlMarkup(value).length > 0;

  function commitElementValue(element: HTMLDivElement) {
    const plain = (multiline ? element.innerText : element.textContent || "").trim();
    if (!rich) {
      if (!hasValue && placeholder && plain === placeholder.trim()) {
        onCommit("");
        return;
      }
      onCommit(plain);
      return;
    }

    if (!hasValue && placeholder && plain === placeholder.trim()) {
      onCommit("");
      return;
    }

    const html = sanitizeRichHtml(element.innerHTML);
    const hasContent = stripHtmlMarkup(html).length > 0;
    onCommit(hasContent ? html : "");
  }

  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    ref.current.innerHTML = hasValue ? value : placeholder || "";
  }, [hasValue, placeholder, value]);

  return (
    <div
      ref={ref}
      data-resume-editable="1"
      data-resume-rich={rich ? "1" : "0"}
      contentEditable
      suppressContentEditableWarning
      className={cn(
        "rounded px-1 outline-none transition focus:bg-primary/10 focus:ring-1 focus:ring-primary/30",
        className,
        !hasValue ? "text-muted-foreground" : ""
      )}
      onBlur={(event) => commitElementValue(event.currentTarget)}
      onInput={(event) => {
        if (!rich) return;
        commitElementValue(event.currentTarget as HTMLDivElement);
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          (event.currentTarget as HTMLElement).blur();
        }
      }}
      onPaste={(event) => {
        if (!rich) return;
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
    >
      {value || placeholder || ""}
    </div>
  );
}

function SortableItemRow({
  itemId,
  record,
  index,
  onRemove,
  onPatch
}: {
  itemId: string;
  record: ItemRecord;
  index: number;
  onRemove: () => void;
  onPatch: (patch: ItemRecord) => void;
}) {
  const { setNodeRef, transform, transition, attributes, listeners } = useSortable({ id: itemId });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: DndCSS.Transform.toString(transform), transition }}
      className="rounded border border-border/70 p-2"
    >
      <div className="mb-1 flex items-center justify-between">
        <button type="button" className="inline-flex h-5 w-5 items-center justify-center rounded border border-border/70" {...attributes} {...listeners}>
          <GripVertical className="h-3 w-3" />
        </button>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded border border-border/70 text-destructive"
          onMouseDown={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <EditableText
        className="text-sm font-medium"
        value={String(record.role ?? record.name ?? record.title ?? record.degree ?? "")}
        placeholder="Title / Role"
        rich
        onCommit={(value) => onPatch({ role: value, name: value, title: value, degree: value })}
      />
      <EditableText
        className="text-xs text-muted-foreground"
        value={String(record.company ?? record.school ?? record.organization ?? record.venue ?? record.issuer ?? "")}
        placeholder="Company / School / Organization"
        rich
        onCommit={(value) => onPatch({ company: value, school: value, organization: value, venue: value, issuer: value })}
      />
      <EditableText
        className="text-xs text-muted-foreground"
        value={[record.startDate, record.endDate, record.location, record.year].filter((v) => typeof v === "string" && v).join(" | ")}
        placeholder="Start | End | Location"
        onCommit={(value) => {
          const parts = value.split("|").map((part) => part.trim());
          onPatch({ startDate: parts[0] ?? "", endDate: parts[1] ?? "", location: parts[2] ?? "", year: parts[3] ?? "" });
        }}
      />

      <EditableText
        multiline
        className="mt-1 whitespace-pre-wrap text-xs"
        value={Array.isArray(record.bullets) ? record.bullets.join("\n") : String(record.description ?? record.details ?? "")}
        placeholder="Bullets or details (one line each)"
        onCommit={(value) => {
          const lines = value
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

          if (Array.isArray(record.bullets)) {
            onPatch({ bullets: lines });
          } else {
            onPatch({ description: value, details: value });
          }
        }}
      />
      <p className="sr-only">{index}</p>
    </article>
  );
}

function hasRenderableText(value: unknown) {
  return typeof value === "string" && stripHtmlMarkup(value).length > 0;
}

function joinRenderableParts(parts: unknown[], separator: string) {
  const seen = new Set<string>();
  return parts
    .filter(hasRenderableText)
    .map((part) => String(part).trim())
    .filter((part) => {
      const key = stripHtmlMarkup(part).replace(/\s+/g, " ").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(` <span class="opacity-60">${separator}</span> `);
}

function StaticRichBlock({
  html,
  className
}: {
  html: string;
  className?: string;
}) {
  if (!hasRenderableText(html)) return null;
  return <div className={cn("resume-static-rich whitespace-pre-wrap break-words", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function StaticLine({
  html,
  className
}: {
  html: string;
  className?: string;
}) {
  if (!hasRenderableText(html)) return null;
  return <p className={cn("break-words whitespace-pre-wrap", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function StaticItemRow({ record }: { record: ItemRecord }) {
  const heading = joinRenderableParts(
    [record.role, record.name, record.title, record.degree, record.company, record.school, record.organization, record.venue],
    " - "
  );
  const meta = [record.startDate, record.endDate, record.location, record.year]
    .filter((value) => typeof value === "string" && stripHtmlMarkup(String(value)).length > 0)
    .join(" | ");
  const description = typeof record.description === "string" ? record.description : "";
  const details = typeof record.details === "string" ? record.details : "";
  const bullets = Array.isArray(record.bullets)
    ? record.bullets.filter((bullet) => typeof bullet === "string" && stripHtmlMarkup(String(bullet)).length > 0)
    : [];

  if (!heading && !meta && !hasRenderableText(description) && !hasRenderableText(details) && !bullets.length) {
    return null;
  }

  return (
    <article className="grid gap-1.5">
      {heading ? <StaticLine html={heading} className="text-sm font-semibold" /> : null}
      {meta ? <p className="text-[11px] text-muted-foreground">{meta}</p> : null}
      <StaticLine html={description} className="text-xs" />
      <StaticLine html={details} className="text-xs" />
      {bullets.map((bullet, bulletIndex) => (
        <p key={`${String(record.id ?? bulletIndex)}-${bulletIndex}`} className="text-xs leading-relaxed">
          {"• "}
          {String(bullet)}
        </p>
      ))}
    </article>
  );
}

function SectionCard({
  section,
  active,
  accent,
  onSelect,
  onUpdate,
  onRemove,
  onAddItem,
  onRemoveItem,
  onReorderItems,
  onRequestAi,
  onBulletize,
  onNormalizeText
}: {
  section: ResumeSectionBlock;
  active: boolean;
  accent: string;
  onSelect: () => void;
  onUpdate: (next: ResumeSectionBlock) => void;
  onRemove: () => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onReorderItems: (fromIndex: number, toIndex: number) => void;
  onRequestAi: () => void;
  onBulletize: () => void;
  onNormalizeText: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const itemSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const data = section.data as Record<string, unknown>;
  const items = Array.isArray(data.items) ? (data.items as ItemRecord[]) : [];

  function patchData(nextData: Record<string, unknown>) {
    onUpdate(syncResumeSectionContent({
      ...section,
      data: nextData
    }));
  }

  function patchItem(index: number, patch: ItemRecord) {
    const nextItems = [...items];
    nextItems[index] = { ...nextItems[index], ...patch };
    patchData({ ...data, items: nextItems });
  }

  function onItemDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (!overId || activeId === overId) return;

    const fromIndex = items.findIndex((item, index) => String(item.id ?? index) === activeId);
    const toIndex = items.findIndex((item, index) => String(item.id ?? index) === overId);
    if (fromIndex === -1 || toIndex === -1) return;
    onReorderItems(fromIndex, toIndex);
  }

  let content: ReactNode = null;

  if (section.kind === "header") {
    content = active ? (
      <div className="space-y-1">
        <EditableText
          className="text-2xl font-semibold tracking-tight"
          value={String(data.fullName ?? "")}
          placeholder="Your Name"
          rich
          onCommit={(value) => patchData({ ...data, fullName: value })}
        />
        <EditableText
          className="text-sm text-muted-foreground"
          value={String(data.headline ?? "")}
          placeholder="Professional Headline"
          rich
          onCommit={(value) => patchData({ ...data, headline: value })}
        />
        <EditableText
          className="text-xs text-muted-foreground"
          value={[data.email, data.phone, data.location].filter((v) => typeof v === "string" && v).join(" | ")}
          placeholder="email@domain.com | +1 555 | City"
          onCommit={(value) => {
            const parts = value.split("|").map((part) => part.trim());
            patchData({
              ...data,
              email: parts[0] ?? "",
              phone: parts[1] ?? "",
              location: parts[2] ?? ""
            });
          }}
        />
      </div>
    ) : (
      <div className="space-y-1">
        <StaticLine html={String(data.fullName ?? "")} className="text-2xl font-semibold tracking-tight" />
        <StaticLine html={String(data.headline ?? "")} className="text-sm text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          {[data.email, data.phone, data.location]
            .filter((value) => typeof value === "string" && stripHtmlMarkup(String(value)).length > 0)
            .join(" | ")}
        </p>
      </div>
    );
  }

  if (section.kind === "summary") {
    content = active ? (
      <ResumeRichTextEditor
        className="text-sm"
        value={section.contentDoc}
        fallbackHtml={String(data.text ?? section.contentHtmlLegacy ?? "")}
        placeholder="Write a concise professional summary..."
        minHeight={112}
        onChange={({ doc: nextDoc, html }) =>
          onUpdate({
            ...section,
            data: { ...data, text: html },
            contentDoc: nextDoc,
            contentHtmlLegacy: html || undefined
          })
        }
      />
    ) : (
      <StaticRichBlock html={String(data.text ?? section.contentHtmlLegacy ?? "")} className="text-sm" />
    );
  }

  if (
    section.kind === "experience" ||
    section.kind === "education" ||
    section.kind === "projects" ||
    section.kind === "skills" ||
    section.kind === "volunteering" ||
    section.kind === "publications" ||
    section.kind === "research" ||
    section.kind === "awards"
  ) {
    content = active ? (
      <DndContext sensors={itemSensors} collisionDetection={closestCenter} onDragEnd={onItemDragEnd}>
        <SortableContext
          items={items.map((item, index) => String(item.id ?? `${section.id}-${index}`))}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item, index) => {
              const itemId = String(item.id ?? `${section.id}-${index}`);
              const record = item as ItemRecord;
              return (
                <SortableItemRow
                  key={itemId}
                  itemId={itemId}
                  record={record}
                  index={index}
                  onRemove={() => onRemoveItem(index)}
                  onPatch={(patch) => patchItem(index, patch)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    ) : (
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <StaticItemRow key={String((item as ItemRecord).id ?? `${section.id}-${index}`)} record={item as ItemRecord} />
        ))}
      </div>
    );
  }

  if (section.kind === "languages" || section.kind === "interests") {
    content = active ? (
      <EditableText
        multiline
        className="text-sm"
        value={Array.isArray(data.items) ? data.items.join("\n") : ""}
        placeholder="One entry per line"
        onCommit={(value) => patchData({
          ...data,
          items: value
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
        })}
      />
    ) : (
      <p className="text-sm leading-relaxed">
        {Array.isArray(data.items) ? data.items.filter((item) => typeof item === "string" && stripHtmlMarkup(item).length > 0).join(", ") : ""}
      </p>
    );
  }

  if (section.kind === "custom") {
    content = active ? (
      <>
        <ResumeRichTextEditor
          className="text-sm"
          value={section.contentDoc}
          fallbackHtml={String(data.text ?? section.contentHtmlLegacy ?? "")}
          placeholder="Custom section content"
          minHeight={112}
          onChange={({ doc: nextDoc, html }) =>
            onUpdate({
              ...section,
              data: { ...data, text: html },
              contentDoc: nextDoc,
              contentHtmlLegacy: html || undefined
            })
          }
        />
      </>
    ) : (
      <>
        <StaticRichBlock html={String(data.text ?? section.contentHtmlLegacy ?? "")} className="text-sm" />
      </>
    );
  }

  return (
    <section
      ref={setNodeRef}
      style={{ transform: DndCSS.Transform.toString(transform), transition }}
      className={cn(
        "group rounded-xl transition",
        active ? "border border-primary/45 bg-white/95 p-2 shadow-sm" : "border border-transparent bg-transparent p-1.5"
      )}
      onMouseDown={onSelect}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        {section.kind !== "header" ? (
          active ? (
            <EditableText
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              value={String(data.title ?? sectionTitle(section))}
              placeholder={section.kind.charAt(0).toUpperCase() + section.kind.slice(1)}
              onCommit={(value) => patchData({ ...data, title: value.trim() })}
            />
          ) : (
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
              {sectionTitle(section)}
            </h3>
          )
        ) : <div />}
        <div className={cn("items-center gap-1", active ? "flex" : "hidden")}>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/70"
            onMouseDown={(event) => {
              event.stopPropagation();
              onRequestAi();
            }}
            title="AI improve"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/70"
            onMouseDown={(event) => {
              event.stopPropagation();
              onBulletize();
            }}
            title="Bulletize"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/70 text-xs font-medium"
            onMouseDown={(event) => {
              event.stopPropagation();
              onNormalizeText();
            }}
            title="Clean text"
          >
            Aa
          </button>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/70"
            {...attributes}
            {...listeners}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          {!section.locked ? (
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/70 text-destructive"
              onMouseDown={(event) => {
                event.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {content}

      {active && Array.isArray(data.items) && section.kind !== "languages" && section.kind !== "interests" ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 rounded border border-border/70 px-2 py-1 text-xs"
          onMouseDown={(event) => {
            event.stopPropagation();
            onAddItem();
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
      ) : null}
    </section>
  );
}

export function ResumeCanvasEditor({
  doc,
  template,
  activeSectionId,
  onActiveSectionIdChange,
  onChange,
  zoom,
  onRequestAi
}: {
  doc: ResumeDocumentRecord;
  template?: ResumeTemplateRecord;
  activeSectionId: string;
  onActiveSectionIdChange: (sectionId: string) => void;
  onChange: (next: ResumeDocumentRecord) => void;
  zoom: number;
  onRequestAi?: (sectionId: string) => void;
}) {
  const effectiveTemplate = resolveTemplateForDocument(doc, template);
  const canvasRootRef = useRef<HTMLDivElement | null>(null);
  const pageFrameRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRangeRef = useRef<Range | null>(null);
  const pageContentRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = toA4Pixels(doc.page.size);
  const [supportsNativeZoom, setSupportsNativeZoom] = useState(true);
  const [, setViewportSize] = useState({ width: 0, height: 0 });
  const [contentHeight, setContentHeight] = useState(0);
  const [selectionToolbar, setSelectionToolbar] = useState<{
    open: boolean;
    x: number;
    y: number;
    color: string;
    activeButtons: ToolbarAction[];
    textAlign: ToolbarAlignment;
  }>({
    open: false,
    x: 0,
    y: 0,
    color: "#111827",
    activeButtons: [],
    textAlign: "left"
  });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const twoColumn = useTwoColumnLayout(effectiveTemplate);
  const marginBox = resolveDocumentMarginBox(doc, effectiveTemplate);
  const styles = resolveDocumentStyles(doc, effectiveTemplate);

  const regionMap = useMemo(() => {
    return mapSectionsToRegions(doc, effectiveTemplate);
  }, [doc, effectiveTemplate]);
  const regionOrder = effectiveTemplate.layout.regions.map((region) => region.region);

  useEffect(() => {
    if (typeof window === "undefined" || typeof CSS === "undefined" || typeof CSS.supports !== "function") return;
    setSupportsNativeZoom(CSS.supports("zoom", "1"));
  }, []);

  useLayoutEffect(() => {
    const root = canvasRootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const content = pageContentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      setContentHeight(Math.max(height, Math.ceil(content.scrollHeight)));
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(content);
    return () => observer.disconnect();
  }, [doc, height, effectiveTemplate, marginBox, styles]);

  const hideSelectionToolbar = useCallback(() => {
    setSelectionToolbar((current) => (current.open ? { ...current, open: false } : current));
  }, []);

  const syncSelectionToolbar = useCallback(() => {
    const selection = window.getSelection();
    const root = canvasRootRef.current;
    if (!selection || !root || selection.rangeCount === 0 || selection.isCollapsed) {
      hideSelectionToolbar();
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode || !root.contains(anchorNode)) {
      hideSelectionToolbar();
      return;
    }

    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;
    const editableRoot = anchorElement?.closest?.("[data-resume-editable='1'][data-resume-rich='1']") as HTMLElement | null;
    if (!editableRoot) {
      hideSelectionToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      hideSelectionToolbar();
      return;
    }

    savedSelectionRangeRef.current = range.cloneRange();

    const activeButtons: ToolbarAction[] = [];
    if (document.queryCommandState("bold")) activeButtons.push("bold");
    if (document.queryCommandState("italic")) activeButtons.push("italic");
    if (document.queryCommandState("underline")) activeButtons.push("underline");
    if (document.queryCommandState("strikeThrough")) activeButtons.push("strikethrough");

    const highlightValue = String(document.queryCommandValue("hiliteColor") || document.queryCommandValue("backColor") || "").trim();
    if (highlightValue && !/transparent|rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(highlightValue)) {
      activeButtons.push("highlight");
    }

    const computedStyle = window.getComputedStyle(anchorElement ?? editableRoot);
    const nextAlign: ToolbarAlignment = document.queryCommandState("justifyCenter")
      ? "center"
      : document.queryCommandState("justifyRight")
        ? "right"
        : document.queryCommandState("justifyFull")
          ? "justify"
        : computedStyle.textAlign === "center"
          ? "center"
          : computedStyle.textAlign === "right"
            ? "right"
            : computedStyle.textAlign === "justify"
              ? "justify"
            : "left";

    const x = Math.max(120, Math.min(rootRect.width - 120, rect.left - rootRect.left + rect.width / 2));
    const y = Math.max(16, rect.top - rootRect.top - 10);
    const rawColor = String(document.queryCommandValue("foreColor") || computedStyle.color || "#111827");

    setSelectionToolbar({
      open: true,
      x,
      y,
      color: toHexColor(rawColor),
      activeButtons,
      textAlign: nextAlign
    });
  }, [hideSelectionToolbar]);

  useEffect(() => {
    document.addEventListener("selectionchange", syncSelectionToolbar);
    window.addEventListener("resize", hideSelectionToolbar);
    return () => {
      document.removeEventListener("selectionchange", syncSelectionToolbar);
      window.removeEventListener("resize", hideSelectionToolbar);
    };
  }, [hideSelectionToolbar, syncSelectionToolbar]);

  function patchSection(sectionId: string, updater: (section: ResumeSectionBlock) => ResumeSectionBlock) {
    onChange({
      ...doc,
      sections: doc.sections.map((section) => (section.id === sectionId ? updater(section) : section))
    });
  }

  function moveSection(activeId: string, overId: string) {
    const fromIndex = doc.sections.findIndex((section) => section.id === activeId);
    const toIndex = doc.sections.findIndex((section) => section.id === overId);
    if (fromIndex === -1 || toIndex === -1) return;

    onChange({
      ...doc,
      sections: arrayMove(doc.sections, fromIndex, toIndex)
    });
  }

  function addItem(section: ResumeSectionBlock) {
    patchSection(section.id, (current) => {
      const data = current.data as Record<string, unknown>;
      const items = Array.isArray(data.items) ? [...(data.items as ItemRecord[])] : [];
      items.push({ id: `${section.kind}-${Date.now()}`, title: "", name: "", role: "", company: "", school: "", description: "", details: "", bullets: [] });
      return syncResumeSectionContent({
        ...current,
        data: {
          ...data,
          items
        }
      });
    });
  }

  function removeItem(section: ResumeSectionBlock, index: number) {
    patchSection(section.id, (current) => {
      const data = current.data as Record<string, unknown>;
      const items = Array.isArray(data.items) ? [...(data.items as ItemRecord[])] : [];
      items.splice(index, 1);
      return syncResumeSectionContent({
        ...current,
        data: {
          ...data,
          items
        }
      });
    });
  }

  function reorderItems(section: ResumeSectionBlock, fromIndex: number, toIndex: number) {
    patchSection(section.id, (current) => {
      const data = current.data as Record<string, unknown>;
      const items = Array.isArray(data.items) ? [...(data.items as ItemRecord[])] : [];
      return syncResumeSectionContent({
        ...current,
        data: {
          ...data,
          items: arrayMove(items, fromIndex, toIndex)
        }
      });
    });
  }

  function normalizeSectionText(section: ResumeSectionBlock) {
    patchSection(section.id, (current) => {
      const data = { ...(current.data as Record<string, unknown>) };
      if (typeof data.text === "string") {
        data.text = stripHtmlMarkup(data.text)
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .join("\n");
      }
      if (Array.isArray(data.items)) {
        data.items = data.items.map((item) => {
          const next = { ...(item as ItemRecord) };
          for (const [key, value] of Object.entries(next)) {
            if (typeof value === "string") {
              next[key] = stripHtmlMarkup(value).replace(/\s+/g, " ").trim();
            }
            if (Array.isArray(value)) {
              next[key] = value
                .map((entry) => (typeof entry === "string" ? stripHtmlMarkup(entry).replace(/\s+/g, " ").trim() : entry))
                .filter(Boolean);
            }
          }
          return next;
        });
      }
      return syncResumeSectionContent({ ...current, data });
    });
  }

  function bulletizeSection(section: ResumeSectionBlock) {
    patchSection(section.id, (current) => {
      const data = { ...(current.data as Record<string, unknown>) };
      const plainText = typeof data.text === "string" ? stripHtmlMarkup(data.text) : "";
      if (plainText.trim()) {
        const bullets = plainText
          .split(/[.\n]/)
          .map((line) => line.trim())
          .filter((line) => line.length > 3);
        if (bullets.length) {
          data.text = bullets.map((line) => `• ${line}`).join("\n");
        }
      }
      if (Array.isArray(data.items)) {
        data.items = data.items.map((item) => {
          const next = { ...(item as ItemRecord) };
          if (!Array.isArray(next.bullets)) {
            const source = [next.description, next.details]
              .map((value) => (typeof value === "string" ? stripHtmlMarkup(value) : ""))
              .filter((value): value is string => value.trim().length > 0)
              .join(". ");
            if (source.trim()) {
              next.bullets = source
                .split(/[.\n]/)
                .map((line) => line.trim())
                .filter((line) => line.length > 3);
            }
          }
          return next;
        });
      }
      return syncResumeSectionContent({ ...current, data });
    });
  }

  function restoreSavedSelection() {
    const selection = window.getSelection();
    const root = canvasRootRef.current;
    const savedRange = savedSelectionRangeRef.current;
    if (!selection || !root || !savedRange || !root.contains(savedRange.startContainer)) return null;

    selection.removeAllRanges();
    selection.addRange(savedRange);

    const anchorNode = selection.anchorNode;
    if (!anchorNode || !root.contains(anchorNode)) return null;
    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;
    return anchorElement?.closest?.("[data-resume-editable='1'][data-resume-rich='1']") as HTMLElement | null;
  }

  function runSelectionCommand(command: string, value?: string) {
    const editableRoot = restoreSavedSelection();
    if (!editableRoot) return;
    document.execCommand("styleWithCSS", false, "true");
    const applied = document.execCommand(command, false, value);
    if (!applied && command === "hiliteColor") {
      document.execCommand("backColor", false, value);
    }
    editableRoot.dispatchEvent(new Event("input", { bubbles: true }));
    window.requestAnimationFrame(syncSelectionToolbar);
  }

  const effectiveZoom = Math.max(0.45, Math.min(zoom, 2.25));
  const contentVisualHeight = Math.max(height, contentHeight);
  const pageCount = Math.max(1, Math.ceil(contentVisualHeight / height));

  const zoomedStyle: CSSProperties = supportsNativeZoom
    ? ({ width, zoom: effectiveZoom } as CSSProperties)
    : ({ width, transform: `scale(${effectiveZoom})`, transformOrigin: "top left" } as CSSProperties);

  const scaledWidth = Math.round(width * effectiveZoom);
  const scaledHeight = Math.round(contentVisualHeight * effectiveZoom);

  return (
    <div
      className="h-[calc(100vh-9.5rem)] overflow-auto rounded-3xl border border-border/70 bg-[radial-gradient(circle_at_top,#f8fafc,rgba(241,245,249,0.92)_42%,rgba(226,232,240,0.9)_100%)] p-1 sm:p-2"
      onMouseDown={(event) => {
        const pageFrame = pageFrameRef.current;
        if (pageFrame?.contains(event.target as Node)) return;
        onActiveSectionIdChange("");
        hideSelectionToolbar();
        savedSelectionRangeRef.current = null;
        const selection = window.getSelection();
        selection?.removeAllRanges();
      }}
      onScroll={() => setSelectionToolbar((current) => (current.open ? { ...current, open: false } : current))}
    >
      <div
        ref={canvasRootRef}
        className="relative flex min-h-full w-full justify-center"
        style={{
          minHeight: scaledHeight
        }}
      >
        {selectionToolbar.open ? (
          <div
            className="absolute z-40"
            style={{
              left: selectionToolbar.x,
              top: selectionToolbar.y,
              transform: "translate(-50%, -100%)"
            }}
          >
            <Toolbar
              activeButtons={selectionToolbar.activeButtons}
              availableActions={["bold", "italic", "underline", "strikethrough", "highlight", "color"]}
              currentColor={selectionToolbar.color}
              textAlign={selectionToolbar.textAlign}
              onAction={(action) => {
                if (action === "bold") runSelectionCommand("bold");
                if (action === "italic") runSelectionCommand("italic");
                if (action === "underline") runSelectionCommand("underline");
                if (action === "strikethrough") runSelectionCommand("strikeThrough");
                if (action === "highlight") runSelectionCommand("hiliteColor", HIGHLIGHT_COLOR);
              }}
              onColorChange={(color) => {
                runSelectionCommand("foreColor", color);
                setSelectionToolbar((current) => ({ ...current, color }));
              }}
              onTextAlignChange={(alignment) => {
                if (alignment === "left") runSelectionCommand("justifyLeft");
                if (alignment === "center") runSelectionCommand("justifyCenter");
                if (alignment === "right") runSelectionCommand("justifyRight");
                if (alignment === "justify") runSelectionCommand("justifyFull");
              }}
            />
          </div>
        ) : null}

        <div
          ref={pageFrameRef}
          className="relative"
          style={{
            width: scaledWidth,
            minHeight: scaledHeight
          }}
        >
          <div className="origin-top-left" style={zoomedStyle}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                const activeId = String(event.active.id);
                const overId = event.over ? String(event.over.id) : "";
                if (!overId || activeId === overId) return;
                moveSection(activeId, overId);
              }}
            >
              <SortableContext items={doc.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                <article
                  className="relative overflow-hidden rounded-2xl border border-slate-300/70 bg-white shadow-elev3"
                  style={{
                    minHeight: contentVisualHeight,
                    color: styles.colors.text,
                    fontFamily: styles.fonts.body,
                    lineHeight: styles.spacing.line,
                    fontSize: `${styles.sizes.body}px`,
                    textRendering: "optimizeLegibility",
                    backgroundImage: pageCount > 1
                      ? `repeating-linear-gradient(to bottom, transparent 0, transparent ${height - 1}px, rgba(148,163,184,0.3) ${height - 1}px, rgba(148,163,184,0.3) ${height}px)`
                      : undefined
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-300/45" />

                  <div
                    ref={pageContentRef}
                    className="relative z-10 grid"
                    style={{
                      minHeight: contentVisualHeight,
                      padding: marginBoxToCssPadding(marginBox),
                      gridTemplateColumns: twoColumn ? effectiveTemplate.layout.grid.columns : "1fr",
                      gridTemplateRows: effectiveTemplate.layout.grid.rows || "auto",
                      gap: effectiveTemplate.layout.grid.gap
                    }}
                  >
                    {regionOrder.map((regionName) => {
                      const regionConfig = effectiveTemplate.layout.regions.find((entry) => entry.region === regionName);
                      const sections = regionMap.get(regionName) ?? [];
                      if (!regionConfig || !sections.length) return null;

                      const isSidebar = regionName === "sidebar";
                      const isHeaderOrFooter = regionName === "header" || regionName === "footer";

                      return (
                        <div
                          key={regionName}
                          className="grid content-start"
                          style={{
                            gridColumn: isHeaderOrFooter ? "1 / -1" : twoColumn && isSidebar ? "2 / 3" : "1 / 2",
                            gridTemplateColumns: regionConfig.columns,
                            gap: regionConfig.gap
                          }}
                        >
                          {sections.map((section) => (
                            <SectionCard
                              key={section.id}
                              section={section}
                              active={activeSectionId === section.id}
                              accent={styles.colors.accent}
                              onSelect={() => onActiveSectionIdChange(section.id)}
                              onUpdate={(next) => patchSection(section.id, () => next)}
                              onRemove={() => onChange({ ...doc, sections: doc.sections.filter((entry) => entry.id !== section.id) })}
                              onAddItem={() => addItem(section)}
                              onRemoveItem={(index) => removeItem(section, index)}
                              onReorderItems={(fromIndex, toIndex) => reorderItems(section, fromIndex, toIndex)}
                              onRequestAi={() => onRequestAi?.(section.id)}
                              onBulletize={() => bulletizeSection(section)}
                              onNormalizeText={() => normalizeSectionText(section)}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </article>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
