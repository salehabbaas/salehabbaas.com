"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { History, MessageSquare, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CommentsPanel } from "@/components/task/CommentsPanel";
import { HistoryPanel } from "@/components/task/HistoryPanel";
import type { ActivityDoc, TaskDoc } from "@/types/project-management";
import type { ProjectMemberSummary } from "@/types/admin-access";

type ActivityTabsProps = {
  task: TaskDoc;
  members: ProjectMemberSummary[];
  activity: ActivityDoc[];
  canWrite: boolean;
  commentInput: string;
  commentBusy: boolean;
  onCommentInput: (value: string) => void;
  onAddComment: () => void;
  onDeleteComment: (id: string) => void;
};

export function ActivityTabs({
  task,
  members,
  activity,
  canWrite,
  commentInput,
  commentBusy,
  onCommentInput,
  onAddComment,
  onDeleteComment
}: ActivityTabsProps) {
  const [tab, setTab] = useState<"all" | "comments" | "history">("all");

  return (
    <motion.div className="space-y-2" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
      <div className="flex gap-1">
        <Button type="button" variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>
          <Sparkles className="h-3.5 w-3.5" />
          All
        </Button>
        <Button type="button" variant={tab === "comments" ? "default" : "outline"} size="sm" onClick={() => setTab("comments")}>
          <MessageSquare className="h-3.5 w-3.5" />
          Comments
        </Button>
        <Button type="button" variant={tab === "history" ? "default" : "outline"} size="sm" onClick={() => setTab("history")}>
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </div>
      {(tab === "all" || tab === "comments") ? (
        <CommentsPanel
          task={task}
          members={members}
          canWrite={canWrite}
          input={commentInput}
          busy={commentBusy}
          onInputChange={onCommentInput}
          onAdd={onAddComment}
          onDelete={onDeleteComment}
        />
      ) : null}
      {tab === "all" ? <HistoryPanel activity={activity} defaultCollapsed /> : null}
      {tab === "history" ? <HistoryPanel activity={activity} defaultCollapsed={false} /> : null}
    </motion.div>
  );
}
