"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentWeekId } from "@/lib/goals/date";
import { learningDifficultyLabels, studyTypeLabels } from "@/lib/goals/constants";
import type { GoalSticker } from "@/types/goals";

type WeekPlanPayload = {
  weekId: string;
  plan: {
    weekId: string;
    stickerIds: string[];
    focusAreas: string[];
    targetMinutes: number;
    notes?: string;
  } | null;
  availableStickers: GoalSticker[];
  error?: string;
};

type AiWeekPlan = {
  weekId: string;
  planItems: Array<{
    stickerId: string;
    timeBoxMinutes: number;
    rationale: string;
  }>;
  focusAreas: string[];
  weeklyNotes: string;
  targetMinutes: number;
  error?: string;
};

function parseFocusAreas(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function GoalsLearningWeekPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [payload, setPayload] = useState<WeekPlanPayload | null>(null);

  const [weekId, setWeekId] = useState(currentWeekId("America/Montreal"));
  const [selectedStickerIds, setSelectedStickerIds] = useState<string[]>([]);
  const [focusAreasInput, setFocusAreasInput] = useState("");
  const [targetMinutes, setTargetMinutes] = useState("300");
  const [notes, setNotes] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState<AiWeekPlan | null>(null);

  const load = useCallback(async (nextWeekId?: string) => {
    const targetWeekId = nextWeekId ?? currentWeekId("America/Montreal");
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(
        `/api/admin/goals/learning/week-plan?weekId=${targetWeekId}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as WeekPlanPayload;
      if (!response.ok) throw new Error(data.error ?? "Unable to load learning week plan");
      setPayload(data);
      setWeekId(data.weekId);
      setSelectedStickerIds(data.plan?.stickerIds ?? []);
      setFocusAreasInput((data.plan?.focusAreas ?? []).join(", "));
      setTargetMinutes(String(data.plan?.targetMinutes ?? 300));
      setNotes(data.plan?.notes || "");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to load learning week plan",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(currentWeekId("America/Montreal"));
  }, [load]);

  const selectedStickers = useMemo(() => {
    const map = new Map(
      (payload?.availableStickers ?? []).map((sticker) => [sticker.id, sticker] as const),
    );
    return selectedStickerIds
      .map((id) => map.get(id) ?? null)
      .filter((item): item is GoalSticker => Boolean(item));
  }, [payload?.availableStickers, selectedStickerIds]);

  function toggleSticker(stickerId: string) {
    setSelectedStickerIds((prev) =>
      prev.includes(stickerId)
        ? prev.filter((id) => id !== stickerId)
        : [...prev, stickerId],
    );
  }

  async function savePlan() {
    const parsedTarget = Number(targetMinutes);
    if (!Number.isFinite(parsedTarget) || parsedTarget < 30) return;

    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/goals/learning/week-plan", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekId,
          stickerIds: selectedStickerIds,
          focusAreas: parseFocusAreas(focusAreasInput),
          targetMinutes: Math.floor(parsedTarget),
          notes: notes.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save learning plan");
      setStatus("Learning week plan saved.");
      await load(weekId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save learning plan");
    } finally {
      setSaving(false);
    }
  }

  async function runAiPlan() {
    setAiLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/ai/goals/learning/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekId,
          focusAreas: parseFocusAreas(focusAreasInput),
          maxItems: 10,
          stickerIds: selectedStickerIds.length ? selectedStickerIds : undefined,
        }),
      });
      const data = (await response.json()) as AiWeekPlan;
      if (!response.ok) throw new Error(data.error ?? "Unable to build AI learning plan");
      setAiPlan(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to build AI learning plan");
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiPlan() {
    if (!aiPlan) return;
    setSelectedStickerIds(
      Array.from(new Set(aiPlan.planItems.map((item) => item.stickerId))),
    );
    setFocusAreasInput(aiPlan.focusAreas.join(", "));
    setTargetMinutes(String(aiPlan.targetMinutes));
    setNotes(aiPlan.weeklyNotes);
    setStatus("AI plan applied. Save to persist.");
  }

  if (loading || !payload) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border/70 bg-card/70">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading learning week planning...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Weekly Learning Planning</CardTitle>
          <CardDescription>
            Curate what to study this week and keep total scope realistic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="learning-week-id">Week ID</Label>
              <Input
                id="learning-week-id"
                value={weekId}
                onChange={(event) => setWeekId(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="learning-focus-areas">Focus areas (comma separated)</Label>
              <Input
                id="learning-focus-areas"
                value={focusAreasInput}
                onChange={(event) => setFocusAreasInput(event.target.value)}
                placeholder="Distributed systems, React internals, Prompt engineering"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="learning-target-minutes">Target minutes</Label>
              <Input
                id="learning-target-minutes"
                type="number"
                min={30}
                step={15}
                value={targetMinutes}
                onChange={(event) => setTargetMinutes(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Selected stickers</Label>
              <div className="h-10 rounded-md border border-border/70 bg-background/70 px-3 text-sm leading-10">
                {selectedStickerIds.length}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="learning-week-notes">Notes</Label>
            <Textarea
              id="learning-week-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void savePlan()} disabled={saving}>
              <Save className="h-4 w-4" />
              Save Learning Plan
            </Button>
            <Button type="button" variant="outline" onClick={() => void runAiPlan()} disabled={aiLoading}>
              {aiLoading ? "Planning..." : "AI Convert Goals to Learning Plan"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void load(weekId)} disabled={saving}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {aiPlan ? (
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>AI Learning Plan Draft</CardTitle>
            <CardDescription>{aiPlan.targetMinutes} suggested minutes this week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {aiPlan.focusAreas.map((area) => (
                <Badge key={area} variant="outline">{area}</Badge>
              ))}
            </div>
            <div className="space-y-2">
              {aiPlan.planItems.map((item) => {
                const sticker = payload.availableStickers.find((value) => value.id === item.stickerId);
                return (
                  <div key={item.stickerId} className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-sm font-medium">{sticker?.title || item.stickerId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.timeBoxMinutes} min · {item.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
            <Button type="button" variant="outline" onClick={applyAiPlan}>
              Apply AI Plan to Form
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Selected Learning Stickers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedStickers.length ? (
              selectedStickers.map((sticker) => (
                <div key={sticker.id} className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <p className="text-sm font-medium">{sticker.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {sticker.learning?.learningArea ? (
                      <span>{sticker.learning.learningArea}</span>
                    ) : null}
                    {sticker.learning?.difficulty ? (
                      <span>{learningDifficultyLabels[sticker.learning.difficulty]}</span>
                    ) : null}
                    {sticker.learning?.studyType ? (
                      <span>{studyTypeLabels[sticker.learning.studyType]}</span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                No learning stickers selected yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Learning Sticker Pool</CardTitle>
            <CardDescription>Only stickers with learning metadata appear here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {payload.availableStickers.map((sticker) => {
              const selected = selectedStickerIds.includes(sticker.id);
              return (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => toggleSticker(sticker.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/70 p-3 text-left hover:border-primary/40"
                >
                  <div>
                    <p className="text-sm font-medium">{sticker.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sticker.learning?.learningArea || "No area"} ·{" "}
                      {sticker.learning?.studyType
                        ? studyTypeLabels[sticker.learning.studyType]
                        : "No study type"}
                    </p>
                  </div>
                  <Badge variant={selected ? "default" : "outline"}>
                    {selected ? "Selected" : "Select"}
                  </Badge>
                </button>
              );
            })}
            {!payload.availableStickers.length ? (
              <p className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                No learning-ready stickers found. Add learning metadata in Board edit.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {status ? (
        <p className="inline-flex items-center gap-2 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          {status}
        </p>
      ) : null}
    </div>
  );
}
