import {
  mapSectionsToRegions,
  resolveDocumentMarginBox,
  resolveDocumentStyles,
  resolveTemplateForDocument,
  sectionLines,
  sectionTitle,
  toA4Millimeters,
  useTwoColumnLayout
} from "@/lib/resume-studio/layout";
import { marginBoxToCssPadding } from "@/lib/resume-studio/normalize";
import type { ResumeDocumentRecord, ResumeSectionBlock, ResumeTemplateRecord } from "@/types/resume-studio";

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
        .print-line {
          margin: 0 0 4px 0;
          white-space: pre-wrap;
          word-break: break-word;
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
                        <div>
                          {sectionLines(section).map((line, index) => (
                            <p key={`${section.id}-${index}`} className="print-line">
                              {line || "\u00a0"}
                            </p>
                          ))}
                        </div>
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
