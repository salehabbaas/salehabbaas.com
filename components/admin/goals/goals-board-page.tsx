"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Bot, Loader2, Plus, Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";

import { SortableGoalStickerCard } from "@/components/admin/goals/goals-sticker-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  goalStickerColorPalette,
  learningDifficultyLabels,
  stickerStatusLabels,
  studyTypeLabels,
} from "@/lib/goals/constants";
import { todayDateId } from "@/lib/goals/date";
import { cn } from "@/lib/utils";
import type {
  GoalLearningDifficulty,
  GoalSticker,
  GoalStickerPriority,
  GoalStickerStatus,
  GoalStudyType,
} from "@/types/goals";

const columns: GoalStickerStatus[] = ["inbox", "this_week", "today", "done"];

type BoardPayload = {
  board: {
    id: string;
    title: string;
  };
  stickers: GoalSticker[];
  nextCursor: string | null;
  error?: string;
};

function columnSummary(stickers: GoalSticker[], status: GoalStickerStatus) {
  return stickers.filter((sticker) => sticker.status === status).length;
}

function sortByColumn(stickers: GoalSticker[]) {
  return [...stickers].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });
}

function filterSticker(sticker: GoalSticker, filters: {
  priority: "all" | GoalStickerPriority;
  tag: string;
  projectOnly: boolean;
  learningOnly: boolean;
  learningArea: string;
  learningDifficulty: "all" | GoalLearningDifficulty;
  studyType: "all" | GoalStudyType;
  plannedDate: string;
}) {
  if (filters.priority !== "all" && sticker.priority !== filters.priority) return false;
  if (filters.tag && !sticker.tags.some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase()))) {
    return false;
  }
  if (filters.projectOnly && sticker.source?.type !== "projectTask") return false;
  if (filters.learningOnly && !sticker.learning) return false;
  if (
    filters.learningArea &&
    sticker.learning?.learningArea?.toLowerCase() !== filters.learningArea.toLowerCase()
  ) {
    return false;
  }
  if (
    filters.learningDifficulty !== "all" &&
    sticker.learning?.difficulty !== filters.learningDifficulty
  ) {
    return false;
  }
  if (filters.studyType !== "all" && sticker.learning?.studyType !== filters.studyType) return false;
  if (filters.plannedDate && sticker.plannedDate !== filters.plannedDate) return false;
  return true;
}

function mergeWithReindexedStatuses(
  allStickers: GoalSticker[],
  status: GoalStickerStatus,
  updated: GoalSticker[],
) {
  const others = allStickers.filter((sticker) => sticker.status !== status);
  return [...others, ...updated];
}

function GoalsColumn({
  status,
  stickers,
  onComplete,
  onEdit,
  onMoveToday,
  onPlannedDateChange,
}: {
  status: GoalStickerStatus;
  stickers: GoalSticker[];
  onComplete: (sticker: GoalSticker) => void;
  onEdit: (sticker: GoalSticker) => void;
  onMoveToday: (sticker: GoalSticker) => void;
  onPlannedDateChange: (sticker: GoalSticker, dateId: string | null) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column:${status}`,
    data: {
      type: "column",
      status,
    },
  });

  return (
    <Card className={cn("border-border/70 bg-card/70", isOver ? "border-primary/60 bg-primary/10" : "") }>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{stickerStatusLabels[status]}</span>
          <Badge variant="outline">{stickers.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div ref={setNodeRef} className="space-y-3">
          <SortableContext items={stickers.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {stickers.map((sticker) => (
              <SortableGoalStickerCard
                key={sticker.id}
                sticker={sticker}
                onComplete={onComplete}
                onEdit={onEdit}
                onMoveToday={onMoveToday}
                onPlannedDateChange={onPlannedDateChange}
              />
            ))}
          </SortableContext>

          {!stickers.length ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-background/50 p-3 text-center text-xs text-muted-foreground">
              Drop stickers here
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function GoalsBoardPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [stickers, setStickers] = useState<GoalSticker[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createPriority, setCreatePriority] = useState<GoalStickerPriority>("medium");
  const [createStatus, setCreateStatus] = useState<GoalStickerStatus>("inbox");

  const [filterPriority, setFilterPriority] = useState<"all" | GoalStickerPriority>("all");
  const [filterTag, setFilterTag] = useState("");
  const [filterProjectOnly, setFilterProjectOnly] = useState(false);
  const [filterLearningOnly, setFilterLearningOnly] = useState(false);
  const [filterLearningArea, setFilterLearningArea] = useState("");
  const [filterLearningDifficulty, setFilterLearningDifficulty] = useState<"all" | GoalLearningDifficulty>("all");
  const [filterStudyType, setFilterStudyType] = useState<"all" | GoalStudyType>("all");
  const [filterPlannedDate, setFilterPlannedDate] = useState("");

  const [editing, setEditing] = useState<GoalSticker | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPriority, setEditPriority] = useState<GoalStickerPriority>("medium");
  const [editStatus, setEditStatus] = useState<GoalStickerStatus>("inbox");
  const [editEstimate, setEditEstimate] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editColor, setEditColor] = useState("amber");
  const [editLearningArea, setEditLearningArea] = useState("");
  const [editLearningOutcome, setEditLearningOutcome] = useState("");
  const [editLearningDifficulty, setEditLearningDifficulty] = useState<"" | GoalLearningDifficulty>("");
  const [editStudyType, setEditStudyType] = useState<"" | GoalStudyType>("");
  const [editResourceLink, setEditResourceLink] = useState("");
  const [editTimeBox, setEditTimeBox] = useState("");

  const [aiOpen, setAiOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState("");
  const [aiInputUrl, setAiInputUrl] = useState("");
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<{
      title: string;
      notes?: string;
      priority: GoalStickerPriority;
      status: "inbox" | "this_week" | "today";
      tags: string[];
      estimateMinutes?: number | null;
      plannedDate?: string | null;
      learningArea?: string;
      learningOutcome?: string;
      difficulty?: GoalLearningDifficulty;
      studyType?: GoalStudyType;
      resourceLink?: string;
      timeBoxMinutes?: number | null;
      xpValue: number;
    }>
  >([]);
  const [aiPlanning, setAiPlanning] = useState(false);
  const [aiFocusAreas, setAiFocusAreas] = useState("");
  const [aiPlanRationale, setAiPlanRationale] = useState("");
  const [aiPlanWarnings, setAiPlanWarnings] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  async function loadBoard() {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/board", { cache: "no-store" });
      const payload = (await response.json()) as BoardPayload;
      if (!response.ok) throw new Error(payload.error ?? "Unable to load goals board");
      setStickers(payload.stickers ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load goals board");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBoard();
  }, []);

  const filteredStickers = useMemo(
    () =>
      stickers.filter((sticker) =>
        filterSticker(sticker, {
          priority: filterPriority,
          tag: filterTag,
          projectOnly: filterProjectOnly,
          learningOnly: filterLearningOnly,
          learningArea: filterLearningArea,
          learningDifficulty: filterLearningDifficulty,
          studyType: filterStudyType,
          plannedDate: filterPlannedDate,
        }),
      ),
    [
      stickers,
      filterPriority,
      filterTag,
      filterProjectOnly,
      filterLearningOnly,
      filterLearningArea,
      filterLearningDifficulty,
      filterStudyType,
      filterPlannedDate,
    ],
  );

  const stickersByStatus = useMemo(() => {
    const map: Record<GoalStickerStatus, GoalSticker[]> = {
      inbox: [],
      this_week: [],
      today: [],
      done: [],
    };
    filteredStickers.forEach((sticker) => {
      map[sticker.status].push(sticker);
    });
    (Object.keys(map) as GoalStickerStatus[]).forEach((key) => {
      map[key] = sortByColumn(map[key]);
    });
    return map;
  }, [filteredStickers]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    stickers.forEach((sticker) => {
      sticker.tags.forEach((tag) => set.add(tag));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [stickers]);

  const activeSticker = useMemo(
    () => stickers.find((sticker) => sticker.id === activeStickerId) ?? null,
    [stickers, activeStickerId],
  );

  function hydrateSticker(nextSticker: GoalSticker) {
    setStickers((prev) => {
      const exists = prev.some((sticker) => sticker.id === nextSticker.id);
      if (!exists) return [...prev, nextSticker];
      return prev.map((sticker) => (sticker.id === nextSticker.id ? nextSticker : sticker));
    });
  }

  async function patchSticker(stickerId: string, patch: Record<string, unknown>) {
    const response = await fetch(`/api/admin/goals/stickers/${stickerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });

    const payload = (await response.json()) as { sticker?: GoalSticker; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Unable to update sticker");
    if (payload.sticker) hydrateSticker(payload.sticker);
  }

  async function createStickerFromSuggestion(suggestion: {
    title: string;
    notes?: string;
    priority: GoalStickerPriority;
    status: "inbox" | "this_week" | "today";
    tags: string[];
    estimateMinutes?: number | null;
    plannedDate?: string | null;
    learningArea?: string;
    learningOutcome?: string;
    difficulty?: GoalLearningDifficulty;
    studyType?: GoalStudyType;
    resourceLink?: string;
    timeBoxMinutes?: number | null;
    xpValue: number;
  }) {
    const response = await fetch("/api/admin/goals/stickers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: suggestion.title,
        notes: suggestion.notes || "",
        priority: suggestion.priority,
        status: suggestion.status,
        tags: suggestion.tags,
        estimateMinutes: suggestion.estimateMinutes ?? null,
        plannedDate: suggestion.plannedDate ?? null,
        xpValue: suggestion.xpValue,
        learning: suggestion.learningArea ||
          suggestion.learningOutcome ||
          suggestion.difficulty ||
          suggestion.studyType ||
          suggestion.resourceLink ||
          suggestion.timeBoxMinutes
          ? {
              learningArea: suggestion.learningArea,
              learningOutcome: suggestion.learningOutcome,
              difficulty: suggestion.difficulty,
              studyType: suggestion.studyType,
              resourceLink: suggestion.resourceLink,
              timeBoxMinutes: suggestion.timeBoxMinutes ?? null,
            }
          : null,
      }),
    });

    const payload = (await response.json()) as { sticker?: GoalSticker; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Unable to create sticker");
    if (payload.sticker) {
      hydrateSticker(payload.sticker);
    }
  }

  function buildReorderUpdates(rows: GoalSticker[]) {
    return columns.flatMap((statusValue) =>
      sortByColumn(rows)
        .filter((sticker) => sticker.status === statusValue)
        .map((sticker, index) => ({
          stickerId: sticker.id,
          status: statusValue,
          order: index,
        })),
    );
  }

  async function persistReorder(rows: GoalSticker[]) {
    const updates = buildReorderUpdates(rows);
    const response = await fetch("/api/admin/goals/stickers/reorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Unable to reorder stickers");
  }

  function onDragStart(event: DragStartEvent) {
    setActiveStickerId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveStickerId(null);

    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : "";
    if (!overId || activeId === overId) return;

    const active = stickers.find((sticker) => sticker.id === activeId);
    if (!active) return;

    const overSticker = stickers.find((sticker) => sticker.id === overId);
    const destinationStatus = overId.startsWith("column:")
      ? (overId.replace("column:", "") as GoalStickerStatus)
      : overSticker?.status || active.status;

    const sourceStatus = active.status;

    let nextRows = stickers;

    if (sourceStatus === destinationStatus && overSticker) {
      const columnRows = sortByColumn(stickers.filter((sticker) => sticker.status === sourceStatus));
      const fromIndex = columnRows.findIndex((row) => row.id === active.id);
      const toIndex = columnRows.findIndex((row) => row.id === overSticker.id);
      if (fromIndex === -1 || toIndex === -1) return;

      const moved = arrayMove(columnRows, fromIndex, toIndex).map((row, index) => ({
        ...row,
        order: index,
      }));
      nextRows = mergeWithReindexedStatuses(stickers, sourceStatus, moved);
    } else {
      const sourceRows = sortByColumn(stickers.filter((sticker) => sticker.status === sourceStatus));
      const destinationRows = sortByColumn(
        stickers.filter((sticker) => sticker.status === destinationStatus),
      );

      const activeIndex = sourceRows.findIndex((row) => row.id === active.id);
      if (activeIndex === -1) return;

      const [moving] = sourceRows.splice(activeIndex, 1);
      const destinationIndex = overId.startsWith("column:")
        ? destinationRows.length
        : Math.max(0, destinationRows.findIndex((row) => row.id === overId));

      destinationRows.splice(destinationIndex, 0, {
        ...moving,
        status: destinationStatus,
      });

      const updatedSourceRows = sourceRows.map((row, index) => ({
        ...row,
        order: index,
      }));

      const updatedDestinationRows = destinationRows.map((row, index) => ({
        ...row,
        status: destinationStatus,
        order: index,
      }));

      nextRows = [
        ...stickers.filter(
          (sticker) =>
            sticker.status !== sourceStatus && sticker.status !== destinationStatus,
        ),
        ...updatedSourceRows,
        ...updatedDestinationRows,
      ];
    }

    setStickers(nextRows);

    try {
      await persistReorder(nextRows);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to reorder stickers");
      await loadBoard();
    }
  }

  async function createSticker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = createTitle.trim();
    if (!title) return;

    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/stickers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          priority: createPriority,
          status: createStatus,
        }),
      });

      const payload = (await response.json()) as { sticker?: GoalSticker; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create sticker");

      if (payload.sticker) {
        hydrateSticker(payload.sticker);
      }

      setCreateTitle("");
      setCreatePriority("medium");
      setCreateStatus("inbox");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create sticker");
    } finally {
      setSaving(false);
    }
  }

  async function onComplete(sticker: GoalSticker) {
    try {
      await patchSticker(sticker.id, { complete: true, status: "done" });
      setStatus(`Completed "${sticker.title}"`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to complete sticker");
    }
  }

  async function onMoveToday(sticker: GoalSticker) {
    try {
      await patchSticker(sticker.id, {
        status: "today",
        plannedDate: todayDateId("America/Montreal"),
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to move sticker");
    }
  }

  async function onPlannedDateChange(sticker: GoalSticker, dateId: string | null) {
    try {
      await patchSticker(sticker.id, {
        plannedDate: dateId,
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to set planned date");
    }
  }

  async function runAiExtract() {
    if (!aiInputText.trim()) return;
    setAiExtracting(true);
    setStatus("");

    try {
      const response = await fetch("/api/ai/goals/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: aiInputText.trim(),
          url: aiInputUrl.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as { stickers?: typeof aiSuggestions; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to extract stickers");
      setAiSuggestions(payload.stickers ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to extract stickers");
    } finally {
      setAiExtracting(false);
    }
  }

  async function addAllAiSuggestions() {
    if (!aiSuggestions.length) return;
    setSaving(true);
    setStatus("");
    try {
      for (const suggestion of aiSuggestions) {
        await createStickerFromSuggestion(suggestion);
      }
      setAiSuggestions([]);
      setAiInputText("");
      setAiInputUrl("");
      setStatus("AI stickers added to board.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add AI suggestions");
    } finally {
      setSaving(false);
    }
  }

  async function runAiPlanDay() {
    setAiPlanning(true);
    setStatus("");
    setAiPlanRationale("");
    setAiPlanWarnings([]);

    try {
      const response = await fetch("/api/ai/goals/plan-day", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateId: todayDateId("America/Montreal"),
          maxTasks: 7,
          focusAreas: aiFocusAreas
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as {
        stickerIds?: string[];
        rationale?: string;
        warnings?: string[];
        dateId?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to plan today");

      const stickerIds = Array.from(new Set(payload.stickerIds ?? []));
      const nextDateId = payload.dateId || todayDateId("America/Montreal");

      await fetch("/api/admin/goals/day-plan", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateId: nextDateId,
          stickerIds,
        }),
      });

      setAiPlanRationale(payload.rationale || "");
      setAiPlanWarnings(payload.warnings ?? []);
      setStatus(`AI planned ${stickerIds.length} sticker(s) for today.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to plan today");
    } finally {
      setAiPlanning(false);
    }
  }

  function openEdit(sticker: GoalSticker) {
    setEditing(sticker);
    setEditTitle(sticker.title);
    setEditNotes(sticker.notes || "");
    setEditPriority(sticker.priority);
    setEditStatus(sticker.status);
    setEditEstimate(sticker.estimateMinutes ? String(sticker.estimateMinutes) : "");
    setEditTags(sticker.tags.join(", "));
    setEditColor(sticker.color || "amber");
    setEditLearningArea(sticker.learning?.learningArea || "");
    setEditLearningOutcome(sticker.learning?.learningOutcome || "");
    setEditLearningDifficulty(sticker.learning?.difficulty || "");
    setEditStudyType(sticker.learning?.studyType || "");
    setEditResourceLink(sticker.learning?.resourceLink || "");
    setEditTimeBox(
      sticker.learning?.timeBoxMinutes ? String(sticker.learning.timeBoxMinutes) : "",
    );
  }

  async function saveEdit() {
    if (!editing) return;

    setSaving(true);
    setStatus("");

    try {
      const nextEstimate = editEstimate.trim() ? Number(editEstimate.trim()) : null;
      const tags = Array.from(
        new Set(
          editTags
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
      );

      const timeBoxMinutes = editTimeBox.trim() ? Number(editTimeBox.trim()) : null;
      const learning =
        editLearningArea.trim() ||
        editLearningOutcome.trim() ||
        editLearningDifficulty ||
        editStudyType ||
        editResourceLink.trim() ||
        timeBoxMinutes
          ? {
              learningArea: editLearningArea.trim() || undefined,
              learningOutcome: editLearningOutcome.trim() || undefined,
              difficulty: editLearningDifficulty || undefined,
              studyType: editStudyType || undefined,
              resourceLink: editResourceLink.trim() || undefined,
              timeBoxMinutes:
                typeof timeBoxMinutes === "number" && Number.isFinite(timeBoxMinutes)
                  ? Math.max(5, Math.floor(timeBoxMinutes))
                  : null,
            }
          : null;

      await patchSticker(editing.id, {
        title: editTitle.trim(),
        notes: editNotes.trim(),
        priority: editPriority,
        status: editStatus,
        estimateMinutes:
          typeof nextEstimate === "number" && Number.isFinite(nextEstimate)
            ? Math.max(5, Math.floor(nextEstimate))
            : null,
        tags,
        color: editColor,
        learning,
      });

      setEditing(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save sticker");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border/70 bg-card/70">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading goals board...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-4">
          <form onSubmit={createSticker} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px_auto]">
            <Input
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              placeholder="New sticker title..."
              required
            />
            <Select
              value={createPriority}
              onChange={(event) => setCreatePriority(event.target.value as GoalStickerPriority)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
            <Select
              value={createStatus}
              onChange={(event) => setCreateStatus(event.target.value as GoalStickerStatus)}
            >
              {columns.map((column) => (
                <option key={column} value={column}>
                  {stickerStatusLabels[column]}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4" />
              Add Sticker
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setAiOpen(true)}>
              <Bot className="h-4 w-4" />
              AI
            </Button>
            {aiPlanRationale ? (
              <p className="text-xs text-muted-foreground">{aiPlanRationale}</p>
            ) : null}
          </div>

          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <Select
              value={filterPriority}
              onChange={(event) => setFilterPriority(event.target.value as "all" | GoalStickerPriority)}
            >
              <option value="all">All priorities</option>
              <option value="high">High only</option>
              <option value="medium">Medium only</option>
              <option value="low">Low only</option>
            </Select>
            <Select value={filterTag} onChange={(event) => setFilterTag(event.target.value)}>
              <option value="">All tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </Select>
            <Input
              value={filterLearningArea}
              onChange={(event) => setFilterLearningArea(event.target.value)}
              placeholder="Learning area"
            />
            <Select
              value={filterLearningDifficulty}
              onChange={(event) =>
                setFilterLearningDifficulty(
                  event.target.value as "all" | GoalLearningDifficulty,
                )
              }
            >
              <option value="all">All difficulties</option>
              {Object.entries(learningDifficultyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={filterStudyType}
              onChange={(event) =>
                setFilterStudyType(event.target.value as "all" | GoalStudyType)
              }
            >
              <option value="all">All study types</option>
              {Object.entries(studyTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={filterPlannedDate}
              onChange={(event) => setFilterPlannedDate(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={filterProjectOnly}
                onChange={(event) => setFilterProjectOnly(event.target.checked)}
              />
              Project-linked only
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={filterLearningOnly}
                onChange={(event) => setFilterLearningOnly(event.target.checked)}
              />
              Learning-only stickers
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {columns.map((column) => (
              <Badge key={column} variant="outline" className="text-xs">
                {stickerStatusLabels[column]}: {columnSummary(filteredStickers, column)}
              </Badge>
            ))}
            <Badge variant="outline" className="text-xs">
              Total filtered: {filteredStickers.length}
            </Badge>
          </div>

          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardContent>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={(event) => {
          void onDragEnd(event);
        }}
      >
        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column) => (
            <GoalsColumn
              key={column}
              status={column}
              stickers={stickersByStatus[column]}
              onComplete={onComplete}
              onEdit={openEdit}
              onMoveToday={onMoveToday}
              onPlannedDateChange={onPlannedDateChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeSticker ? (
            <motion.div
              className="rounded-xl border border-primary/50 bg-primary/10 px-3 py-2 shadow-elev2"
              initial={{ scale: 1.02 }}
              animate={{ scale: 1.02 }}
            >
              <p className="line-clamp-2 text-sm font-medium">{activeSticker.title}</p>
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (!open ? setEditing(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sticker</DialogTitle>
            <DialogDescription>Update this sticker quickly.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-edit-title">Title</Label>
              <Input id="goal-edit-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-edit-notes">Notes</Label>
              <Textarea id="goal-edit-notes" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} rows={4} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="goal-edit-priority">Priority</Label>
                <Select id="goal-edit-priority" value={editPriority} onChange={(event) => setEditPriority(event.target.value as GoalStickerPriority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-edit-status">Status</Label>
                <Select id="goal-edit-status" value={editStatus} onChange={(event) => setEditStatus(event.target.value as GoalStickerStatus)}>
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {stickerStatusLabels[column]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-edit-estimate">Estimate (min)</Label>
                <Input id="goal-edit-estimate" type="number" min={5} step={5} value={editEstimate} onChange={(event) => setEditEstimate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-edit-color">Color</Label>
                <Select id="goal-edit-color" value={editColor} onChange={(event) => setEditColor(event.target.value)}>
                  {goalStickerColorPalette.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goal-edit-tags">Tags (comma separated)</Label>
              <Input id="goal-edit-tags" value={editTags} onChange={(event) => setEditTags(event.target.value)} />
            </div>

            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <p className="text-sm font-medium">Learning metadata</p>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="goal-edit-learning-area">Learning area</Label>
                  <Input
                    id="goal-edit-learning-area"
                    value={editLearningArea}
                    onChange={(event) => setEditLearningArea(event.target.value)}
                    placeholder="System design"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal-edit-time-box">Time-box (min)</Label>
                  <Input
                    id="goal-edit-time-box"
                    type="number"
                    min={5}
                    step={5}
                    value={editTimeBox}
                    onChange={(event) => setEditTimeBox(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal-edit-learning-difficulty">Difficulty</Label>
                  <Select
                    id="goal-edit-learning-difficulty"
                    value={editLearningDifficulty}
                    onChange={(event) =>
                      setEditLearningDifficulty(event.target.value as "" | GoalLearningDifficulty)
                    }
                  >
                    <option value="">None</option>
                    {Object.entries(learningDifficultyLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal-edit-study-type">Study type</Label>
                  <Select
                    id="goal-edit-study-type"
                    value={editStudyType}
                    onChange={(event) => setEditStudyType(event.target.value as "" | GoalStudyType)}
                  >
                    <option value="">None</option>
                    {Object.entries(studyTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="goal-edit-learning-outcome">Learning outcome</Label>
                  <Textarea
                    id="goal-edit-learning-outcome"
                    rows={3}
                    value={editLearningOutcome}
                    onChange={(event) => setEditLearningOutcome(event.target.value)}
                    placeholder="Explain one concrete expected outcome."
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="goal-edit-resource-link">Resource link</Label>
                  <Input
                    id="goal-edit-resource-link"
                    value={editResourceLink}
                    onChange={(event) => setEditResourceLink(event.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={saving || !editTitle.trim()}>
              <Sparkles className="h-4 w-4" />
              Save Sticker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Goals AI Assistant</DialogTitle>
            <DialogDescription>
              Quick capture ideas into stickers, then auto-plan today from backlog constraints.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="text-sm font-medium">Quick Capture</p>
              <Textarea
                value={aiInputText}
                onChange={(event) => setAiInputText(event.target.value)}
                rows={5}
                placeholder="Paste notes, ideas, voice transcript, or rough to-dos..."
              />
              <Input
                value={aiInputUrl}
                onChange={(event) => setAiInputUrl(event.target.value)}
                placeholder="Optional source URL"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void runAiExtract()} disabled={aiExtracting || !aiInputText.trim()}>
                  <Wand2 className="h-4 w-4" />
                  {aiExtracting ? "Extracting..." : "Extract Stickers"}
                </Button>
                <Button type="button" onClick={() => void addAllAiSuggestions()} disabled={saving || !aiSuggestions.length}>
                  Add All
                </Button>
              </div>
            </div>

            {aiSuggestions.length ? (
              <div className="space-y-2 rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-sm font-medium">Extracted Stickers ({aiSuggestions.length})</p>
                {aiSuggestions.map((suggestion, index) => (
                  <div key={`${suggestion.title}-${index}`} className="rounded-lg border border-border/65 bg-background/70 p-3">
                    <p className="text-sm font-medium">{suggestion.title}</p>
                    {suggestion.notes ? <p className="mt-1 text-xs text-muted-foreground">{suggestion.notes}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {suggestion.priority} · {suggestion.status} · {suggestion.xpValue} XP
                    </p>
                    {suggestion.learningArea || suggestion.studyType || suggestion.difficulty ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {suggestion.learningArea ? `${suggestion.learningArea} · ` : ""}
                        {suggestion.difficulty
                          ? `${learningDifficultyLabels[suggestion.difficulty]} · `
                          : ""}
                        {suggestion.studyType
                          ? studyTypeLabels[suggestion.studyType]
                          : ""}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        void createStickerFromSuggestion(suggestion);
                        setAiSuggestions((prev) => prev.filter((item, itemIndex) => itemIndex !== index));
                      }}
                    >
                      Add Sticker
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="space-y-2 rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="text-sm font-medium">Plan My Day</p>
              <Input
                value={aiFocusAreas}
                onChange={(event) => setAiFocusAreas(event.target.value)}
                placeholder="Optional focus areas (comma separated)"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void runAiPlanDay()} disabled={aiPlanning}>
                  {aiPlanning ? "Planning..." : "Plan Today"}
                </Button>
              </div>
              {aiPlanWarnings.length ? (
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {aiPlanWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
