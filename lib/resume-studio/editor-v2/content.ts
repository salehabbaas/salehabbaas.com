import type {
  ResumeBlockAttributes,
  ResumeBlockNode,
  ResumeBulletListNode,
  ResumeBlockquoteNode,
  ResumeInlineNode,
  ResumeListItemNode,
  ResumeOrderedListNode,
  ResumeParagraphNode,
  ResumeRichTextDoc,
  ResumeSectionBlock,
  ResumeTextMark,
  ResumeTextNode
} from "@/types/resume-studio";

export type ResumeRichTextSearchOptions = {
  caseSensitive?: boolean;
};

export type ResumeRichTextOutlineEntry = {
  id: string;
  blockIndex: number;
  level: number;
  text: string;
};

const BLOCK_TYPES = new Set<ResumeBlockNode["type"]>([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "checklist",
  "checklistItem",
  "blockquote",
  "codeBlock",
  "table",
  "tableRow",
  "tableCell",
  "image",
  "columns",
  "horizontalRule",
  "pageBreak",
  "attachmentPlaceholder",
  "videoPlaceholder",
  "tocPlaceholder"
]);

const MARK_TYPES = new Set<ResumeTextMark["type"]>([
  "bold",
  "italic",
  "underline",
  "strike",
  "superscript",
  "subscript",
  "code",
  "highlight",
  "textColor",
  "fontFamily",
  "fontSize",
  "link"
]);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rawHtmlValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return escapeHtml(String(value));
  return "";
}

function joinHtmlParts(parts: Array<string | undefined>, delimiter: string) {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(delimiter);
}

function wrapParagraph(html: string) {
  const value = html.trim();
  return value ? `<p>${value}</p>` : "";
}

function wrapBlockHtml(html: string) {
  const value = html.trim();
  if (!value) return "";
  if (/^<\s*(p|div|ul|ol|h[1-6]|blockquote|hr)\b/i.test(value)) {
    return value;
  }
  return wrapParagraph(value);
}

function wrapList(items: string[], ordered = false) {
  const tag = ordered ? "ol" : "ul";
  const body = items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<li>${item}</li>`)
    .join("");
  return body ? `<${tag}>${body}</${tag}>` : "";
}

function renderItemBlock(item: Record<string, unknown>) {
  const heading = joinHtmlParts(
    [rawHtmlValue(item.role), rawHtmlValue(item.company), rawHtmlValue(item.name), rawHtmlValue(item.school), rawHtmlValue(item.degree), rawHtmlValue(item.organization)],
    " - "
  );
  const meta = joinHtmlParts(
    [rawHtmlValue(item.location), rawHtmlValue(item.startDate), rawHtmlValue(item.endDate), rawHtmlValue(item.year)],
    " | "
  );
  const supporting = [rawHtmlValue(item.description), rawHtmlValue(item.details), rawHtmlValue(item.link)]
    .map((value) => wrapBlockHtml(value))
    .filter(Boolean)
    .join("");
  const bullets = Array.isArray(item.bullets)
    ? wrapList(
        item.bullets
          .map((bullet) => rawHtmlValue(bullet))
          .filter(Boolean),
        false
      )
    : "";
  const levelName =
    rawHtmlValue(item.name) && rawHtmlValue(item.level)
      ? wrapParagraph(`${rawHtmlValue(item.name)} (${rawHtmlValue(item.level)})`)
      : "";

  return [wrapParagraph(heading), wrapParagraph(meta), supporting, bullets, levelName].filter(Boolean).join("");
}

export function legacyHtmlToPlainText(input: string) {
  return normalizeWhitespace(
    input
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*\/\s*(p|div|h[1-6]|blockquote)\s*>/gi, "\n\n")
      .replace(/<\s*\/\s*(ul|ol)\s*>/gi, "\n\n")
      .replace(/<\s*li[^>]*>/gi, "\n- ")
      .replace(/<\s*\/\s*li\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, "\"")
      .replace(/&apos;/gi, "'")
  );
}

function paragraphFromText(value: string, attrs?: ResumeBlockAttributes): ResumeParagraphNode {
  const lines = value.replace(/\r/g, "").split("\n");
  const content: ResumeInlineNode[] = [];

  lines.forEach((line, index) => {
    if (line) {
      content.push({ type: "text", text: line });
    }
    if (index < lines.length - 1) {
      content.push({ type: "hardBreak" });
    }
  });

  return {
    type: "paragraph",
    ...(attrs && Object.keys(attrs).length ? { attrs } : {}),
    ...(content.length ? { content } : {})
  };
}

function createListNode(type: "bulletList" | "orderedList", values: string[]): ResumeBulletListNode | ResumeOrderedListNode {
  return {
    type,
    content: values
      .map((value) => normalizeWhitespace(value))
      .filter(Boolean)
      .map(
        (value) =>
          ({
            type: "listItem",
            content: [paragraphFromText(value)]
          }) satisfies ResumeListItemNode
      )
  };
}

function blockFromPlainSegment(segment: string) {
  const lines = segment
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const bulletLines = lines.map((line) => line.match(/^[-*•]\s+(.+)$/));
  if (bulletLines.every(Boolean)) {
    return createListNode(
      "bulletList",
      bulletLines.map((match) => (match ? match[1] : "")).filter(Boolean)
    );
  }

  const orderedLines = lines.map((line) => line.match(/^\d+[.)]\s+(.+)$/));
  if (orderedLines.every(Boolean)) {
    return createListNode(
      "orderedList",
      orderedLines.map((match) => (match ? match[1] : "")).filter(Boolean)
    );
  }

  return paragraphFromText(lines.join("\n"));
}

export function createResumeRichTextDoc(content: ResumeBlockNode[] = []): ResumeRichTextDoc {
  if (!content.length) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }]
    };
  }

  return {
    type: "doc",
    content
  };
}

export function plainTextToResumeRichTextDoc(input: string) {
  const normalized = normalizeWhitespace(input.replace(/\r/g, ""));
  if (!normalized) return createResumeRichTextDoc();

  const blocks = normalized
    .split(/\n{2,}/)
    .map((segment) => blockFromPlainSegment(segment))
    .filter((block): block is NonNullable<ReturnType<typeof blockFromPlainSegment>> => Boolean(block));

  return createResumeRichTextDoc(blocks);
}

export function legacyHtmlToResumeRichTextDoc(input: string) {
  return plainTextToResumeRichTextDoc(legacyHtmlToPlainText(input));
}

function normalizeBlockAttributes(value: unknown): ResumeBlockAttributes | undefined {
  const attrs = asRecord(value);
  const normalized: ResumeBlockAttributes = {};

  const textAlign = asString(attrs.textAlign);
  if (textAlign === "left" || textAlign === "center" || textAlign === "right" || textAlign === "justify") {
    normalized.textAlign = textAlign;
  }

  const direction = asString(attrs.direction);
  if (direction === "ltr" || direction === "rtl" || direction === "auto") {
    normalized.direction = direction;
  }

  const keys = ["lineHeight", "spacingBefore", "spacingAfter", "indentLevel", "firstLineIndent", "hangingIndent", "columnSpan"] as const;
  for (const key of keys) {
    const value = asFiniteNumber(attrs[key]);
    if (value !== undefined) normalized[key] = value;
  }

  const language = asString(attrs.language);
  if (language) normalized.language = language;

  const keepWithNext = asBoolean(attrs.keepWithNext);
  if (keepWithNext !== undefined) normalized.keepWithNext = keepWithNext;

  const pageBreakBefore = asBoolean(attrs.pageBreakBefore);
  if (pageBreakBefore !== undefined) normalized.pageBreakBefore = pageBreakBefore;

  return Object.keys(normalized).length ? normalized : undefined;
}

function normalizeMark(value: unknown): ResumeTextMark | null {
  const record = asRecord(value);
  const type = asString(record.type) as ResumeTextMark["type"];
  if (!MARK_TYPES.has(type)) return null;

  const attrs = asRecord(record.attrs);
  switch (type) {
    case "highlight": {
      const color = asString(attrs.color);
      return color ? { type, attrs: { color } } : { type };
    }
    case "textColor": {
      const color = asString(attrs.color);
      return color ? { type, attrs: { color } } : null;
    }
    case "fontFamily": {
      const family = asString(attrs.value);
      return family ? { type, attrs: { value: family } } : null;
    }
    case "fontSize": {
      const size = asString(attrs.value);
      return size ? { type, attrs: { value: size } } : null;
    }
    case "link": {
      const href = asString(attrs.href);
      if (!href) return null;
      const target = asString(attrs.target);
      const rel = asString(attrs.rel);
      return {
        type,
        attrs: {
          href,
          ...(target ? { target } : {}),
          ...(rel ? { rel } : {})
        }
      };
    }
    default:
      return { type };
  }
}

function normalizeInlineNode(value: unknown): ResumeInlineNode | null {
  const record = asRecord(value);
  const type = asString(record.type);

  if (type === "hardBreak") {
    return { type: "hardBreak" };
  }

  if (type === "emoji") {
    const attrs = asRecord(record.attrs);
    const value = asString(attrs.value);
    const shortcode = asString(attrs.shortcode);
    if (!value || !shortcode) return null;
    return {
      type: "emoji",
      attrs: {
        value,
        shortcode
      }
    };
  }

  if (type === "mention") {
    const attrs = asRecord(record.attrs);
    const id = asString(attrs.id);
    const label = asString(attrs.label);
    if (!id || !label) return null;
    return {
      type: "mention",
      attrs: { id, label }
    };
  }

  if (type === "tag") {
    const attrs = asRecord(record.attrs);
    const tag = asString(attrs.value);
    if (!tag) return null;
    return {
      type: "tag",
      attrs: { value: tag }
    };
  }

  if (type === "footnoteRef") {
    const attrs = asRecord(record.attrs);
    const id = asString(attrs.id);
    if (!id) return null;
    return {
      type: "footnoteRef",
      attrs: { id }
    };
  }

  if (type === "bookmark") {
    const attrs = asRecord(record.attrs);
    const id = asString(attrs.id);
    if (!id) return null;
    const label = asString(attrs.label);
    return {
      type: "bookmark",
      attrs: {
        id,
        ...(label ? { label } : {})
      }
    };
  }

  if (type !== "text") return null;
  const text = asString(record.text);
  if (!text) return null;

  const marks = Array.isArray(record.marks) ? record.marks.map((mark) => normalizeMark(mark)).filter((mark): mark is ResumeTextMark => Boolean(mark)) : [];

  const output: ResumeTextNode = {
    type: "text",
    text
  };

  if (marks.length) output.marks = marks;
  return output;
}

function normalizeListItem(value: unknown): ResumeListItemNode | null {
  const record = asRecord(value);
  if (asString(record.type) !== "listItem") return null;
  const content = Array.isArray(record.content)
    ? record.content.map((item) => normalizeBlockNode(item)).filter((item): item is ResumeBlockNode => Boolean(item))
    : [];

  if (!content.length) {
    content.push({ type: "paragraph" });
  }

  return {
    type: "listItem",
    content: content.filter(
      (item): item is ResumeListItemNode["content"][number] =>
        item.type === "paragraph" ||
        item.type === "heading" ||
        item.type === "bulletList" ||
        item.type === "orderedList" ||
        item.type === "blockquote"
    )
  };
}

function normalizeBlockNode(value: unknown): ResumeBlockNode | null {
  const record = asRecord(value);
  const type = asString(record.type) as ResumeBlockNode["type"];
  if (!BLOCK_TYPES.has(type)) return null;

  if (type === "horizontalRule" || type === "pageBreak") {
    return { type };
  }

  if (type === "attachmentPlaceholder") {
    const attrs = asRecord(record.attrs);
    const fileName = asString(attrs.fileName);
    if (!fileName) return null;
    return {
      type,
      attrs: {
        fileName,
        mimeType: asString(attrs.mimeType) || undefined,
        nonExportable: asBoolean(attrs.nonExportable) ?? true
      }
    } as ResumeBlockNode;
  }

  if (type === "videoPlaceholder") {
    const attrs = asRecord(record.attrs);
    const url = asString(attrs.url);
    if (!url) return null;
    return {
      type,
      attrs: {
        url,
        label: asString(attrs.label) || undefined,
        nonExportable: asBoolean(attrs.nonExportable) ?? true
      }
    } as ResumeBlockNode;
  }

  if (type === "tocPlaceholder") {
    return { type } as ResumeBlockNode;
  }

  if (type === "bulletList" || type === "orderedList") {
    const content = Array.isArray(record.content)
      ? record.content.map((item) => normalizeListItem(item)).filter((item): item is ResumeListItemNode => Boolean(item))
      : [];
    return { type, ...(content.length ? { content } : {}) } as ResumeBlockNode;
  }

  if (type === "listItem") {
    return normalizeListItem(value);
  }

  if (type === "blockquote") {
    const content = Array.isArray(record.content)
      ? record.content.map((item) => normalizeBlockNode(item)).filter((item): item is ResumeBlockNode => Boolean(item))
      : [];
    const blockquoteContent = content.filter(
      (item): item is ResumeBlockquoteNode["content"][number] =>
        item.type === "paragraph" || item.type === "heading" || item.type === "bulletList" || item.type === "orderedList"
    );
    return {
      type,
      content: blockquoteContent.length ? blockquoteContent : [{ type: "paragraph" }]
    };
  }

  if (type === "checklist") {
    const items = Array.isArray(record.content) ? record.content.map((item) => asRecord(item)).filter(Boolean) : [];
    const content = items.map((item) => {
      const childBlocks = Array.isArray(item.content)
        ? item.content.map((entry) => normalizeBlockNode(entry)).filter((entry): entry is ResumeBlockNode => Boolean(entry))
        : [{ type: "paragraph" } as ResumeBlockNode];
      return {
        type: "checklistItem" as const,
        attrs: {
          checked: asBoolean(asRecord(item.attrs).checked) ?? false
        },
        content: childBlocks.filter((entry): entry is ResumeListItemNode["content"][number] => entry.type === "paragraph" || entry.type === "heading")
      };
    });

    return {
      type,
      content
    } as ResumeBlockNode;
  }

  if (type === "image") {
    const attrs = asRecord(record.attrs);
    const src = asString(attrs.src);
    if (!src) return null;
    return {
      type,
      attrs: {
        ...normalizeBlockAttributes(attrs),
        src,
        alt: asString(attrs.alt) || undefined,
        title: asString(attrs.title) || undefined,
        width: asFiniteNumber(attrs.width),
        height: asFiniteNumber(attrs.height)
      }
    } as ResumeBlockNode;
  }

  if (type === "tableCell") {
    const attrs = asRecord(record.attrs);
    const content = Array.isArray(record.content)
      ? record.content.map((item) => normalizeBlockNode(item)).filter((item): item is ResumeBlockNode => Boolean(item))
      : [{ type: "paragraph" }];
    return {
      type,
      attrs: {
        ...normalizeBlockAttributes(attrs),
        colSpan: asFiniteNumber(attrs.colSpan),
        rowSpan: asFiniteNumber(attrs.rowSpan),
        header: asBoolean(attrs.header)
      },
      content: content.filter(
        (item): item is ResumeListItemNode["content"][number] =>
          item.type === "paragraph" || item.type === "heading" || item.type === "bulletList" || item.type === "orderedList"
      )
    } as ResumeBlockNode;
  }

  if (type === "tableRow") {
    const normalized = Array.isArray(record.content)
      ? record.content.map((item) => normalizeBlockNode(item)).filter((item): item is ResumeBlockNode => item !== null)
      : [];
    const content = normalized.filter((item): item is ResumeBlockNode => item.type === "tableCell");
    return {
      type,
      content: content as unknown as ResumeBlockNode[]
    } as ResumeBlockNode;
  }

  if (type === "table") {
    const attrs = asRecord(record.attrs);
    const normalized = Array.isArray(record.content)
      ? record.content.map((item) => normalizeBlockNode(item)).filter((item): item is ResumeBlockNode => item !== null)
      : [];
    const content = normalized.filter((item): item is ResumeBlockNode => item.type === "tableRow");
    return {
      type,
      attrs: {
        ...normalizeBlockAttributes(attrs),
        caption: asString(attrs.caption) || undefined
      },
      content: content as unknown as ResumeBlockNode[]
    } as ResumeBlockNode;
  }

  if (type === "columns") {
    const attrs = asRecord(record.attrs);
    const content = Array.isArray(record.content)
      ? record.content.map((item) => normalizeBlockNode(item)).filter((item): item is ResumeBlockNode => Boolean(item))
      : [];
    return {
      type,
      attrs: {
        ...normalizeBlockAttributes(attrs),
        count: asFiniteNumber(attrs.count),
        gap: asFiniteNumber(attrs.gap)
      },
      content: content.filter(
        (item): item is ResumeBlockquoteNode["content"][number] =>
          item.type === "paragraph" || item.type === "heading" || item.type === "bulletList" || item.type === "orderedList" || item.type === "blockquote"
      )
    } as ResumeBlockNode;
  }

  if (type === "checklistItem") {
    const content = Array.isArray(record.content)
      ? record.content.map((item) => normalizeBlockNode(item)).filter((item): item is ResumeBlockNode => item !== null)
      : [];
    return {
      type,
      attrs: {
        checked: asBoolean(asRecord(record.attrs).checked) ?? false
      },
      content: content.filter((item): item is ResumeListItemNode["content"][number] => item.type === "paragraph" || item.type === "heading")
    } as ResumeBlockNode;
  }

  const attrs = normalizeBlockAttributes(record.attrs);
  const content = Array.isArray(record.content)
    ? record.content.map((item) => normalizeInlineNode(item)).filter((item): item is ResumeInlineNode => Boolean(item))
    : [];

  if (type === "heading") {
    const level = asFiniteNumber(asRecord(record.attrs).level);
    return {
      type,
      ...(attrs || level ? { attrs: { ...(attrs ?? {}), level: level && level >= 1 && level <= 6 ? (level as 1 | 2 | 3 | 4 | 5 | 6) : 2 } } : {}),
      ...(content.length ? { content } : {})
    };
  }

  return {
    type,
    ...(attrs ? { attrs } : {}),
    ...(content.length ? { content } : {})
  };
}

export function normalizeResumeRichTextDoc(value: unknown): ResumeRichTextDoc | undefined {
  const record = asRecord(value);
  if (asString(record.type) !== "doc") return undefined;

  const content = Array.isArray(record.content)
    ? record.content.map((item) => normalizeBlockNode(item)).filter((item): item is ResumeBlockNode => Boolean(item))
    : [];

  return createResumeRichTextDoc(content);
}

function renderMark(text: string, mark: ResumeTextMark) {
  switch (mark.type) {
    case "bold":
      return `<strong>${text}</strong>`;
    case "italic":
      return `<em>${text}</em>`;
    case "underline":
      return `<u>${text}</u>`;
    case "strike":
      return `<s>${text}</s>`;
    case "superscript":
      return `<sup>${text}</sup>`;
    case "subscript":
      return `<sub>${text}</sub>`;
    case "code":
      return `<code>${text}</code>`;
    case "highlight":
      return `<mark${mark.attrs?.color ? ` style="background-color:${escapeAttribute(mark.attrs.color)}"` : ""}>${text}</mark>`;
    case "textColor":
      return `<span style="color:${escapeAttribute(mark.attrs.color)}">${text}</span>`;
    case "fontFamily":
      return `<span style="font-family:${escapeAttribute(mark.attrs.value)}">${text}</span>`;
    case "fontSize":
      return `<span style="font-size:${escapeAttribute(mark.attrs.value)}">${text}</span>`;
    case "link":
      return `<a href="${escapeAttribute(mark.attrs.href)}"${mark.attrs.target ? ` target="${escapeAttribute(mark.attrs.target)}"` : ""}${mark.attrs.rel ? ` rel="${escapeAttribute(mark.attrs.rel)}"` : ""}>${text}</a>`;
    default:
      return text;
  }
}

function renderInlinesToHtml(content: ResumeInlineNode[] | undefined) {
  return (content ?? [])
    .map((node) => {
      if (node.type === "hardBreak") return "<br />";
      if (node.type === "emoji") return escapeHtml(node.attrs.value);
      if (node.type === "mention") return `<span data-mention-id="${escapeAttribute(node.attrs.id)}">@${escapeHtml(node.attrs.label)}</span>`;
      if (node.type === "tag") return `<span data-tag="true">#${escapeHtml(node.attrs.value)}</span>`;
      if (node.type === "footnoteRef") return `<sup data-footnote-id="${escapeAttribute(node.attrs.id)}">[${escapeHtml(node.attrs.id)}]</sup>`;
      if (node.type === "bookmark") return `<a data-bookmark-id="${escapeAttribute(node.attrs.id)}">${escapeHtml(node.attrs.label ?? node.attrs.id)}</a>`;
      const escaped = escapeHtml(node.text);
      return (node.marks ?? []).reduce((current, mark) => renderMark(current, mark), escaped);
    })
    .join("");
}

function renderListItems(items: ResumeListItemNode[]) {
  return items
    .map((item) => {
      const body = item.content.map((block) => renderBlockToHtml(block)).join("");
      return body ? `<li>${body}</li>` : "";
    })
    .join("");
}

function renderBlockToHtml(block: ResumeBlockNode): string {
  switch (block.type) {
    case "paragraph":
      return `<p>${renderInlinesToHtml(block.content)}</p>`;
    case "heading": {
      const level = block.attrs?.level ?? 2;
      return `<h${level}>${renderInlinesToHtml(block.content)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderListItems(block.content)}</ul>`;
    case "orderedList":
      return `<ol>${renderListItems(block.content)}</ol>`;
    case "blockquote":
      return `<blockquote>${block.content.map((item) => renderBlockToHtml(item)).join("")}</blockquote>`;
    case "checklist":
      return `<ul data-checklist="true">${block.content
        .map((item) => {
          const checked = item.attrs?.checked ? "true" : "false";
          const body = item.content.map((entry) => renderBlockToHtml(entry)).join("");
          return `<li data-checked="${checked}">${body}</li>`;
        })
        .join("")}</ul>`;
    case "codeBlock":
      return `<pre><code>${escapeHtml((block.content ?? []).map((node) => inlineToText(node)).join(""))}</code></pre>`;
    case "table":
      return `<table>${(block.content ?? [])
        .map((row) => {
          const cells = (row.content ?? [])
            .map((cell) => {
              const tag = cell.attrs?.header ? "th" : "td";
              const cellBody = (cell.content ?? []).map((entry) => renderBlockToHtml(entry)).join("");
              return `<${tag}>${cellBody}</${tag}>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("")}</table>`;
    case "image":
      return `<img src="${escapeAttribute(block.attrs.src)}" alt="${escapeAttribute(block.attrs.alt ?? "")}" />`;
    case "columns":
      return `<div data-columns="${block.attrs?.count ?? 2}">${block.content.map((item) => renderBlockToHtml(item)).join("")}</div>`;
    case "horizontalRule":
      return "<hr />";
    case "pageBreak":
      return '<hr data-page-break="true" />';
    case "attachmentPlaceholder":
      return `<div data-attachment-placeholder="true">${escapeHtml(block.attrs.fileName)}</div>`;
    case "videoPlaceholder":
      return `<div data-video-placeholder="true">${escapeHtml(block.attrs.label ?? block.attrs.url)}</div>`;
    case "tocPlaceholder":
      return `<div data-toc-placeholder="true">[TOC]</div>`;
    case "listItem":
      return renderListItems([block]);
    default:
      return "";
  }
}

export function resumeRichTextDocToHtml(doc: ResumeRichTextDoc) {
  return doc.content.map((block) => renderBlockToHtml(block)).join("");
}

function inlineToText(node: ResumeInlineNode) {
  if (node.type === "hardBreak") return "\n";
  if (node.type === "emoji") return node.attrs.value;
  if (node.type === "mention") return `@${node.attrs.label}`;
  if (node.type === "tag") return `#${node.attrs.value}`;
  if (node.type === "footnoteRef") return `[${node.attrs.id}]`;
  if (node.type === "bookmark") return node.attrs.label ?? node.attrs.id;
  return node.text;
}

function replaceMatches(input: string, search: string, replace: string, caseSensitive = false) {
  if (!search.trim()) {
    return {
      text: input,
      count: 0
    };
  }

  const regex = new RegExp(escapeRegExp(search), caseSensitive ? "g" : "gi");
  let count = 0;
  const text = input.replace(regex, () => {
    count += 1;
    return replace;
  });

  return {
    text,
    count
  };
}

function replaceInListItem(
  item: ResumeListItemNode,
  search: string,
  replace: string,
  caseSensitive: boolean
): { item: ResumeListItemNode; count: number } {
  let count = 0;
  const content = item.content.map((block) => {
    const next = replaceInBlock(block, search, replace, caseSensitive);
    count += next.count;
    return next.block;
  });

  return {
    item: {
      ...item,
      content: content.filter(
        (entry): entry is ResumeListItemNode["content"][number] =>
          entry.type === "paragraph" ||
          entry.type === "heading" ||
          entry.type === "bulletList" ||
          entry.type === "orderedList" ||
          entry.type === "blockquote"
      )
    },
    count
  };
}

function replaceInInlines(
  content: ResumeInlineNode[] | undefined,
  search: string,
  replace: string,
  caseSensitive: boolean
) {
  let count = 0;
  const nextContent = (content ?? []).map((node) => {
    if (node.type !== "text") return node;
    const next = replaceMatches(node.text, search, replace, caseSensitive);
    count += next.count;
    return next.count
      ? {
          ...node,
          text: next.text
        }
      : node;
  });

  return {
    content: nextContent,
    count
  };
}

function replaceInBlock(
  block: ResumeBlockNode,
  search: string,
  replace: string,
  caseSensitive: boolean
): { block: ResumeBlockNode; count: number } {
  if (block.type === "paragraph" || block.type === "heading" || block.type === "codeBlock") {
    const next = replaceInInlines(block.content, search, replace, caseSensitive);
    return {
      block: {
        ...block,
        content: next.content
      } as ResumeBlockNode,
      count: next.count
    };
  }

  if (block.type === "bulletList" || block.type === "orderedList") {
    let count = 0;
    const content = block.content.map((item) => {
      const next = replaceInListItem(item, search, replace, caseSensitive);
      count += next.count;
      return next.item;
    });

    return {
      block: {
        ...block,
        content
      } as ResumeBlockNode,
      count
    };
  }

  if (block.type === "blockquote") {
    let count = 0;
    const content = block.content.map((entry) => {
      const next = replaceInBlock(entry, search, replace, caseSensitive);
      count += next.count;
      return next.block;
    });

    return {
      block: {
        ...block,
        content: content.filter(
          (entry): entry is ResumeBlockquoteNode["content"][number] =>
            entry.type === "paragraph" ||
            entry.type === "heading" ||
            entry.type === "bulletList" ||
            entry.type === "orderedList"
        )
      },
      count
    };
  }

  if (block.type === "checklist") {
    let count = 0;
    const content = block.content.map((item) => {
      const nextContent = item.content.map((entry) => {
        const next = replaceInBlock(entry, search, replace, caseSensitive);
        count += next.count;
        return next.block;
      });
      return {
        ...item,
        content: nextContent.filter(
          (entry): entry is typeof item.content[number] => entry.type === "paragraph" || entry.type === "heading"
        )
      };
    });
    return {
      block: {
        ...block,
        content
      } as ResumeBlockNode,
      count
    };
  }

  if (block.type === "table") {
    let count = 0;
    const content = block.content.map((row) => ({
      ...row,
      content: row.content.map((cell) => {
        const nextContent = cell.content.map((entry) => {
          const next = replaceInBlock(entry, search, replace, caseSensitive);
          count += next.count;
          return next.block;
        });
        return {
          ...cell,
          content: nextContent.filter(
            (entry): entry is typeof cell.content[number] =>
              entry.type === "paragraph" || entry.type === "heading" || entry.type === "bulletList" || entry.type === "orderedList"
          )
        };
      })
    }));
    return {
      block: {
        ...block,
        content
      } as ResumeBlockNode,
      count
    };
  }

  return {
    block,
    count: 0
  };
}

function listItemToText(item: ResumeListItemNode, ordered: boolean, index: number) {
  const prefix = ordered ? `${index + 1}. ` : "• ";
  const lines = item.content.map((block) => blockToText(block)).filter(Boolean);
  if (!lines.length) return "";
  return `${prefix}${lines.join("\n")}`;
}

function blockToText(block: ResumeBlockNode): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "codeBlock":
      return normalizeWhitespace((block.content ?? []).map((node) => inlineToText(node)).join(""));
    case "bulletList":
      return block.content.map((item, index) => listItemToText(item, false, index)).filter(Boolean).join("\n");
    case "orderedList":
      return block.content.map((item, index) => listItemToText(item, true, index)).filter(Boolean).join("\n");
    case "blockquote":
      return block.content.map((item) => blockToText(item)).filter(Boolean).join("\n");
    case "checklist":
      return block.content
        .map((item) => `${item.attrs?.checked ? "[x]" : "[ ]"} ${item.content.map((entry) => blockToText(entry)).filter(Boolean).join(" ")}`.trim())
        .filter(Boolean)
        .join("\n");
    case "table":
      return block.content
        .map((row) => row.content.map((cell) => cell.content.map((entry) => blockToText(entry)).filter(Boolean).join(" ")).join(" | "))
        .filter(Boolean)
        .join("\n");
    case "image":
      return block.attrs.alt ?? "";
    case "columns":
      return block.content.map((item) => blockToText(item)).filter(Boolean).join("\n");
    case "attachmentPlaceholder":
      return block.attrs.fileName;
    case "videoPlaceholder":
      return block.attrs.label ?? block.attrs.url;
    case "tocPlaceholder":
      return "";
    default:
      return "";
  }
}

export function resumeRichTextDocToPlainText(doc: ResumeRichTextDoc) {
  return normalizeWhitespace(
    doc.content
      .map((block) => blockToText(block))
      .filter(Boolean)
      .join("\n\n")
  );
}

export function countResumeRichTextMatches(
  doc: ResumeRichTextDoc,
  search: string,
  options: ResumeRichTextSearchOptions = {}
) {
  const query = search.trim();
  if (!query) return 0;

  const regex = new RegExp(escapeRegExp(query), options.caseSensitive ? "g" : "gi");
  const plainText = resumeRichTextDocToPlainText(doc);
  const matches = plainText.match(regex);
  return matches?.length ?? 0;
}

export function replaceInResumeRichTextDoc(
  doc: ResumeRichTextDoc,
  search: string,
  replace: string,
  options: ResumeRichTextSearchOptions = {}
) {
  const query = search.trim();
  if (!query) {
    return {
      doc,
      replacements: 0
    };
  }

  let replacements = 0;
  const content = doc.content.map((block) => {
    const next = replaceInBlock(block, query, replace, Boolean(options.caseSensitive));
    replacements += next.count;
    return next.block;
  });

  return {
    doc: createResumeRichTextDoc(content),
    replacements
  };
}

export function extractResumeRichTextOutline(doc: ResumeRichTextDoc): ResumeRichTextOutlineEntry[] {
  const outline: ResumeRichTextOutlineEntry[] = [];

  doc.content.forEach((block, blockIndex) => {
    if (block.type !== "heading") return;
    const text = normalizeWhitespace((block.content ?? []).map((node) => inlineToText(node)).join(""));
    if (!text) return;

    outline.push({
      id: `heading-${blockIndex}`,
      blockIndex,
      level: block.attrs?.level ?? 2,
      text
    });
  });

  return outline;
}

export function sectionDataToLegacyHtml(section: Pick<ResumeSectionBlock, "kind" | "data">) {
  const data = asRecord(section.data);

  if (section.kind === "header") {
    return [
      wrapParagraph(rawHtmlValue(data.fullName)),
      wrapParagraph(rawHtmlValue(data.headline)),
      wrapParagraph(joinHtmlParts([rawHtmlValue(data.email), rawHtmlValue(data.phone), rawHtmlValue(data.location)], " | ")),
      wrapParagraph(
        Array.isArray(data.links)
          ? data.links.map((item) => rawHtmlValue(item)).filter(Boolean).join(" | ")
          : ""
      )
    ]
      .filter(Boolean)
      .join("");
  }

  if (section.kind === "summary") {
    return wrapBlockHtml(rawHtmlValue(data.text));
  }

  if (section.kind === "languages" || section.kind === "interests") {
    const items = Array.isArray(data.items) ? data.items.map((item) => rawHtmlValue(item)).filter(Boolean) : [];
    return wrapList(items, false);
  }

  if (section.kind === "custom") {
    return [wrapParagraph(rawHtmlValue(data.title)), wrapBlockHtml(rawHtmlValue(data.text))].filter(Boolean).join("");
  }

  if (Array.isArray(data.items)) {
    return data.items
      .map((item) => renderItemBlock(asRecord(item)))
      .filter(Boolean)
      .join("");
  }

  return wrapBlockHtml(rawHtmlValue(data.text));
}

export function sectionDataToResumeRichTextDoc(section: Pick<ResumeSectionBlock, "kind" | "data">) {
  return legacyHtmlToResumeRichTextDoc(sectionDataToLegacyHtml(section));
}

export function resolveResumeSectionContent(
  section: Pick<ResumeSectionBlock, "kind" | "data"> & { contentDoc?: unknown; contentHtmlLegacy?: string; id?: string; locked?: boolean }
) {
  const contentDoc = normalizeResumeRichTextDoc(section.contentDoc) ?? sectionDataToResumeRichTextDoc(section);
  const contentHtmlLegacy = typeof section.contentHtmlLegacy === "string" && section.contentHtmlLegacy.trim()
    ? section.contentHtmlLegacy.trim()
    : sectionDataToLegacyHtml(section);

  return {
    contentDoc,
    contentHtmlLegacy: contentHtmlLegacy || undefined
  };
}

export function syncResumeSectionContent(section: ResumeSectionBlock): ResumeSectionBlock {
  const normalizedDoc = normalizeResumeRichTextDoc(section.contentDoc);
  const legacyFromData = sectionDataToLegacyHtml(section).trim();
  const normalizedDocText = normalizedDoc ? resumeRichTextDocToPlainText(normalizedDoc) : "";

  const shouldPreferData = Boolean(legacyFromData) && (!normalizedDoc || !normalizedDocText);
  const contentDoc = shouldPreferData ? sectionDataToResumeRichTextDoc(section) : normalizedDoc ?? sectionDataToResumeRichTextDoc(section);
  const contentHtmlLegacy = (shouldPreferData ? legacyFromData : resumeRichTextDocToHtml(contentDoc).trim() || legacyFromData) || undefined;

  return {
    ...section,
    contentDoc,
    contentHtmlLegacy
  };
}
