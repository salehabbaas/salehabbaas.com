"use client";

import { useMemo } from "react";
import { Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildCommentMentionToken, splitCommentMentions } from "@/lib/project-management/comment-mentions";
import { formatDateTime } from "@/lib/project-management/utils";
import type { TaskDoc } from "@/types/project-management";
import type { ProjectMemberSummary } from "@/types/admin-access";

type CommentsPanelProps = {
  task: TaskDoc;
  members: ProjectMemberSummary[];
  canWrite: boolean;
  input: string;
  busy: boolean;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
};

function getMentionContext(input: string) {
  const match = input.match(/(?:^|\s)@([^\s@]{0,40})$/);
  if (!match) return null;
  const query = match[1] ?? "";
  return {
    query,
    start: input.length - query.length - 1,
    end: input.length
  };
}

export function CommentsPanel({ task, members, canWrite, input, busy, onInputChange, onAdd, onDelete }: CommentsPanelProps) {
  const mentionContext = useMemo(() => getMentionContext(input), [input]);
  const mentionCandidates = useMemo(() => {
    if (!mentionContext) return [];
    const normalizedQuery = mentionContext.query.trim().toLowerCase();
    return members
      .filter((member) => {
        if (!normalizedQuery) return true;
        const name = (member.displayName || "").toLowerCase();
        const email = (member.email || "").toLowerCase();
        const uid = member.uid.toLowerCase();
        return name.includes(normalizedQuery) || email.includes(normalizedQuery) || uid.includes(normalizedQuery);
      })
      .slice(0, 6);
  }, [members, mentionContext]);

  function insertMention(member: ProjectMemberSummary) {
    if (!mentionContext) return;
    const label = member.displayName || member.email || member.uid;
    const token = buildCommentMentionToken(label, member.uid);
    const next = `${input.slice(0, mentionContext.start)}${token} `;
    onInputChange(next);
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/70 p-3">
      <p className="text-sm font-medium">Comments</p>
      {(task.comments ?? []).map((comment) => (
        <div key={comment.id} className="rounded-lg border border-border/60 p-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="font-medium">{comment.authorName || "Admin User"}</p>
                <p className="text-xs text-muted-foreground">
                  {comment.createdAt ? formatDateTime(comment.createdAt) : ""}
                  {comment.updatedAt && comment.updatedAt !== comment.createdAt ? " · edited" : ""}
                </p>
              </div>
            </div>
            {canWrite ? (
              <Button type="button" variant="outline" size="sm" onClick={() => onDelete(comment.id)} disabled={busy}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-wrap">
            {splitCommentMentions(comment.body).map((segment, index) => {
              if (segment.type === "mention") {
                return (
                  <span key={`${comment.id}-mention-${index}`} className="rounded bg-primary/10 px-1 py-0.5 text-primary">
                    @{segment.label}
                  </span>
                );
              }
              return <span key={`${comment.id}-text-${index}`}>{segment.value}</span>;
            })}
          </p>
        </div>
      ))}
      {canWrite ? (
        <div className="relative flex gap-2">
          <Input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Write a comment (type @ to tag user)"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (mentionContext && mentionCandidates.length) {
                  insertMention(mentionCandidates[0]);
                  return;
                }
                onAdd();
              }
            }}
          />
          <Button type="button" onClick={onAdd} disabled={busy || !input.trim()}>Add</Button>
          {mentionContext && mentionCandidates.length ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-[calc(100%-5.25rem)] rounded-lg border border-border/70 bg-card p-1 shadow-elev2">
              {mentionCandidates.map((member) => (
                <button
                  key={member.uid}
                  type="button"
                  className="flex w-full flex-col items-start rounded-md px-2 py-1 text-left hover:bg-muted/60"
                  onClick={() => insertMention(member)}
                >
                  <span className="text-sm font-medium">{member.displayName || member.email || member.uid}</span>
                  <span className="text-xs text-muted-foreground">{member.email || member.uid}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
