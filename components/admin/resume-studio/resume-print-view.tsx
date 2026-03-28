import {
  mapSectionsToRegions,
  resolveDocumentMarginBox,
  resolveDocumentStyles,
  resolveTemplateForDocument,
  sectionTitle,
  toA4Millimeters,
  useTwoColumnLayout
} from "@/lib/resume-studio/layout";
import { resumeRichTextDocToHtml } from "@/lib/resume-studio/editor-v2/content";
import { marginBoxToCssPadding } from "@/lib/resume-studio/normalize";
import { stripHtmlMarkup } from "@/lib/resume-studio/text";
import type { ResumeDocumentRecord, ResumeSectionBlock, ResumeTemplateRecord } from "@/types/resume-studio";

function hasText(value: unknown) {
  return typeof value === "string" && stripHtmlMarkup(value).length > 0;
}

function joinRichSegments(parts: unknown[], separator: string) {
  const seen = new Set<string>();
  return parts
    .filter(hasText)
    .map((part) => String(part).trim())
    .filter((part) => {
      const key = stripHtmlMarkup(part).replace(/\s+/g, " ").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(`<span class="print-separator">${separator}</span>`);
}

function RichLine({
  html,
  className = "print-line"
}: {
  html: string;
  className?: string;
}) {
  return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function RichBlock({
  html,
  className = "print-rich-block"
}: {
  html: string;
  className?: string;
}) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function ResumePrintSection({ section }: { section: ResumeSectionBlock }) {
  const data = section.data as Record<string, unknown>;
  const items = Array.isArray(data.items) ? (data.items as Array<Record<string, unknown>>) : [];
  const structuredHtml = section.contentDoc ? resumeRichTextDocToHtml(section.contentDoc).trim() : "";

  if (section.kind === "header") {
    const name = String(data.fullName ?? "").trim();
    const headline = String(data.headline ?? "").trim();
    const contact = [data.email, data.phone, data.location]
      .filter((value) => typeof value === "string" && stripHtmlMarkup(String(value)).length > 0)
      .join(" <span class=\"print-separator\">|</span> ");

    return (
      <div className="print-stack">
        {hasText(name) ? <RichLine html={name} className="print-header-name" /> : null}
        {hasText(headline) ? <RichLine html={headline} className="print-header-headline" /> : null}
        {contact ? <RichLine html={contact} className="print-header-meta" /> : null}
      </div>
    );
  }

  if (section.kind === "summary") {
    const html = structuredHtml || String(data.text ?? "").trim();
    return html ? (
      <div className="print-stack">
        <RichBlock html={html} />
      </div>
    ) : null;
  }

  if (section.kind === "languages" || section.kind === "interests") {
    if (structuredHtml) {
      return (
        <div className="print-stack">
          <RichBlock html={structuredHtml} />
        </div>
      );
    }

    const text = Array.isArray(data.items)
      ? data.items.filter((item) => typeof item === "string" && stripHtmlMarkup(item).length > 0).join(", ")
      : "";

    return text ? (
      <div className="print-stack">
        <p className="print-line">{text}</p>
      </div>
    ) : null;
  }

  if (section.kind === "custom") {
    const html = structuredHtml || String(data.text ?? "").trim();
    return html ? (
      <div className="print-stack">
        <RichBlock html={html} />
      </div>
    ) : null;
  }

  if (!items.length) return null;

  return (
    <div className="print-stack">
      {items.map((item, index) => {
        const heading = joinRichSegments(
          [item.role, item.name, item.title, item.degree, item.company, item.school, item.organization, item.venue],
          " - "
        );
        const meta = [item.startDate, item.endDate, item.location, item.year]
          .filter((value) => typeof value === "string" && stripHtmlMarkup(String(value)).length > 0)
          .join(" | ");
        const description = String(item.description ?? "").trim();
        const details = String(item.details ?? "").trim();
        const bullets = Array.isArray(item.bullets)
          ? item.bullets.filter((bullet) => typeof bullet === "string" && stripHtmlMarkup(String(bullet)).length > 0)
          : [];

        if (!heading && !meta && !hasText(description) && !hasText(details) && !bullets.length) {
          return null;
        }

        return (
          <article key={`${section.id}-${index}`} className="print-item">
            {heading ? <RichLine html={heading} className="print-line print-item-heading" /> : null}
            {meta ? <p className="print-line print-item-meta">{meta}</p> : null}
            {hasText(description) ? <RichLine html={description} /> : null}
            {hasText(details) ? <RichLine html={details} /> : null}
            {bullets.map((bullet, bulletIndex) => (
              <p key={`${section.id}-${index}-${bulletIndex}`} className="print-line">
                {"• "}
                {String(bullet)}
              </p>
            ))}
          </article>
        );
      })}
    </div>
  );
}

export function ResumePrintView({ doc, template }: { doc: ResumeDocumentRecord; template?: ResumeTemplateRecord | null }) {
  const effectiveTemplate = resolveTemplateForDocument(doc, template);
  const dimensions = toA4Millimeters(doc.page.size);
  const marginBox = resolveDocumentMarginBox(doc, effectiveTemplate);
  const styles = resolveDocumentStyles(doc, effectiveTemplate);
  const regionMap = mapSectionsToRegions(doc, effectiveTemplate);
  const twoColumn = useTwoColumnLayout(effectiveTemplate);
  const regionOrder = effectiveTemplate.layout.regions.map((region) => region.region);

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }
        html, body {
          padding: 0;
          margin: 0;
          background: #e5e7eb;
        }
        body {
          -webkit-font-smoothing: antialiased;
        }
        .print-root {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
        }
        .print-page {
          width: ${dimensions.width};
          min-height: ${dimensions.height};
          background: ${styles.colors.background};
          color: ${styles.colors.text};
          font-family: ${styles.fonts.body};
          font-size: ${styles.sizes.body}px;
          line-height: ${styles.spacing.line};
          padding: ${marginBoxToCssPadding(marginBox)};
          box-sizing: border-box;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
        }
        .print-grid {
          display: grid;
          grid-template-columns: ${twoColumn ? effectiveTemplate.layout.grid.columns : "1fr"};
          grid-template-rows: ${effectiveTemplate.layout.grid.rows || "auto"};
          gap: ${effectiveTemplate.layout.grid.gap}px;
        }
        .print-region {
          display: grid;
          align-content: start;
        }
        .print-section {
          margin-bottom: ${Math.max(8, styles.spacing.section)}px;
        }
        .print-heading {
          font-size: ${styles.sizes.heading}px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${styles.colors.accent};
          margin: 0 0 6px 0;
          font-family: ${styles.fonts.heading};
        }
        .print-stack {
          display: grid;
          gap: ${Math.max(4, styles.spacing.item * 0.28)}px;
        }
        .print-item {
          display: grid;
          gap: ${Math.max(2, styles.spacing.item * 0.2)}px;
          margin-bottom: ${Math.max(6, styles.spacing.item * 0.72)}px;
        }
        .print-line {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .print-line span,
        .print-line strong,
        .print-line em,
        .print-line u,
        .print-line s,
        .print-line strike {
          white-space: inherit;
        }
        .print-rich-block > :first-child {
          margin-top: 0;
        }
        .print-rich-block > :last-child {
          margin-bottom: 0;
        }
        .print-rich-block p,
        .print-rich-block ul,
        .print-rich-block ol,
        .print-rich-block blockquote {
          margin: 0 0 ${Math.max(4, styles.spacing.item * 0.4)}px 0;
        }
        .print-rich-block ul,
        .print-rich-block ol {
          padding-left: 1.25rem;
        }
        .print-item-heading {
          font-weight: 600;
        }
        .print-item-meta,
        .print-header-meta {
          color: rgba(15, 23, 42, 0.72);
        }
        .print-header-name {
          margin: 0;
          font-size: ${styles.sizes.title}px;
          line-height: 1.1;
          font-weight: 700;
        }
        .print-header-headline {
          margin: 0;
          color: rgba(15, 23, 42, 0.76);
        }
        .print-separator {
          display: inline-block;
          padding: 0 0.35em;
          color: rgba(15, 23, 42, 0.48);
        }
        @media print {
          html, body {
            background: white;
          }
          .print-root {
            padding: 0;
          }
          .print-page {
            box-shadow: none;
            width: auto;
            min-height: auto;
          }
        }
      `}</style>
      <div className="print-root">
        <article className="print-page">
          <div className="print-grid">
            {regionOrder.map((regionName) => {
              const regionConfig = effectiveTemplate.layout.regions.find((entry) => entry.region === regionName);
              const sections = (regionMap.get(regionName) ?? []) as ResumeSectionBlock[];
              if (!regionConfig || !sections.length) return null;

              const isSidebar = regionName === "sidebar";
              const isHeaderOrFooter = regionName === "header" || regionName === "footer";

              return (
                <section
                  key={regionName}
                  className="print-region"
                  style={{
                    gridColumn: isHeaderOrFooter ? "1 / -1" : twoColumn && isSidebar ? "2 / 3" : "1 / 2",
                    gridTemplateColumns: regionConfig.columns,
                    gap: `${regionConfig.gap}px`
                  }}
                >
                  {sections.map((section) => {
                    const avoidSplit = effectiveTemplate.layout.pageBreak.avoidSplitKinds.includes(section.kind);
                    return (
                      <article
                        key={section.id}
                        className="print-section"
                        style={{ pageBreakInside: avoidSplit ? "avoid" : "auto", breakInside: avoidSplit ? "avoid" : "auto" }}
                      >
                        {section.kind !== "header" ? <h3 className="print-heading">{sectionTitle(section)}</h3> : null}
                        <ResumePrintSection section={section} />
                      </article>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </article>
      </div>
    </>
  );
}
