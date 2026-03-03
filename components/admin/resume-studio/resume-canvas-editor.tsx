"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

import {
  mapSectionsToRegions,
  resolveDocumentMarginBox,
  resolveDocumentStyles,
  resolveTemplateForDocument,
  toA4Pixels,
  useTwoColumnLayout
} from "@/lib/resume-studio/layout";
import { marginBoxToCssPadding } from "@/lib/resume-studio/normalize";
import { stripHtmlMarkup } from "@/lib/resume-studio/text";
import { cn } from "@/lib/utils";
import type { ResumeDocumentRecord, ResumeSectionBlock, ResumeTemplateRecord } from "@/types/resume-studio";

type ItemRecord = Record<string, unknown>;
const FONT_OPTIONS = [
  "Arial",
  "Calibri",
  "Inter",
  "Arimo",
  "Helvetica",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "Merriweather",
  "Source Sans Pro",
  "Poppins",
  "Lato",
  "Roboto",
  "Cambria"
];
const RICH_ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "SPAN", "BR"]);
const RICH_ALLOWED_STYLES = new Set(["color", "font-family", "font-size", "font-weight", "font-style", "text-decoration"]);

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
    if (!RICH_ALLOWED_TAGS.has(node.tagName)) {
      const parent = node.parentNode;
      if (!parent) continue;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
      continue;
    }

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

      if (safeStyles.length) {
        node.setAttribute("style", safeStyles.join(";"));
      } else {
        node.removeAttribute("style");
      }
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
  if (section.kind === "custom") {
    const title = typeof (section.data as Record<string, unknown>).title === "string" ? String((section.data as Record<string, unknown>).title) : "";
    if (title.trim()) return title.trim();
  }
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
      onBlur={(event) => {
        const plain = (multiline ? event.currentTarget.innerText : event.currentTarget.textContent || "").trim();
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
        const html = sanitizeRichHtml(event.currentTarget.innerHTML);
        const hasContent = stripHtmlMarkup(html).length > 0;
        onCommit(hasContent ? html : "");
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
    onUpdate({
      ...section,
      data: nextData
    });
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

  return (
    <section
      ref={setNodeRef}
      style={{ transform: DndCSS.Transform.toString(transform), transition }}
      className={cn(
        "group rounded-xl border bg-white/90 p-2",
        active ? "border-primary/45 shadow-sm" : "border-transparent hover:border-border/70"
      )}
      onMouseDown={onSelect}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
          {sectionTitle(section)}
        </h3>
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
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

      {section.kind === "header" ? (
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
      ) : null}

      {section.kind === "summary" ? (
        <EditableText
          multiline
          className="min-h-10 whitespace-pre-wrap text-sm"
          value={String(data.text ?? "")}
          placeholder="Write a concise professional summary..."
          rich
          onCommit={(value) => patchData({ ...data, text: value })}
        />
      ) : null}

      {(section.kind === "experience" || section.kind === "education" || section.kind === "projects" || section.kind === "skills" || section.kind === "volunteering" || section.kind === "publications" || section.kind === "research" || section.kind === "awards") ? (
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
      ) : null}

      {(section.kind === "languages" || section.kind === "interests") ? (
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
      ) : null}

      {section.kind === "custom" ? (
        <>
          <EditableText
            className="text-sm font-medium"
            value={String(data.title ?? "Custom Section")}
            rich
            onCommit={(value) => patchData({ ...data, title: value })}
          />
          <EditableText
            multiline
            className="text-sm"
            value={String(data.text ?? "")}
            placeholder="Custom section content"
            rich
            onCommit={(value) => patchData({ ...data, text: value })}
          />
        </>
      ) : null}

      {Array.isArray(data.items) && section.kind !== "languages" && section.kind !== "interests" ? (
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
  const [supportsNativeZoom, setSupportsNativeZoom] = useState(true);
  const [selectionToolbar, setSelectionToolbar] = useState<{
    open: boolean;
    x: number;
    y: number;
    fontFamily: string;
    fontSize: string;
    color: string;
  }>({
    open: false,
    x: 0,
    y: 0,
    fontFamily: "Arial",
    fontSize: "3",
    color: "#111827"
  });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { width, height } = toA4Pixels(doc.page.size);
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

  useEffect(() => {
    function hideToolbar() {
      setSelectionToolbar((current) => (current.open ? { ...current, open: false } : current));
    }

    function syncSelectionToolbar() {
      const selection = window.getSelection();
      const root = canvasRootRef.current;
      if (!selection || !root || selection.rangeCount === 0 || selection.isCollapsed) {
        hideToolbar();
        return;
      }

      const anchorNode = selection.anchorNode;
      if (!anchorNode || !root.contains(anchorNode)) {
        hideToolbar();
        return;
      }

      const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;
      const editableRoot = anchorElement?.closest?.("[data-resume-editable='1'][data-resume-rich='1']");
      if (!editableRoot) {
        hideToolbar();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        hideToolbar();
        return;
      }

      const x = Math.max(120, Math.min(rootRect.width - 120, rect.left - rootRect.left + rect.width / 2));
      const y = Math.max(16, rect.top - rootRect.top - 10);
      const fontName = String(document.queryCommandValue("fontName") || "").replace(/['"]/g, "").trim();
      const fontSize = String(document.queryCommandValue("fontSize") || "3").trim();
      const color = String(document.queryCommandValue("foreColor") || "#111827");
      setSelectionToolbar({
        open: true,
        x,
        y,
        fontFamily: FONT_OPTIONS.includes(fontName) ? fontName : "Arial",
        fontSize: /^[1-7]$/.test(fontSize) ? fontSize : "3",
        color: toHexColor(color)
      });
    }

    document.addEventListener("selectionchange", syncSelectionToolbar);
    window.addEventListener("resize", hideToolbar);
    return () => {
      document.removeEventListener("selectionchange", syncSelectionToolbar);
      window.removeEventListener("resize", hideToolbar);
    };
  }, []);

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
      return {
        ...current,
        data: {
          ...data,
          items
        }
      };
    });
  }

  function removeItem(section: ResumeSectionBlock, index: number) {
    patchSection(section.id, (current) => {
      const data = current.data as Record<string, unknown>;
      const items = Array.isArray(data.items) ? [...(data.items as ItemRecord[])] : [];
      items.splice(index, 1);
      return {
        ...current,
        data: {
          ...data,
          items
        }
      };
    });
  }

  function reorderItems(section: ResumeSectionBlock, fromIndex: number, toIndex: number) {
    patchSection(section.id, (current) => {
      const data = current.data as Record<string, unknown>;
      const items = Array.isArray(data.items) ? [...(data.items as ItemRecord[])] : [];
      return {
        ...current,
        data: {
          ...data,
          items: arrayMove(items, fromIndex, toIndex)
        }
      };
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
      return { ...current, data };
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
      return { ...current, data };
    });
  }

  function runSelectionCommand(command: string, value?: string) {
    const selection = window.getSelection();
    const root = canvasRootRef.current;
    if (!selection || selection.rangeCount === 0 || !root) return;
    const anchorNode = selection.anchorNode;
    if (!anchorNode || !root.contains(anchorNode)) return;
    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;
    if (!anchorElement?.closest?.("[data-resume-editable='1'][data-resume-rich='1']")) return;

    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
  }

  const zoomedStyle: CSSProperties = supportsNativeZoom
    ? ({ width, zoom } as CSSProperties)
    : ({ width, transform: `scale(${zoom})`, transformOrigin: "top left" } as CSSProperties);

  const scaledWidth = Math.round(width * zoom);
  const scaledHeight = Math.round(height * zoom);

  return (
    <div
      className="h-[calc(100vh-9.5rem)] overflow-auto rounded-3xl border border-border/70 bg-muted/20 p-4"
      onScroll={() => setSelectionToolbar((current) => (current.open ? { ...current, open: false } : current))}
    >
      <div
        ref={canvasRootRef}
        className="relative mx-auto"
        style={{
          width: scaledWidth,
          minHeight: scaledHeight
        }}
      >
        {selectionToolbar.open ? (
          <div
            className="absolute z-40 flex items-center gap-1 rounded-xl border border-border/70 bg-card/95 px-2 py-1 shadow-elev2 backdrop-blur"
            style={{
              left: selectionToolbar.x,
              top: selectionToolbar.y,
              transform: "translate(-50%, -100%)"
            }}
          >
            <button
              type="button"
              className="rounded border border-border/70 px-2 py-0.5 text-xs"
              onMouseDown={(event) => {
                event.preventDefault();
                runSelectionCommand("bold");
              }}
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              className="rounded border border-border/70 px-2 py-0.5 text-xs"
              onMouseDown={(event) => {
                event.preventDefault();
                runSelectionCommand("italic");
              }}
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              className="rounded border border-border/70 px-2 py-0.5 text-xs"
              onMouseDown={(event) => {
                event.preventDefault();
                runSelectionCommand("underline");
              }}
              title="Underline"
            >
              U
            </button>
            <button
              type="button"
              className="rounded border border-border/70 px-2 py-0.5 text-xs"
              onMouseDown={(event) => {
                event.preventDefault();
                runSelectionCommand("insertUnorderedList");
              }}
              title="Bullet list"
            >
              •
            </button>
            <button
              type="button"
              className="rounded border border-border/70 px-2 py-0.5 text-xs"
              onMouseDown={(event) => {
                event.preventDefault();
                runSelectionCommand("removeFormat");
              }}
              title="Clear formatting"
            >
              Tx
            </button>
            <select
              className="h-7 rounded border border-border/70 bg-background px-2 text-xs"
              value={selectionToolbar.fontFamily}
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) => {
                runSelectionCommand("fontName", event.target.value);
                setSelectionToolbar((current) => ({ ...current, fontFamily: event.target.value }));
              }}
              title="Font family"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <select
              className="h-7 rounded border border-border/70 bg-background px-2 text-xs"
              value={selectionToolbar.fontSize}
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) => {
                runSelectionCommand("fontSize", event.target.value);
                setSelectionToolbar((current) => ({ ...current, fontSize: event.target.value }));
              }}
              title="Text size"
            >
              <option value="1">10px</option>
              <option value="2">12px</option>
              <option value="3">14px</option>
              <option value="4">16px</option>
              <option value="5">18px</option>
              <option value="6">24px</option>
              <option value="7">32px</option>
            </select>
            <input
              type="color"
              className="h-7 w-8 rounded border border-border/70 bg-background p-0.5"
              value={selectionToolbar.color}
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) => {
                runSelectionCommand("foreColor", event.target.value);
                setSelectionToolbar((current) => ({ ...current, color: event.target.value }));
              }}
              title="Text color"
            />
          </div>
        ) : null}

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
                className="relative overflow-hidden rounded-2xl border border-border/70 bg-white shadow-elev3"
                style={{
                  minHeight: height,
                  padding: marginBoxToCssPadding(marginBox),
                  color: styles.colors.text,
                  fontFamily: styles.fonts.body,
                  lineHeight: styles.spacing.line,
                  fontSize: `${styles.sizes.body}px`,
                  textRendering: "optimizeLegibility",
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${height - 1}px, rgba(148,163,184,0.35) ${height - 1}px, rgba(148,163,184,0.35) ${height}px)`
                }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-300/45" />
                <div
                  className="grid"
                  style={{
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
  );
}
