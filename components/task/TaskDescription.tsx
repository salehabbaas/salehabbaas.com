"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type TaskDescriptionProps = {
  value: string;
  canWrite: boolean;
  saving?: boolean;
  onSave: (value: string) => void;
};

export function TaskDescription({ value, canWrite, saving = false, onSave }: TaskDescriptionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!editing) {
    return (
      <motion.section
        className="space-y-2 rounded-xl border border-border/70 p-3"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16 }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Description
          </p>
          {canWrite ? (
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : null}
        </div>
        <div className="min-h-10 text-sm text-foreground/90">
          {value ? <p className="line-clamp-3 whitespace-pre-wrap">{value}</p> : <p className="text-muted-foreground">Add description...</p>}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="space-y-2 rounded-xl border border-border/70 p-3"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
    >
      <p className="inline-flex items-center gap-1.5 text-sm font-medium">
        <FileText className="h-4 w-4 text-muted-foreground" />
        Description
      </p>
      <Textarea
        rows={6}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Write description (markdown supported)."
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(value);
            setEditing(false);
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSave(draft);
            setEditing(false);
          }
        }}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onSave(draft);
            setEditing(false);
          }}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </motion.section>
  );
}
