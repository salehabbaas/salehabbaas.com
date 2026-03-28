import type { Editor } from "@tiptap/react";

export type ResumeEditorCommandId =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "highlight"
  | "heading2"
  | "blockquote"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "undo"
  | "redo"
  | "insertHr"
  | "insertPageBreak";

export type ResumeEditorCommand = {
  id: ResumeEditorCommandId;
  run: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  canRun?: (editor: Editor) => boolean;
};

const HIGHLIGHT_COLOR = "#fef08a";

export const RESUME_EDITOR_COMMANDS: Record<ResumeEditorCommandId, ResumeEditorCommand> = {
  bold: {
    id: "bold",
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold")
  },
  italic: {
    id: "italic",
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic")
  },
  underline: {
    id: "underline",
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive("underline")
  },
  strikethrough: {
    id: "strikethrough",
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike")
  },
  highlight: {
    id: "highlight",
    run: (editor) => editor.chain().focus().toggleHighlight({ color: HIGHLIGHT_COLOR }).run(),
    isActive: (editor) => editor.isActive("highlight")
  },
  heading2: {
    id: "heading2",
    run: (editor) => {
      if (editor.isActive("heading", { level: 2 })) {
        editor.chain().focus().setParagraph().run();
      } else {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      }
    },
    isActive: (editor) => editor.isActive("heading", { level: 2 })
  },
  blockquote: {
    id: "blockquote",
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote")
  },
  bulletList: {
    id: "bulletList",
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList")
  },
  orderedList: {
    id: "orderedList",
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList")
  },
  taskList: {
    id: "taskList",
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor.isActive("taskList")
  },
  undo: {
    id: "undo",
    run: (editor) => editor.chain().focus().undo().run(),
    canRun: (editor) => editor.can().undo()
  },
  redo: {
    id: "redo",
    run: (editor) => editor.chain().focus().redo().run(),
    canRun: (editor) => editor.can().redo()
  },
  insertHr: {
    id: "insertHr",
    run: (editor) => editor.chain().focus().setHorizontalRule().run()
  },
  insertPageBreak: {
    id: "insertPageBreak",
    run: (editor) => editor.chain().focus().insertContent('<hr data-page-break="true" />').run()
  }
};

export function runEditorCommand(editor: Editor, commandId: ResumeEditorCommandId) {
  const command = RESUME_EDITOR_COMMANDS[commandId];
  if (!command) return;
  if (command.canRun && !command.canRun(editor)) return;
  command.run(editor);
}
