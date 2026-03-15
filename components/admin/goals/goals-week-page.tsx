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
import { stickerPriorityLabels, stickerStatusLabels } from "@/lib/goals/constants";
import type { GoalReminderRuleDoc, GoalSticker, GoalWeekPlan } from "@/types/goals";

type WeekPayload = {
  weekId: string;
  weekPlan: GoalWeekPlan | null;
  stickers: GoalSticker[];
  availableStickers: GoalSticker[];
  settings: GoalReminderRuleDoc;
  error?: string;
};

function parseFocusAreas(input: string) {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function GoalsWeekPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [payload, setPayload] = useState<WeekPayload | null>(null);

  const [weekId, setWeekId] = useState("");
  const [focusAreasInput, setFocusAreasInput] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedStickerIds, setSelectedStickerIds] = useState<string[]>([]);

  const load = useCallback(async (nextWeekId?: string) => {
    const target = nextWeekId ?? currentWeekId("America/Montreal");
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/goals/week-plan?weekId=${target}`, { cache: "no-store" });
      const data = (await response.json()) as WeekPayload;
      if (!response.ok) throw new Error(data.error ?? "Unable to load week plan");

      setPayload(data);
      setWeekId(data.weekId);
      setSelectedStickerIds(data.weekPlan?.stickerIds ?? []);
      setFocusAreasInput((data.weekPlan?.focusAreas ?? []).join(", "));
      setNotes(data.weekPlan?.notes || "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load week plan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(currentWeekId("America/Montreal"));
  }, [load]);

  const selectedCount = selectedStickerIds.length;

  const selectedStickers = useMemo(() => {
    const source = payload?.availableStickers ?? [];
    const map = new Map(source.map((sticker) => [sticker.id, sticker] as const));
    return selectedStickerIds
      .map((id) => map.get(id) ?? null)
      .filter((item): item is GoalSticker => Boolean(item));
  }, [payload?.availableStickers, selectedStickerIds]);

  async function saveWeekPlan() {
    if (!payload) return;

    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/week-plan", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekId,
          stickerIds: selectedStickerIds,
          focusAreas: parseFocusAreas(focusAreasInput),
          notes,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save week plan");
      await load(weekId);
      setStatus("Week plan saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save week plan");
    } finally {
      setSaving(false);
    }
  }

  function toggleSticker(stickerId: string) {
    setSelectedStickerIds((prev) => {
      if (prev.includes(stickerId)) {
        return prev.filter((id) => id !== stickerId);
      }
      return [...prev, stickerId];
    });
  }

  if (loading || !payload) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border/70 bg-card/70">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading week plan...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Week Planner</CardTitle>
          <CardDescription>
            Build focus for the week, then attach stickers you want to execute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="goals-week-id">Week ID</Label>
              <Input id="goals-week-id" value={weekId} onChange={(event) => setWeekId(event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="goals-focus-areas">Focus areas (comma separated)</Label>
              <Input
                id="goals-focus-areas"
                value={focusAreasInput}
                onChange={(event) => setFocusAreasInput(event.target.value)}
                placeholder="Health APIs, Product polish, Hiring"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals-week-notes">Notes</Label>
            <Textarea
              id="goals-week-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Selected stickers: {selectedCount}</Badge>
            <Badge variant="outline">Target for weekly badge: 5</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveWeekPlan()} disabled={saving}>
              <Save className="h-4 w-4" />
              Save Week Plan
            </Button>
            <Button type="button" variant="outline" onClick={() => void load(weekId)} disabled={saving}>
              Refresh
            </Button>
          </div>

          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Selected For This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedStickers.length ? (
              selectedStickers.map((sticker) => (
                <div key={sticker.id} className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <p className="text-sm font-medium">{sticker.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stickerPriorityLabels[sticker.priority]} · {stickerStatusLabels[sticker.status]}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                No stickers selected yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Sticker Pool</CardTitle>
            <CardDescription>
              Choose stickers from your backlog and active columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(payload.availableStickers || []).slice(0, 180).map((sticker) => {
              const selected = selectedStickerIds.includes(sticker.id);
              return (
                <button
                  key={sticker.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-2 rounded-xl border border-border/70 bg-background/70 p-3 text-left hover:border-primary/35"
                  onClick={() => toggleSticker(sticker.id)}
                >
                  <div>
                    <p className="text-sm font-medium">{sticker.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stickerStatusLabels[sticker.status]} · {stickerPriorityLabels[sticker.priority]}
                    </p>
                  </div>
                  <Badge variant={selected ? "default" : "outline"}>
                    {selected ? "Selected" : "Select"}
                  </Badge>
                </button>
              );
            })}

            {!payload.availableStickers?.length ? (
              <p className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                No stickers available.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Keep week plans lean. Five to twelve stickers is usually a strong bandwidth match.
        </CardContent>
      </Card>
    </div>
  );
}
