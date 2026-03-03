"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Copy, Expand, Trash2, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { priorityIconMap } from "@/lib/project-management/priority-ui";
import { formatTaskIdentifier } from "@/lib/project-management/utils";
import { priorityLabelMap, priorityToneMap, type TaskDoc } from "@/types/project-management";

type TaskHeaderProps = {
  task: TaskDoc;
  title: string;
  statusMessage?: string;
  savingTitle?: boolean;
  onSaveTitle: (title: string) => void;
  onOpenFullPage?: () => void;
  onOpenWatchers?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  onClose: () => void;
};

export function TaskHeader({
  task,
  title,
  statusMessage,
  savingTitle = false,
  onSaveTitle,
  onOpenFullPage,
  onOpenWatchers,
  onDelete,
  deleting = false,
  onClose
}: TaskHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [copyNotice, setCopyNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const PriorityIcon = priorityIconMap[task.priority];

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    if (!copyNotice) return;
    const timeout = window.setTimeout(() => setCopyNotice(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyNotice]);

  return (
    <div className="relative flex items-center justify-between gap-2 border-b border-border/70 pb-2">
      <div className="pointer-events-none fixed right-5 top-20 z-[90] w-[min(92vw,22rem)] sm:right-6">
        <AnimatePresence>
          {copyNotice ? (
            <motion.div
              key="task-copy-notice"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={`rounded-xl border px-3 py-2 shadow-elev2 backdrop-blur ${
                copyNotice.type === "success"
                  ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-100"
                  : "border-rose-400/40 bg-rose-500/12 text-rose-100"
              }`}
            >
              <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                {copyNotice.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {copyNotice.message}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="min-w-0 flex flex-1 items-center gap-2">
        {editing ? (
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-8 flex-1"
            autoFocus
            onBlur={() => {
              if (draft.trim() && draft.trim() !== title) onSaveTitle(draft.trim());
              setEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (draft.trim() && draft.trim() !== title) onSaveTitle(draft.trim());
                setEditing(false);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDraft(title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button type="button" className="truncate text-left text-sm font-semibold hover:text-primary" onClick={() => setEditing(true)}>
            {title}
          </button>
        )}
        <span className="inline-flex h-6 shrink-0 items-center rounded-md border border-border/70 bg-card/70 px-2 text-[10px] font-medium text-muted-foreground">
          {formatTaskIdentifier(task)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {statusMessage ? <span className="hidden max-w-[180px] truncate text-[11px] text-primary sm:inline">{statusMessage}</span> : null}
        <Badge className={`inline-flex items-center gap-1 ${priorityToneMap[task.priority]}`}>
          <PriorityIcon className="h-3 w-3" />
          {priorityLabelMap[task.priority]}
        </Badge>
        {savingTitle ? <span className="text-[10px] text-muted-foreground">Saving...</span> : null}
        <Button type="button" size="icon" variant="outline" title="Watchers" onClick={onOpenWatchers}>
          <Users className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          title="Copy link"
          onClick={async () => {
            const url = `${window.location.origin}/admin/projects/${task.projectId}?taskId=${task.id}`;
            try {
              await navigator.clipboard.writeText(url);
              setCopyNotice({
                type: "success",
                message: "Task link copied"
              });
            } catch {
              setCopyNotice({
                type: "error",
                message: "Unable to copy link"
              });
            }
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        {onOpenFullPage ? (
          <Button type="button" size="icon" variant="outline" title="Open full task page" onClick={onOpenFullPage}>
            <Expand className="h-4 w-4" />
          </Button>
        ) : null}
        {onDelete ? (
          <Button type="button" size="icon" variant="outline" title="Delete task" onClick={onDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ) : null}
        <Button type="button" size="icon" variant="outline" title="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
