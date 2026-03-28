import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultResumeDocument } from "../../lib/resume-studio/defaults";
import {
  countResumeRichTextMatches,
  extractResumeRichTextOutline,
  replaceInResumeRichTextDoc
} from "../../lib/resume-studio/editor-v2/content";
import { compareResumeDocumentMigration } from "../../lib/resume-studio/editor-v2/migration";
import { normalizeResumeDocumentRecord, toPersistedResumeSnapshot } from "../../lib/resume-studio/normalize";
import { resumeToPlainText } from "../../lib/resume-studio/text";

test("normalizeResumeDocumentRecord derives structured section content for legacy documents", () => {
  const doc = normalizeResumeDocumentRecord({
    id: "legacy-doc",
    data: {
      ownerId: "owner-1",
      schemaVersion: 2,
      type: "resume",
      title: "Legacy Resume",
      templateId: "classic-single-column",
      page: {
        margins: 22,
        sectionSpacing: 14
      },
      style: {
        primaryColor: "#0f172a",
        fontFamily: "Arimo",
        fontScale: 1,
        lineHeight: 1.4
      },
      language: {
        mode: "auto"
      },
      sections: [
        {
          id: "summary-1",
          kind: "summary",
          data: {
            text: "<strong>Built</strong> resilient internal tooling."
          }
        }
      ]
    }
  });

  assert.equal(doc.editorModelVersion, 1);
  assert.equal(doc.editorEngine, "legacy");
  assert.equal(doc.contentFormat, "section-data");
  assert.equal(doc.sections[0]?.contentDoc?.type, "doc");
  assert.equal(doc.sections[0]?.contentHtmlLegacy, "<p><strong>Built</strong> resilient internal tooling.</p>");
});

test("toPersistedResumeSnapshot promotes documents to pm-json metadata and dual section content", () => {
  const payload = createDefaultResumeDocument({
    ownerId: "owner-1",
    title: "Resume Snapshot"
  });

  const summary = payload.sections.find((section) => section.kind === "summary");
  if (!summary) throw new Error("Expected summary section");
  summary.data = {
    text: "<strong>Scaled</strong> platform delivery across multiple teams."
  };

  const persisted = toPersistedResumeSnapshot(payload);
  const persistedSummary = persisted.sections.find((section) => section.kind === "summary");

  assert.equal(persisted.editorModelVersion, 2);
  assert.equal(persisted.editorEngine, "tiptap");
  assert.equal(persisted.contentFormat, "pm-json");
  assert.ok(persistedSummary?.contentDoc);
  assert.equal(persistedSummary?.contentHtmlLegacy, "<p><strong>Scaled</strong> platform delivery across multiple teams.</p>");
});

test("resumeToPlainText reads structured content when section data is empty", () => {
  const plainText = resumeToPlainText({
    title: "Structured Only",
    sections: [
      {
        id: "summary-structured",
        kind: "summary",
        data: {},
        contentDoc: {
          type: "doc",
          content: [
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Led a zero-downtime migration." }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  });

  assert.match(plainText, /Led a zero-downtime migration/);
});

test("replaceInResumeRichTextDoc replaces text across paragraphs and lists", () => {
  const doc = {
    type: "doc" as const,
    content: [
      {
        type: "paragraph" as const,
        content: [{ type: "text" as const, text: "Resume Studio makes editing faster." }]
      },
      {
        type: "bulletList" as const,
        content: [
          {
            type: "listItem" as const,
            content: [
              {
                type: "paragraph" as const,
                content: [{ type: "text" as const, text: "Resume imports stay safe." }]
              }
            ]
          }
        ]
      }
    ]
  };

  const next = replaceInResumeRichTextDoc(doc, "Resume", "Profile");
  assert.equal(next.replacements, 2);
  assert.equal(countResumeRichTextMatches(next.doc, "Profile"), 2);
});

test("extractResumeRichTextOutline returns heading structure", () => {
  const outline = extractResumeRichTextOutline({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Experience" }]
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Projects" }]
      }
    ]
  });

  assert.deepEqual(
    outline.map((entry) => ({ level: entry.level, text: entry.text })),
    [
      { level: 2, text: "Experience" },
      { level: 3, text: "Projects" }
    ]
  );
});

test("compareResumeDocumentMigration reports section text stability", () => {
  const doc = normalizeResumeDocumentRecord({
    id: "migration-doc",
    data: {
      ownerId: "owner-1",
      schemaVersion: 2,
      type: "resume",
      title: "Migration Resume",
      templateId: "classic-single-column",
      page: {
        margins: 22,
        sectionSpacing: 14
      },
      style: {
        primaryColor: "#0f172a",
        fontFamily: "Arimo",
        fontScale: 1,
        lineHeight: 1.4
      },
      language: {
        mode: "auto"
      },
      sections: [
        {
          id: "summary-1",
          kind: "summary",
          data: {
            text: "<p>Built resilient tooling and reduced incidents.</p>"
          }
        }
      ]
    }
  });

  const report = compareResumeDocumentMigration(doc);
  assert.equal(report.sectionOrderStable, true);
  assert.equal(report.sections.length, 1);
  assert.equal(report.sections[0]?.textChanged, false);
});
