# Resume Studio Update Plan

## Goal

Rebuild the Resume Studio editor layer from the ground up so it supports advanced, structured, Google-Docs-level text authoring while still fitting your current Resume Studio architecture:

- Next.js App Router admin module
- Firebase Auth + Firestore + Storage
- Admin-only access and runtime flags
- Real-time document editing
- Resume-safe, print-safe rendering
- ATS-aware content structure
- AI-assisted rewriting and proofreading
- Reliable export to PDF / HTML / Markdown / DOCX

This plan is designed specifically for your existing system, not as a generic editor integration.

---

## Executive Summary

Your current issue is not just “styling text.” The root problem is that Resume Studio currently mixes:

- section-based resume semantics
- inline rich HTML editing
- contentEditable-driven formatting
- print/export rendering constraints
- sanitization requirements
- ATS requirements
- live autosave and history

That combination becomes fragile when you try to scale formatting features.

The correct upgrade is to replace the current contentEditable-centric rich text layer with a **structured editor engine** built on a **schema-first document model**. The best implementation path is:

1. Keep your existing high-level Resume Studio records and workflows.
2. Replace section content internals with a **typed document AST** instead of raw/sanitized HTML as the primary source of truth.
3. Build a custom editor stack around:
   - **Tiptap / ProseMirror** for structured editing, commands, plugins, keyboard shortcuts, collaboration extensibility
   - a **resume-specific schema**
   - a **page/layout engine** for print-safe resume rendering
   - **strict sanitization and import pipelines**
4. Add a clear separation between:
   - editing model
   - rendering model
   - export model
   - ATS extraction model

This avoids the current long-term instability caused by trying to force advanced word-processor behavior into low-level contentEditable logic.

---

## Recommended Architecture Decision

## Use This Stack

### Editor engine
- **Tiptap (ProseMirror-based)** as the rich-text core

### Why
Tiptap gives you:
- strong schema control
- mature formatting commands
- custom nodes/marks
- tables, links, lists, code, headings
- collaboration support potential
- Markdown interoperability options
- safer extensibility than raw contentEditable
- much better selection/state/plugin handling than hand-rolled DOM editing

### Do not build from scratch at the DOM level
You asked to “build everything from scratch inside this system.” The right interpretation is:

- build your **own editor module and resume schema inside your app**
- do **not** depend on generic WYSIWYG behavior as your business model
- but **do** use a proven editing engine instead of reinventing selection, ranges, IME handling, composition events, clipboard behavior, browser inconsistencies, tables, and keyboard shortcuts from zero

Building a full Google-Docs-like editor literally from scratch at DOM level is high-risk, slow, and extremely expensive to maintain.

---

## Core Product Direction

## Target End State

Resume Studio v2 should have **three distinct layers**:

### 1. Resume Domain Layer
This is your current business object model:
- ResumeDocumentRecord
- ATS metadata
- template links
- job links
- versions
- exports
- activity logs

This layer stays.

### 2. Structured Content Layer
Replace section freeform HTML with structured editor JSON:
- ProseMirror/Tiptap JSON document
- resume-safe block and inline nodes
- explicit formatting marks
- table/media/link structures
- document metadata per section

This becomes the canonical editing source.

### 3. Render / Export Layer
Transform structured content into:
- editable UI
- print HTML
- PDF renderer
- DOCX renderer
- Markdown export
- ATS plain-text extraction

This layer should never depend on raw pasted HTML as truth.

---

## Main Design Principle

A resume is **not** a general word-processing document.

It is a **structured professional document with layout, semantic sections, and constrained formatting**.

So your editor should be **Google Docs inspired**, but **resume optimized**.

That means:

- support advanced formatting
- prevent layout chaos
- keep templates consistent
- protect ATS readability
- preserve export fidelity
- support strong page rules

---

## What To Build

# Phase 1 — Foundation Refactor

## 1. Introduce a new content model

Replace HTML-first editable content with a typed JSON document.

### Proposed shape

```ts
type ResumeRichTextDoc = {
  type: "doc"
  content: ResumeNode[]
}

type ResumeNode =
  | ParagraphNode
  | HeadingNode
  | BulletListNode
  | OrderedListNode
  | ListItemNode
  | ChecklistNode
  | BlockquoteNode
  | CodeBlockNode
  | HorizontalRuleNode
  | TableNode
  | ImageNode
  | PageBreakNode
  | ColumnsNode

type ResumeInline =
  | TextNode
  | LinkNode
  | MentionNode
  | EmojiNode
  | FootnoteRefNode
```

### Text marks
```ts
type TextMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "strike" }
  | { type: "superscript" }
  | { type: "subscript" }
  | { type: "code" }
  | { type: "highlight"; color: string }
  | { type: "textColor"; color: string }
  | { type: "fontFamily"; value: string }
  | { type: "fontSize"; value: string }
```

### Block attributes
Each block should support attributes like:
- textAlign
- lineHeight
- spacingBefore
- spacingAfter
- indentLevel
- firstLineIndent
- hangingIndent
- direction
- language
- keepWithNext
- pageBreakBefore
- columnSpan (where relevant)

---

## 2. Add editor compatibility versioning

You already have document versions, but add a content engine version:

```ts
editorModelVersion: 2
editorEngine: "tiptap"
contentFormat: "pm-json"
```

This is critical for migration, fallbacks, and future upgrades.

---

## 3. Preserve section-based resume architecture

Do not remove sections. Instead, each section gets structured content.

### Example
```ts
type ResumeSection = {
  id: string
  type: "summary" | "experience" | "education" | "skills" | "projects" | "custom"
  title: string
  visible: boolean
  order: number
  contentDoc: ResumeRichTextDoc
  layout?: {
    styleVariant?: string
    columns?: 1 | 2
    keepTogether?: boolean
  }
}
```

This keeps ATS logic, template mapping, and domain-specific resume workflows intact.

---

# Phase 2 — Editor Engine Build

## 4. Create a dedicated editor package inside your app

Create a local module such as:

```text
src/features/resume-studio/editor-v2/
  core/
  schema/
  commands/
  plugins/
  toolbar/
  import/
  export/
  collaboration/
  utils/
```

## Suggested structure

```text
editor-v2/
  core/
    editor-instance.ts
    editor-state.ts
    editor-events.ts
    selection.ts
    shortcuts.ts
  schema/
    nodes.ts
    marks.ts
    extensions.ts
    allowed-tags.ts
  commands/
    formatting.ts
    paragraph.ts
    lists.ts
    tables.ts
    media.ts
    page-layout.ts
    history.ts
  plugins/
    paste-sanitizer.ts
    markdown-shortcuts.ts
    spellcheck.ts
    grammar.ts
    outline.ts
    word-count.ts
    search-replace.ts
    change-tracking.ts
  toolbar/
    top-toolbar.tsx
    floating-toolbar.tsx
    side-panel.tsx
    style-controls.tsx
    table-controls.tsx
    media-controls.tsx
  import/
    html-import.ts
    markdown-import.ts
    docx-import.ts
    legacy-html-migration.ts
  export/
    to-html.ts
    to-markdown.ts
    to-docx.ts
    to-pdf-model.ts
    to-ats-text.ts
  collaboration/
    comments.ts
    suggestions.ts
    cursors.ts
```

---

## 5. Build a resume-specific schema, not a generic office schema

Support all requested features, but constrain them based on resume rules.

### Inline formatting to support
- Bold
- Italic
- Underline
- Strikethrough
- Superscript
- Subscript
- Inline code
- Clear formatting
- Highlight
- Text color
- Font family
- Font size

### Paragraph formatting
- Left / Center / Right / Justify
- Line spacing presets + custom
- Paragraph spacing before/after
- Increase/decrease indent
- First line indent
- Hanging indent

### Lists
- Bullet list
- Ordered list
- Nested lists
- Checklist
- Decimal / Roman / Alphabetic numbering

### Block structure
- Paragraph
- Heading 1–6
- Blockquote
- Code block
- Divider / rule
- Page break
- Columns
- Table of contents placeholder
- Header/footer placeholders

### Insert elements
- Link
- Image
- Table
- Emoji
- Bookmark
- Footnote
- Comment anchor
- Tag / label
- Mention (admin-only, optional)
- File attachment placeholder
- Video placeholder only if you truly need it in editor mode

### Important constraint
For resumes, I recommend:
- **Image: yes**
- **Table: yes, but limited**
- **Video: no in final resume output**
- **File attachment: no in final resume output**
- **Mentions/comments: collaboration only, not export**
- **Bookmarks/footnotes: optional**
- **Tag/label: internal only**

Do not let non-resume media features degrade print/export reliability.

---

## 6. Replace floating toolbar with a command system

Your current toolbar logic is selection-based and DOM-driven.

Refactor to:
- editor command bus
- toolbar state derived from editor state
- command availability based on selection + node type

### Command categories
- Inline commands
- Paragraph commands
- List commands
- Table commands
- Media commands
- Layout commands
- Comment/review commands
- Search/replace commands
- History commands

This gives you consistent behavior across:
- top toolbar
- floating selection toolbar
- keyboard shortcuts
- context menus
- slash commands

---

# Phase 3 — Resume Layout & Page Engine

## 7. Build a page-aware resume canvas

Google Docs style editing alone is not enough. You need **page-aware resume rendering**.

### Required page features
- Page size
- Margins
- Header/footer zones
- Page breaks
- Columns
- Page numbers
- section keep-together rules
- widow/orphan prevention where possible

### Important implementation detail
Use two views:

#### Editing View
- optimized for fast editing
- section-aware
- not pixel-perfect paginated at every keystroke

#### Print Layout View
- page-aware preview
- accurate pagination
- export source of truth

Trying to maintain perfect pagination during every keystroke will make the UX fragile and expensive.

---

## 8. Build a design token system for resumes

You said you want to “reshape and build the resume with best settings and tools and shape.”

That means you need a real style system.

### Create template style tokens
```ts
type ResumeTheme = {
  typography: {
    bodyFont: string
    headingFont: string
    monoFont: string
    baseFontSize: number
    headingScale: Record<string, number>
    lineHeights: Record<string, number>
  }
  colors: {
    text: string
    muted: string
    accent: string
    border: string
    background: string
    highlight: string
  }
  spacing: {
    sectionGap: number
    paragraphGap: number
    listGap: number
    pagePaddingTop: number
    pagePaddingBottom: number
    pagePaddingX: number
  }
  borders: {
    dividerWidth: number
    dividerStyle: string
    radius: number
  }
}
```

### Separate
- content formatting
- template styling
- page styling

Users can change formatting without breaking the global template.

---

## 9. Add layout guardrails

Because this is a resume system, apply constraints like:
- max heading levels in resume mode
- preferred font families only
- safe font-size range
- table restrictions
- image size limits
- page overflow warnings
- ATS-risk warnings for excessive styling
- warning for multi-column sections that hurt ATS

This is where Resume Studio becomes stronger than generic editors.

---

# Phase 4 — Import / Paste / Sanitization

## 10. Build a strict import pipeline

You asked for HTML sanitization and allowed tags.

Correct approach:
- never trust pasted/imported HTML
- parse into a safe intermediate representation
- map into your schema
- drop unsupported nodes/attributes
- normalize styles to allowed marks/attrs
- preserve semantic meaning where possible

## Supported imports
- HTML
- Markdown
- DOCX
- legacy internal HTML
- plain text
- PDF-extracted normalized content

## Import pipeline
```text
input
→ detect type
→ parse
→ sanitize
→ normalize styles
→ map to schema
→ validate
→ save as structured content
```

---

## 11. Add explicit allowed tag/style policy

Example allowed HTML tags for import:
- p
- br
- strong
- em
- u
- s
- sup
- sub
- code
- pre
- h1-h6
- ul
- ol
- li
- blockquote
- hr
- a
- table
- thead
- tbody
- tr
- th
- td
- img
- span (only if style mapping is allowed)
- div (only as block wrapper during import)

Allowed styles should be mapped, not retained raw:
- font-weight
- font-style
- text-decoration
- color
- background-color
- text-align
- font-size
- font-family
- line-height
- margin-top / margin-bottom
- padding only where table cells need it

Everything else should be stripped.

---

## 12. Implement paste modes

Support:
- normal paste
- paste without formatting
- paste from Word / Google Docs / web pages
- paste as plain text shortcut

Required behavior:
- detect Office HTML junk
- normalize nested spans
- flatten invalid markup
- preserve lists/tables/links when safe
- remove unsupported attributes and scripts

---

# Phase 5 — Advanced Editing & Productivity

## 13. Add full editing productivity features

### Required
- Undo / redo
- Copy / cut / paste
- Paste without formatting
- Drag & drop
- Select all
- Keyboard shortcuts
- Search / replace
- Word count
- Character count
- Outline view
- TOC generation
- Page navigation

### Best implementation approach
Use editor plugins for:
- search/replace
- word count
- outline extraction
- keyboard map
- drag handle / block move
- clipboard pipeline

---

## 14. Add Markdown support

Support:
- Markdown import
- Markdown paste shortcuts
- optional Markdown export

Recommended:
- don’t make Markdown the canonical source of truth
- use structured JSON as the canonical model
- convert Markdown in/out

---

## 15. Add language and direction controls

You explicitly need international support.

### Support
- RTL / LTR at block and document level
- language tag per document
- language tag per block if needed
- browser spellcheck
- AI grammar suggestions
- localized typography defaults
- mixed-direction rendering support

### Important
Resume Studio should support:
- English resumes
- Arabic resumes
- bilingual mixed-content resumes

This is a major reason not to rely on hand-built contentEditable behavior.

---

# Phase 6 — Collaboration Layer

## 16. Collaboration features roadmap

Google Docs level collaboration requires careful staging.

### Phase 6A
- Comments
- Anchored comments
- Comment threads
- Version history
- Manual version snapshots
- Change highlighting per save

### Phase 6B
- Suggestions / track changes
- Accept / reject changes
- diff view

### Phase 6C
- Real-time multi-user editing
- user cursors
- conflict resolution
- presence states

### Recommendation
Do not build live multi-user editing in the first release unless this is essential now.

Start with:
- comments
- snapshots
- change review
- explicit edit locks or single-editor mode

Then later add Yjs/Hocuspocus or equivalent collaboration layer if needed.

---

# Phase 7 — Export / Print / ATS

## 17. Export architecture redesign

Do not export directly from editor DOM.

Export from structured content.

### Required outputs
- HTML
- Markdown
- PDF
- DOCX

### Recommended flow
```text
structured content
→ normalized render model
→ html renderer
→ pdf renderer
→ docx renderer
→ markdown serializer
→ ats plain text serializer
```

This gives much higher consistency.

---

## 18. DOCX support

You explicitly want DOCX import/export.

### Recommendation
- Import DOCX via conversion pipeline into schema
- Export DOCX via structured generator
- do not attempt perfect 1:1 arbitrary DOCX fidelity
- optimize for professional resume output instead

### Practical libraries
- DOCX parsing library / mammoth-like import approach
- `docx` library for export generation

---

## 19. ATS-safe serialization

ATS should not parse visual layout only.

Create a dedicated serializer:
- flatten sections in reading order
- preserve headings
- preserve bullet semantics
- preserve links as text where needed
- remove print-only decoration
- flag content hidden by styling or layout tricks

This becomes the source for ATS scoring and AI tailoring validation.

---

# Phase 8 — Migration Strategy

## 20. Migrate existing documents safely

You already have production data. Migration must be staged.

## Step 1 — Add dual content support
For each section support:
- `contentHtmlLegacy?: string`
- `contentDoc?: ResumeRichTextDoc`

## Step 2 — Build migration converter
Convert legacy HTML into structured content.

## Step 3 — Validate migration
For each migrated document:
- compare extracted text before/after
- compare link counts
- compare bullet counts
- compare section ordering
- run PDF preview comparison
- run ATS text comparison

## Step 4 — Soft-launch
- feature flag editor-v2
- open old docs in read-only fallback if migration fails
- allow per-document upgrade

## Step 5 — full migration
Once stable:
- re-save upgraded docs
- keep legacy backup snapshots
- eventually deprecate HTML source

---

# Phase 9 — Security, Validation, and Trust

## 21. Security requirements

Because users can import and paste content, implement:

- XSS filtering
- HTML sanitization
- strict tag allowlist
- strict attribute allowlist
- URL validation for links/media
- storage scanning rules where possible
- file type restrictions
- image MIME validation
- safe iframe policy (prefer none)
- no executable embeds

### Resume-specific rule
PDF/print/export should never render unsafe HTML from user content.

---

## 22. Truthfulness and AI safety

Your system already has AI truthfulness validation. Extend it to the new editor model.

### Add checks for AI-generated edits
- detect fabricated dates / employers / skills
- compare rewritten content against original source blocks
- mark uncertain changes
- show diff preview before apply
- persist provenance of AI changes

AI output should map directly into the structured content model, not raw HTML blobs.

---

# What Features Should Be In v1 vs Later

## Must-have in v1
- Bold / italic / underline / strike
- Superscript / subscript
- Highlight / text color
- Font family / font size
- Alignment
- Line spacing / paragraph spacing
- Indentation / first-line / hanging
- Bullet / numbered / nested lists
- Headings / paragraph / blockquote / code / divider
- Hyperlink
- Image
- Table
- Undo / redo
- Search / replace
- Word count / character count
- RTL / LTR
- Spellcheck
- HTML sanitization
- Import HTML / Markdown / DOCX
- Export HTML / Markdown / PDF / DOCX
- Page breaks
- Headers / footers
- Page margins
- Page numbers

## Should be v1.5 or v2
- Comments
- Suggestions / track changes
- Version diff view
- Outline view
- TOC
- checklist
- bookmarks
- footnotes
- columns
- advanced table controls
- template-level page layout editor

## Later / optional
- Multi-user editing
- User cursors
- Video
- File attachment embedding
- mentions
- tags in document body

---

# UI / UX Recommendation

## Build these surfaces

### 1. Top formatting toolbar
Groups:
- clipboard
- undo/redo
- text style
- paragraph
- lists
- insert
- table
- layout
- review

### 2. Floating selection toolbar
Show only for inline text selection:
- bold
- italic
- underline
- text color
- highlight
- link
- clear formatting

### 3. Right sidebar inspector
Panels:
- text styles
- paragraph styles
- section layout
- page settings
- template settings
- ATS warnings
- comments/history

### 4. Left navigator
- sections
- outline
- pages
- comments

This is much more scalable than packing everything into one floating toolbar.

---

# Firestore / Persistence Changes

## Suggested data additions

```ts
type ResumeDocumentRecordV2 = {
  id: string
  ownerId: string
  title: string
  status: "draft" | "ready" | "archived"
  editorModelVersion: 2
  editorEngine: "tiptap"
  contentFormat: "pm-json"
  pageSettings: {
    size: "A4" | "Letter"
    margins: { top: number; right: number; bottom: number; left: number }
    header?: { enabled: boolean; contentDoc?: any }
    footer?: { enabled: boolean; contentDoc?: any }
    pageNumbers?: { enabled: boolean; format: string; position: "left" | "center" | "right" }
    columns?: number
  }
  styleSettings: {
    themeId?: string
    themeOverrides?: Record<string, unknown>
  }
  languageMode: {
    defaultLanguage: string
    defaultDirection: "ltr" | "rtl"
  }
  sections: ResumeSection[]
  atsMetadata?: Record<string, unknown>
  linkedJobId?: string | null
  linkedTemplateId?: string | null
  createdAt: string
  updatedAt: string
}
```

---

# Deployment Plan

## Stage 0 — Preparation
- create `editor-v2` feature flag
- keep old editor intact
- define schema and persistence contracts
- create migration test fixtures from real resumes

## Stage 1 — Build editor core
- install and configure Tiptap / ProseMirror
- build schema
- build command layer
- build toolbar + inspector
- build JSON serialization
- support autosave and undo/redo integration

## Stage 2 — Import / sanitize / migrate
- implement HTML import
- implement Markdown import
- implement DOCX import
- implement legacy HTML migration
- create migration validator

## Stage 3 — Rendering / print
- create new print renderer from structured content
- add page settings, headers/footers, margins, page numbers
- verify PDF parity with current system
- update export route to prefer v2 pipeline

## Stage 4 — ATS / AI integration
- update ATS serializer
- update quality scan extraction
- update improve route to work against structured nodes
- update cover letter/tailoring flows

## Stage 5 — Controlled rollout
- admin-only internal rollout
- migrate a subset of documents
- compare output quality, ATS score, print fidelity, save stability
- collect issues

## Stage 6 — Full migration
- bulk migrate
- keep rollback path
- default all new documents to v2
- deprecate legacy editor after stability period

---

# Risks and Mitigations

## Risk 1: Export fidelity regressions
Mitigation:
- golden-file PDF tests
- HTML snapshot tests
- print comparison harness

## Risk 2: Legacy document migration breaks formatting
Mitigation:
- dual-source storage during migration
- per-document rollback
- migration audit reports

## Risk 3: Editor becomes too generic and harms resume quality
Mitigation:
- resume-safe schema restrictions
- ATS warnings
- template guardrails

## Risk 4: Autosave conflicts with rich editor transactions
Mitigation:
- transaction batching
- dirty-state tracking
- save queue
- optimistic UI with conflict protection

## Risk 5: Complex tables/media destroy print layout
Mitigation:
- strict table/media limits in resume mode
- page overflow warnings
- print-layout validation

## Risk 6: Multi-language support breaks selection and layout
Mitigation:
- use mature editor engine
- test Arabic + English mixed documents early

---

# Success Criteria

The project is successful when:

- formatting is stable and predictable
- inline styling no longer breaks during editing
- pasted content is clean and safe
- resume templates stay visually consistent
- PDF export closely matches editor preview
- ATS extraction remains reliable
- migration from current documents is safe
- future features like comments and track changes become feasible

---

# Implementation Prompt For Codex / Cursor / GPT

Use the following prompt to start the build.

---

## Prompt

You are a senior staff engineer working inside an existing Next.js App Router + Firebase admin product called Resume Studio.

Your task is to design and implement **Resume Studio Editor v2**, a new structured rich-text editing system for resumes and cover letters.

### Existing product context
- Resume Studio is an admin-only resume authoring module.
- It already supports dashboard management, templates, ATS scoring, AI improvement flows, PDF export, job-linked tailoring, import parsing, version history, and autosave.
- Current rich text editing is based on contentEditable and sanitized HTML, but it is becoming too fragile for advanced styling and layout needs.
- We need a new editor architecture that is robust, extensible, print-safe, ATS-safe, and migration-friendly.

### Technical environment
- Next.js App Router
- TypeScript
- React
- Firebase Auth
- Firestore
- Firebase Storage
- Existing admin/server validation and feature flags
- Existing ResumeDocumentRecord and section-based data model
- Existing PDF export pipeline and print view
- Existing ATS and AI routes

### Required architecture decision
Use **Tiptap / ProseMirror** as the editing engine, but build the entire Resume Studio Editor v2 module inside the product as a custom feature with a resume-specific schema and command system.

Do not build low-level DOM editing from scratch.
Do not rely on raw HTML as the canonical editing source.
Use **structured ProseMirror/Tiptap JSON** as the canonical document content model.

### Core requirements
Build a new `editor-v2` module with:

1. Structured rich text schema
   - paragraph
   - heading 1–6
   - blockquote
   - code block
   - horizontal rule
   - bullet list
   - ordered list
   - nested list
   - checklist
   - table
   - image
   - page break
   - optional columns container
   - inline text, link, emoji, mention placeholder, footnote placeholder

2. Inline formatting marks
   - bold
   - italic
   - underline
   - strikethrough
   - superscript
   - subscript
   - inline code
   - text color
   - highlight/background color
   - font family
   - font size
   - clear formatting

3. Paragraph formatting
   - left / center / right / justify
   - line spacing presets and custom values
   - paragraph spacing before/after
   - increase/decrease indent
   - first-line indent
   - hanging indent
   - LTR / RTL direction
   - language tag support

4. Editing features
   - undo / redo
   - copy / cut / paste
   - paste without formatting
   - drag and drop block reordering
   - keyboard shortcuts
   - search / replace
   - word count
   - character count
   - outline extraction

5. Page/layout support
   - page size
   - page margins
   - headers
   - footers
   - page numbers
   - page breaks
   - optional columns
   - print layout preview

6. Import/export
   - import HTML
   - import Markdown
   - import DOCX
   - migrate legacy HTML content into the new schema
   - export HTML
   - export Markdown
   - export DOCX
   - export PDF through a structured render pipeline

7. Security
   - strict sanitization pipeline
   - allowed tags allowlist
   - safe URL validation
   - XSS protection
   - safe HTML import mapping into schema
   - raw pasted HTML must never become the canonical stored format

8. Resume-specific constraints
   - keep the existing section-based resume model
   - each section should store structured content JSON instead of raw HTML
   - preserve ATS-safe reading order
   - add resume-safe guardrails for fonts, tables, image size, layout complexity, and ATS risk warnings

9. Data compatibility
   - support `editorModelVersion`
   - support dual read/write during migration
   - keep legacy HTML fallback until migration is complete
   - create migration helpers that compare plain text before/after conversion

10. Product integration
   - keep admin-only auth checks and feature flags
   - integrate with Firestore autosave
   - integrate with existing version history
   - integrate with ATS serializer
   - integrate with AI quality and improvement routes
   - integrate with template system
   - integrate with PDF export route

### What to generate
Produce a complete implementation plan and code scaffolding for the following:

1. File/folder architecture for `editor-v2`
2. Tiptap extension/schema definitions
3. TypeScript types for the new content model
4. Command layer design
5. Toolbar and inspector component architecture
6. Import and sanitization pipeline
7. Export pipeline architecture
8. Firestore model updates
9. Migration strategy from legacy HTML
10. Rollout plan behind a feature flag

### Deliverables
Generate:
- TypeScript interfaces and types
- recommended folder structure
- starter implementation files
- migration utilities
- serialization/deserialization strategy
- security strategy
- phased rollout checklist
- testing strategy
- examples of how `resume-studio-editor.tsx` should be refactored to use Editor v2

### Constraints
- prioritize robustness over shortcuts
- optimize for print-safe resumes, not generic CMS editing
- preserve future support for comments, track changes, and collaboration
- avoid breaking current production resumes
- make the system maintainable for long-term evolution

### Output format
Return:
1. architecture summary
2. implementation phases
3. folder/file plan
4. type definitions
5. schema/extension plan
6. migration plan
7. export/ATS integration plan
8. testing plan
9. step-by-step rollout plan

Also include example code snippets for critical pieces:
- editor initialization
- autosave integration
- sanitizing pasted HTML into schema
- rendering structured content into printable HTML

---

# Recommended Build Order

1. Define types and schema
2. Build core editor instance
3. Build toolbar and paragraph formatting
4. Add import/sanitize pipeline
5. Add print renderer
6. Add export serializers
7. Add migration helpers
8. Hook into ATS / AI / versions
9. Launch behind feature flag
10. Migrate real documents gradually

---

# Suggested Milestone Checklist

## Milestone 1
- editor-v2 folder created
- schema defined
- basic formatting works
- autosave works
- legacy untouched

## Milestone 2
- paragraph formatting works
- list and heading system works
- sanitizing paste works
- print preview works

## Milestone 3
- tables and images work
- page settings work
- export HTML/PDF works
- ATS serializer updated

## Milestone 4
- DOCX import/export works
- migration pipeline works
- feature flag rollout works

## Milestone 5
- comments/history enhancements
- track changes groundwork
- optional collaboration groundwork

---

# Final Recommendation

Do not continue extending the current contentEditable implementation for this feature set.

For the level of formatting, layout, import/export, and future collaboration you want, the stable path is:

- keep your existing Resume Studio business logic
- replace the rich text core with a schema-first editor
- use Tiptap/ProseMirror
- build resume-specific constraints and rendering on top of it
- migrate gradually behind a feature flag

That gives you a professional foundation that can actually support “best settings and tools and shape” without the editor becoming unmaintainable.
