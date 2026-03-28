"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import CharacterCount from "@tiptap/extension-character-count";
import Color from "@tiptap/extension-color";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { List, ListChecks, ListOrdered, Quote, Replace, Search, TextCursorInput, TextQuote } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";

import { Toolbar, type ToolbarAction, type ToolbarAlignment } from "@/components/ui/toolbar";
import {
  createResumeRichTextDoc,
  countResumeRichTextMatches,
  extractResumeRichTextOutline,
  legacyHtmlToResumeRichTextDoc,
  normalizeResumeRichTextDoc,
  replaceInResumeRichTextDoc,
  resumeRichTextDocToHtml,
  resumeRichTextDocToPlainText
} from "@/lib/resume-studio/editor-v2/content";
import { runEditorCommand } from "@/lib/resume-studio/editor-v2/commands";
import { cn } from "@/lib/utils";
import type { ResumeRichTextDoc } from "@/types/resume-studio";

function commandButtonClass(active: boolean) {
  return cn(
    "inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium transition",
    active
      ? "border-primary/40 bg-primary/10 text-foreground"
      : "border-border/70 bg-background/70 text-muted-foreground hover:bg-primary/5 hover:text-foreground"
  );
}

export function ResumeRichTextEditor({
  value,
  fallbackHtml,
  placeholder,
  className,
  minHeight = 96,
  collaboration,
  onChange
}: {
  value?: ResumeRichTextDoc;
  fallbackHtml?: string;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  collaboration?: {
    enabled?: boolean;
    docId?: string;
    roomName?: string;
    token?: string;
    websocketUrl?: string;
    user?: {
      id: string;
      name: string;
      color: string;
    };
  };
  onChange: (next: { doc: ResumeRichTextDoc; html: string; text: string }) => void;
}) {
  const [activeButtons, setActiveButtons] = useState<ToolbarAction[]>([]);
  const [textAlign, setTextAlign] = useState<ToolbarAlignment>("left");
  const [showSearchTools, setShowSearchTools] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const lastSerializedRef = useRef("");
  const ydocRef = useRef<Y.Doc | null>(null);

  const collabProvider = useMemo(() => {
    if (!collaboration?.enabled || !collaboration.websocketUrl || !collaboration.roomName || !collaboration.token) return null;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    return new HocuspocusProvider({
      url: collaboration.websocketUrl,
      name: collaboration.roomName,
      token: collaboration.token,
      document: ydoc
    });
  }, [collaboration?.enabled, collaboration?.roomName, collaboration?.token, collaboration?.websocketUrl]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        }
      }),
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      FontFamily,
      Link.configure({
        openOnClick: false,
        autolink: true
      }),
      Highlight.configure({
        multicolor: true
      }),
      HorizontalRule,
      Image,
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      CharacterCount,
      Placeholder.configure({
        placeholder: placeholder ?? "Start writing..."
      }),
      ...(collabProvider && ydocRef.current
        ? [
            Collaboration.configure({
              document: ydocRef.current
            }),
            CollaborationCursor.configure({
              provider: collabProvider,
              user:
                collaboration?.user ?? {
                  id: "admin",
                  name: "Admin",
                  color: "#2563eb"
                }
            })
          ]
        : [])
    ],
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none border-0 bg-transparent px-1 py-2 text-sm text-foreground outline-none",
          "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1",
          "min-h-[inherit]"
        )
      }
    },
    content: normalizeResumeRichTextDoc(value) ?? legacyHtmlToResumeRichTextDoc(fallbackHtml ?? ""),
    onUpdate({ editor: nextEditor }) {
      const nextDoc = normalizeResumeRichTextDoc(nextEditor.getJSON()) ?? createResumeRichTextDoc();
      const serialized = JSON.stringify(nextDoc);
      lastSerializedRef.current = serialized;
      onChange({
        doc: nextDoc,
        html: resumeRichTextDocToHtml(nextDoc),
        text: resumeRichTextDocToPlainText(nextDoc)
      });
    }
  });

  useEffect(() => {
    return () => {
      collabProvider?.destroy();
      ydocRef.current?.destroy();
      ydocRef.current = null;
    };
  }, [collabProvider]);

  useEffect(() => {
    const activeEditor = editor;
    if (!activeEditor) return;

    function updateToolbarState() {
      const buttons: ToolbarAction[] = [];
      if (activeEditor!.isActive("bold")) buttons.push("bold");
      if (activeEditor!.isActive("italic")) buttons.push("italic");
      if (activeEditor!.isActive("underline")) buttons.push("underline");
      if (activeEditor!.isActive("strike")) buttons.push("strikethrough");
      if (activeEditor!.isActive("highlight")) buttons.push("highlight");
      if (activeEditor!.isActive("heading")) buttons.push("heading");
      if (activeEditor!.isActive("blockquote")) buttons.push("quote");

      const nextAlign: ToolbarAlignment = activeEditor!.isActive({ textAlign: "center" })
        ? "center"
        : activeEditor!.isActive({ textAlign: "right" })
          ? "right"
          : activeEditor!.isActive({ textAlign: "justify" })
            ? "justify"
            : "left";

      setActiveButtons(buttons);
      setTextAlign(nextAlign);
    }

    updateToolbarState();
    activeEditor.on("selectionUpdate", updateToolbarState);
    activeEditor.on("transaction", updateToolbarState);

    return () => {
      activeEditor.off("selectionUpdate", updateToolbarState);
      activeEditor.off("transaction", updateToolbarState);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const nextDoc = normalizeResumeRichTextDoc(value) ?? legacyHtmlToResumeRichTextDoc(fallbackHtml ?? "");
    const serialized = JSON.stringify(nextDoc);
    if (serialized === lastSerializedRef.current) return;
    if (serialized === JSON.stringify(editor.getJSON())) return;
    editor.commands.setContent(nextDoc);
    lastSerializedRef.current = serialized;
  }, [editor, fallbackHtml, value]);

  useEffect(() => {
    if (!editor) return;
    const activeEditor = editor;

    function updateDerivedState() {
      const nextDoc = normalizeResumeRichTextDoc(activeEditor.getJSON()) ?? createResumeRichTextDoc();
      const plainText = resumeRichTextDocToPlainText(nextDoc);
      setCharacterCount(plainText.length);
      setWordCount(plainText ? plainText.split(/\s+/).filter(Boolean).length : 0);
      setSearchMatchCount(countResumeRichTextMatches(nextDoc, searchValue));
    }

    updateDerivedState();
    activeEditor.on("update", updateDerivedState);
    activeEditor.on("transaction", updateDerivedState);

    return () => {
      activeEditor.off("update", updateDerivedState);
      activeEditor.off("transaction", updateDerivedState);
    };
  }, [editor, searchValue]);

  if (!editor) {
    return (
      <div
        className={cn("rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground", className)}
        style={{ minHeight }}
      >
        Loading editor...
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-background/80 p-2">
        <Toolbar
          activeButtons={activeButtons}
          availableActions={["bold", "italic", "underline", "strikethrough", "heading", "quote", "highlight"]}
          showAlignment
          textAlign={textAlign}
          onAction={(action) => {
            if (action === "bold") runEditorCommand(editor, "bold");
            if (action === "italic") runEditorCommand(editor, "italic");
            if (action === "underline") runEditorCommand(editor, "underline");
            if (action === "strikethrough") runEditorCommand(editor, "strikethrough");
            if (action === "heading") runEditorCommand(editor, "heading2");
            if (action === "quote") runEditorCommand(editor, "blockquote");
            if (action === "highlight") runEditorCommand(editor, "highlight");
          }}
          onTextAlignChange={(alignment) => {
            editor.chain().focus().setTextAlign(alignment).run();
          }}
        />

        <button
          type="button"
          className={commandButtonClass(editor.isActive("bulletList"))}
          onMouseDown={(event) => {
            event.preventDefault();
            runEditorCommand(editor, "bulletList");
          }}
        >
          <List className="h-3.5 w-3.5" />
          Bullets
        </button>

        <button
          type="button"
          className={commandButtonClass(editor.isActive("orderedList"))}
          onMouseDown={(event) => {
            event.preventDefault();
            runEditorCommand(editor, "orderedList");
          }}
        >
          <ListOrdered className="h-3.5 w-3.5" />
          Numbers
        </button>

        <button
          type="button"
          className={commandButtonClass(editor.isActive("blockquote"))}
          onMouseDown={(event) => {
            event.preventDefault();
            runEditorCommand(editor, "blockquote");
          }}
        >
          <Quote className="h-3.5 w-3.5" />
          Quote
        </button>

        <button
          type="button"
          className={commandButtonClass(editor.isActive("taskList"))}
          onMouseDown={(event) => {
            event.preventDefault();
            runEditorCommand(editor, "taskList");
          }}
        >
          <ListChecks className="h-3.5 w-3.5" />
          Checklist
        </button>

        <button
          type="button"
          className={commandButtonClass(showSearchTools)}
          onMouseDown={(event) => {
            event.preventDefault();
            setShowSearchTools((current) => !current);
          }}
        >
          <Search className="h-3.5 w-3.5" />
          Search
        </button>

        <button
          type="button"
          className={commandButtonClass(showOutline)}
          onMouseDown={(event) => {
            event.preventDefault();
            setShowOutline((current) => !current);
          }}
        >
          <TextQuote className="h-3.5 w-3.5" />
          Outline
        </button>
      </div>

      {showSearchTools ? (
        <div className="grid gap-2 rounded-lg border border-border/70 bg-background/70 p-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm"
            placeholder="Search text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <input
            className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm"
            placeholder="Replace with"
            value={replaceValue}
            onChange={(event) => setReplaceValue(event.target.value)}
          />
          <button
            type="button"
            className={commandButtonClass(false)}
            onMouseDown={(event) => {
              event.preventDefault();
              const nextDoc = normalizeResumeRichTextDoc(editor.getJSON()) ?? createResumeRichTextDoc();
              const next = replaceInResumeRichTextDoc(nextDoc, searchValue, replaceValue);
              if (!next.replacements) return;
              editor.commands.setContent(next.doc);
            }}
          >
            <Replace className="h-3.5 w-3.5" />
            Replace All
          </button>
          <p className="text-xs text-muted-foreground md:col-span-3">
            {searchValue.trim() ? `${searchMatchCount} matches found` : "Enter text to search within this section."}
          </p>
        </div>
      ) : null}

      <div
        className="rounded-lg border border-border/70 bg-background/70"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <TextCursorInput className="h-3.5 w-3.5" />
            {wordCount} words
          </span>
          <span>{characterCount} characters</span>
          <span>{editor.storage.characterCount.characters()} tracked</span>
          {searchValue.trim() ? <span>{searchMatchCount} search matches</span> : null}
        </div>
      </div>

      {showOutline ? (
        <div className="rounded-lg border border-border/70 bg-background/70 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Outline</p>
          <div className="space-y-1">
            {extractResumeRichTextOutline(normalizeResumeRichTextDoc(editor.getJSON()) ?? createResumeRichTextDoc()).map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="block w-full rounded px-2 py-1 text-left text-sm text-foreground transition hover:bg-primary/5"
                style={{ paddingLeft: `${Math.max(8, entry.level * 10)}px` }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().setTextSelection(1).run();
                }}
              >
                {entry.text}
              </button>
            ))}
            {!extractResumeRichTextOutline(normalizeResumeRichTextDoc(editor.getJSON()) ?? createResumeRichTextDoc()).length ? (
              <p className="text-sm text-muted-foreground">No headings in this section yet.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
