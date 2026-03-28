import type { ResumeDocumentRecord, ResumeSectionBlock } from "@/types/resume-studio";
import {
  legacyHtmlToPlainText,
  resumeRichTextDocToHtml,
  resumeRichTextDocToPlainText,
  sectionDataToLegacyHtml,
  sectionDataToResumeRichTextDoc
} from "@/lib/resume-studio/editor-v2/content";

export type ResumeSectionMigrationReport = {
  sectionId: string;
  sectionKind: ResumeSectionBlock["kind"];
  beforeText: string;
  afterText: string;
  beforeBulletCount: number;
  afterBulletCount: number;
  beforeLinkCount: number;
  afterLinkCount: number;
  textChanged: boolean;
  bulletCountChanged: boolean;
  linkCountChanged: boolean;
};

export type ResumeDocumentMigrationReport = {
  docId: string;
  sectionOrderStable: boolean;
  changedSectionCount: number;
  sections: ResumeSectionMigrationReport[];
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function countBullets(value: string) {
  return (value.match(/(^|\n)\s*(?:[-*•]|\d+[.)])\s+/g) ?? []).length;
}

function countLinks(value: string) {
  return (value.match(/<a\b/gi) ?? []).length;
}

function legacySectionHtml(section: ResumeSectionBlock) {
  return (section.contentHtmlLegacy ?? sectionDataToLegacyHtml(section)).trim();
}

function structuredSectionText(section: ResumeSectionBlock) {
  const doc = section.contentDoc ?? sectionDataToResumeRichTextDoc(section);
  return normalizeWhitespace(resumeRichTextDocToPlainText(doc));
}

function structuredSectionHtml(section: ResumeSectionBlock) {
  const doc = section.contentDoc ?? sectionDataToResumeRichTextDoc(section);
  return resumeRichTextDocToHtml(doc);
}

function legacySectionText(section: ResumeSectionBlock) {
  return normalizeWhitespace(legacyHtmlToPlainText(legacySectionHtml(section)));
}

export function compareResumeSectionMigration(section: ResumeSectionBlock): ResumeSectionMigrationReport {
  const beforeHtml = legacySectionHtml(section);
  const beforeText = legacySectionText(section);
  const afterText = structuredSectionText(section);
  const afterHtml = structuredSectionHtml(section);

  const beforeBulletCount = countBullets(beforeText);
  const afterBulletCount = countBullets(afterText);
  const beforeLinkCount = countLinks(beforeHtml);
  const afterLinkCount = countLinks(afterHtml);

  return {
    sectionId: section.id,
    sectionKind: section.kind,
    beforeText,
    afterText,
    beforeBulletCount,
    afterBulletCount,
    beforeLinkCount,
    afterLinkCount,
    textChanged: beforeText !== afterText,
    bulletCountChanged: beforeBulletCount !== afterBulletCount,
    linkCountChanged: beforeLinkCount !== afterLinkCount
  };
}

export function compareResumeDocumentMigration(
  doc: Pick<ResumeDocumentRecord, "id" | "sections">
): ResumeDocumentMigrationReport {
  const sections = doc.sections.map((section) => compareResumeSectionMigration(section));

  return {
    docId: doc.id,
    sectionOrderStable: true,
    changedSectionCount: sections.filter(
      (section) => section.textChanged || section.bulletCountChanged || section.linkCountChanged
    ).length,
    sections
  };
}
