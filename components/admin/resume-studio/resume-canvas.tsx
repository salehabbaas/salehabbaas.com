"use client";

import { useMemo } from "react";

import {
  mapSectionsToRegions,
  resolveDocumentMarginBox,
  resolveDocumentStyles,
  resolveTemplateForDocument,
  sectionLines,
  sectionTitle,
  toA4Pixels,
  useTwoColumnLayout
} from "@/lib/resume-studio/layout";
import { marginBoxToCssPadding } from "@/lib/resume-studio/normalize";
import { cn } from "@/lib/utils";
import type { ResumeDocumentRecord, ResumeSectionBlock, ResumeTemplateRecord } from "@/types/resume-studio";

export function ResumeCanvas({ doc, template, zoom = 1 }: { doc: ResumeDocumentRecord; template?: ResumeTemplateRecord; zoom?: number }) {
  const effectiveTemplate = useMemo(() => resolveTemplateForDocument(doc, template), [doc, template]);
  const { width, height } = toA4Pixels(doc.page.size);
  const twoColumn = useTwoColumnLayout(effectiveTemplate);
  const marginBox = resolveDocumentMarginBox(doc, effectiveTemplate);
  const styles = resolveDocumentStyles(doc, effectiveTemplate);

  const regionMap = useMemo(() => {
    return mapSectionsToRegions(doc, effectiveTemplate);
  }, [doc, effectiveTemplate]);
  const regionOrder = effectiveTemplate.layout.regions.map((region) => region.region);

  return (
    <div className="overflow-auto rounded-3xl border border-border/70 bg-muted/20 p-4">
      <div className="mx-auto origin-top" style={{ width, transform: `scale(${zoom})`, transformOrigin: "top center" }}>
        <article
          className="rounded-2xl border border-border/70 bg-white shadow-elev3"
          style={{
            minHeight: height,
            padding: marginBoxToCssPadding(marginBox),
            color: styles.colors.text,
            background: styles.colors.background,
            fontFamily: styles.fonts.body,
            lineHeight: styles.spacing.line,
            fontSize: `${styles.sizes.body}px`
          }}
        >
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
              const sections = (regionMap.get(regionName) ?? []) as ResumeSectionBlock[];
              if (!regionConfig || !sections.length) return null;

              const isSidebar = regionName === "sidebar";
              const isHeaderOrFooter = regionName === "header" || regionName === "footer";

              return (
                <section
                  key={regionName}
                  className={cn("grid content-start")}
                  style={{
                    gridColumn: isHeaderOrFooter ? "1 / -1" : twoColumn && isSidebar ? "2 / 3" : "1 / 2",
                    gridTemplateColumns: regionConfig.columns,
                    gap: regionConfig.gap
                  }}
                >
                  {sections.map((section) => {
                    const avoidSplit = effectiveTemplate.layout.pageBreak.avoidSplitKinds.includes(section.kind);
                    return (
                      <article
                        key={section.id}
                        style={{
                          breakInside: avoidSplit ? "avoid" : "auto",
                          marginBottom: styles.spacing.section
                        }}
                      >
                        {section.kind !== "header" ? (
                          <h3
                            className="mb-1 uppercase tracking-[0.16em]"
                            style={{
                              color: styles.colors.accent,
                              fontSize: styles.sizes.heading,
                              fontFamily: styles.fonts.heading,
                              fontWeight: 700
                            }}
                          >
                            {sectionTitle(section)}
                          </h3>
                        ) : null}
                        <div className="space-y-1">
                          {sectionLines(section).map((line, index) => (
                            <p key={`${section.id}-${index}`} className="whitespace-pre-wrap break-words" style={{ marginBottom: styles.spacing.item * 0.18 }}>
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
    </div>
  );
}
