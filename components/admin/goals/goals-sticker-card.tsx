"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { BookOpen, CalendarPlus2, CheckCircle2, GripVertical, Link2, Pencil } from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { goalStickerToneMap, type GoalStickerColor } from "@/lib/goals/constants";
import {
  learningDifficultyLabels,
  stickerPriorityLabels,
  studyTypeLabels,
} from "@/lib/goals/constants";
import { cn } from "@/lib/utils";
import type { GoalSticker } from "@/types/goals";

function completionTone(sticker: GoalSticker) {
  if (sticker.status === "done") {
    return "border-emerald-400/45 bg-emerald-500/10";
  }
  return "";
}

export function SortableGoalStickerCard({
  sticker,
  onComplete,
  onEdit,
  onMoveToday,
  onPlannedDateChange,
}: {
  sticker: GoalSticker;
  onComplete: (sticker: GoalSticker) => void;
  onEdit: (sticker: GoalSticker) => void;
  onMoveToday: (sticker: GoalSticker) => void;
  onPlannedDateChange: (sticker: GoalSticker, dateId: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: sticker.id,
      data: {
        type: "sticker",
        status: sticker.status,
      },
    });

  const tone =
    goalStickerToneMap[(sticker.color as GoalStickerColor) || "amber"] ||
    goalStickerToneMap.amber;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const estimateLabel = useMemo(() => {
    if (!sticker.estimateMinutes) return "No estimate";
    if (sticker.estimateMinutes >= 60) {
      const hours = Math.floor(sticker.estimateMinutes / 60);
      const minutes = sticker.estimateMinutes % 60;
      return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${sticker.estimateMinutes}m`;
  }, [sticker.estimateMinutes]);

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ rotate: isDragging ? 0 : -0.35, y: -1 }}
      className={cn(
        "rounded-2xl border p-3 shadow-[0_6px_18px_rgba(2,6,23,0.08)] transition",
        tone.border,
        tone.bg,
        completionTone(sticker),
        isDragging ? "opacity-60" : "opacity-100",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold leading-snug">{sticker.title}</p>
          {sticker.notes ? (
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
              {sticker.notes}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/65 bg-background/70 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag sticker"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge className={cn("text-[10px]", tone.chip)}>
          {stickerPriorityLabels[sticker.priority]}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {estimateLabel}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {sticker.xpValue} XP
        </Badge>
        {sticker.source?.type === "projectTask" ? (
          <Badge variant="outline" className="inline-flex items-center gap-1 text-[10px]">
            {sticker.source.projectId && sticker.source.taskId ? (
              <Link href={`/admin/projects/${sticker.source.projectId}/tasks/${sticker.source.taskId}`} className="inline-flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Project Task
              </Link>
            ) : (
              <>
                <Link2 className="h-3 w-3" />
                Project Task
              </>
            )}
          </Badge>
        ) : null}
        {sticker.learning?.difficulty ? (
          <Badge variant="outline" className="text-[10px]">
            {learningDifficultyLabels[sticker.learning.difficulty]}
          </Badge>
        ) : null}
        {sticker.learning?.studyType ? (
          <Badge variant="outline" className="text-[10px]">
            {studyTypeLabels[sticker.learning.studyType]}
          </Badge>
        ) : null}
      </div>

      {sticker.learning?.learningArea || sticker.learning?.learningOutcome ? (
        <div className="mt-2 rounded-lg border border-border/65 bg-background/70 p-2">
          {sticker.learning.learningArea ? (
            <p className="text-[11px] font-medium">{sticker.learning.learningArea}</p>
          ) : null}
          {sticker.learning.learningOutcome ? (
            <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
              {sticker.learning.learningOutcome}
            </p>
          ) : null}
          {sticker.learning.resourceLink ? (
            <Link
              href={sticker.learning.resourceLink}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <BookOpen className="h-3 w-3" />
              Open resource
            </Link>
          ) : null}
        </div>
      ) : null}

      {sticker.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {sticker.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border/65 bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-lg px-2 text-[11px]"
          onClick={() => onComplete(sticker)}
          disabled={sticker.status === "done"}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Done
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-lg px-2 text-[11px]"
          onClick={() => onEdit(sticker)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-lg px-2 text-[11px]"
          onClick={() => onMoveToday(sticker)}
          disabled={sticker.status === "today" || sticker.status === "done"}
        >
          <CalendarPlus2 className="h-3.5 w-3.5" />
          Today
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label className="text-[10px] text-muted-foreground">Planned</label>
        <input
          type="date"
          value={sticker.plannedDate || ""}
          onChange={(event) => {
            const value = event.target.value.trim();
            onPlannedDateChange(sticker, value || null);
          }}
          className="h-7 rounded-md border border-border/65 bg-background/70 px-2 text-[11px]"
        />
      </div>
    </motion.article>
  );
}
