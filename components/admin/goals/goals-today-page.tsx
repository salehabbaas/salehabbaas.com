"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Play, RotateCcw, Sparkles, StopCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { humanDayLabel, todayDateId } from "@/lib/goals/date";
import { stickerPriorityLabels, stickerStatusLabels } from "@/lib/goals/constants";
import type { GoalDayPlan, GoalReminderRuleDoc, GoalSticker } from "@/types/goals";

type TodayPayload = {
  dateId: string;
  settings: GoalReminderRuleDoc;
  dayPlan: GoalDayPlan | null;
  stickers: GoalSticker[];
  planStickers: GoalSticker[];
  availableForToday: GoalSticker[];
  error?: string;
};

function planProgress(planStickers: GoalSticker[]) {
  if (!planStickers.length) return { completed: 0, total: 0, ratio: 0 };
  const completed = planStickers.filter((sticker) => sticker.status === "done").length;
  const total = planStickers.length;
  return {
    completed,
    total,
    ratio: completed / total,
  };
}

export function GoalsTodayPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [payload, setPayload] = useState<TodayPayload | null>(null);
  const [dateId, setDateId] = useState(todayDateId("America/Montreal"));

  const [reviewOpen, setReviewOpen] = useState(false);
  const [whatWentWell, setWhatWentWell] = useState("");
  const [whatToImprove, setWhatToImprove] = useState("");
  const [autoReschedule, setAutoReschedule] = useState<"none" | "tomorrow" | "this_week" | "inbox">("tomorrow");
  const [aiSummary, setAiSummary] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const load = useCallback(async (nextDateId: string) => {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/goals/day-plan?dateId=${nextDateId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as TodayPayload;
      if (!response.ok) throw new Error(data.error ?? "Unable to load today plan");
      setPayload(data);
      setDateId(nextDateId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load today plan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlDate = searchParams.get("dateId") || searchParams.get("date");
    const fallbackDateId = todayDateId("America/Montreal");
    const initialDateId =
      typeof urlDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)
        ? urlDate
        : fallbackDateId;
    void load(initialDateId);
  }, [load, searchParams]);

  const selectedStickerIds = useMemo(
    () => payload?.dayPlan?.stickerIds ?? [],
    [payload?.dayPlan?.stickerIds],
  );

  const stickerById = useMemo(() => {
    const map = new Map<string, GoalSticker>();
    payload?.stickers.forEach((sticker) => map.set(sticker.id, sticker));
    return map;
  }, [payload?.stickers]);

  const planStickers = useMemo(
    () => selectedStickerIds
      .map((id) => stickerById.get(id) ?? null)
      .filter((item): item is GoalSticker => Boolean(item)),
    [selectedStickerIds, stickerById],
  );

  const availableStickers = useMemo(
    () => payload?.availableForToday ?? [],
    [payload?.availableForToday],
  );

  const progress = useMemo(() => planProgress(planStickers), [planStickers]);

  const rules = payload?.settings;
  const forceEnabled = rules?.forceDailyPlan ?? false;
  const minRequired = rules?.minTasksRequired ?? 1;
  const canStart = !forceEnabled || selectedStickerIds.length >= minRequired;
  const started = Boolean(payload?.dayPlan?.startedAt);
  const reviewed = Boolean(payload?.dayPlan?.reviewedAt);

  async function saveStickerIds(nextStickerIds: string[]) {
    if (!payload) return;

    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/day-plan", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateId: payload.dateId,
          stickerIds: nextStickerIds,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to update plan");

      await load(payload.dateId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update plan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStickerInPlan(stickerId: string) {
    const inPlan = selectedStickerIds.includes(stickerId);
    const nextStickerIds = inPlan
      ? selectedStickerIds.filter((id) => id !== stickerId)
      : [...selectedStickerIds, stickerId];
    await saveStickerIds(nextStickerIds);
  }

  async function startDay() {
    if (!payload) return;

    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/day-plan/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateId: payload.dateId,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to start day");
      await load(payload.dateId);
      setStatus("Day started. Stay in flow.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to start day");
    } finally {
      setSaving(false);
    }
  }

  async function completeSticker(sticker: GoalSticker) {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/goals/stickers/${sticker.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ complete: true, status: "done" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to complete sticker");
      await load(payload?.dateId || todayDateId("America/Montreal"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to complete sticker");
    } finally {
      setSaving(false);
    }
  }

  async function submitReview() {
    if (!payload) return;

    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/day-plan/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateId: payload.dateId,
          whatWentWell,
          whatToImprove,
          autoReschedule,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to review day");

      setReviewOpen(false);
      setWhatWentWell("");
      setWhatToImprove("");
      setAutoReschedule("tomorrow");
      setAiSummary("");
      await load(payload.dateId);
      setStatus("Review saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to review day");
    } finally {
      setSaving(false);
    }
  }

  async function generateAiSummary() {
    if (!payload) return;

    setGeneratingSummary(true);
    setStatus("");

    try {
      const response = await fetch("/api/ai/goals/end-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateId: payload.dateId,
          whatWentWell,
          whatToImprove,
          completedStickerIds: planStickers.filter((sticker) => sticker.status === "done").map((sticker) => sticker.id),
        }),
      });
      const data = (await response.json()) as { summary?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to generate AI summary");
      setAiSummary(data.summary || "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate AI summary");
    } finally {
      setGeneratingSummary(false);
    }
  }

  if (loading || !payload || !rules) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border/70 bg-card/70">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading today plan...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>{humanDayLabel(payload.dateId, rules.timezone)}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={dateId}
                onChange={(event) => {
                  const next = event.target.value;
                  setDateId(next);
                  void load(next);
                }}
                className="h-8 w-[170px]"
              />
              <Badge variant="outline">{progress.completed}/{progress.total} done</Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Build your day intentionally, execute checklist mode, then run an end-of-day review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {forceEnabled && selectedStickerIds.length < minRequired ? (
            <div className="rounded-xl border border-amber-400/45 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">Force daily plan is enabled.</p>
              <p className="text-muted-foreground">
                Add at least {minRequired} sticker(s) before starting your day.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void startDay()} disabled={saving || started || !canStart}>
              <Play className="h-4 w-4" />
              {started ? "Day Started" : "Start Day"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setReviewOpen(true)} disabled={saving || !started || reviewed}>
              <StopCircle className="h-4 w-4" />
              {reviewed ? "Review Complete" : "End Day Review"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void load(payload.dateId)} disabled={saving}>
              <RotateCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Checklist Mode</CardTitle>
            <CardDescription>
              Track execution for stickers in this day plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {payload.dayPlan?.aiSummary ? (
              <div className="rounded-xl border border-primary/35 bg-primary/10 p-3 text-sm text-primary">
                {payload.dayPlan.aiSummary}
              </div>
            ) : null}
            {planStickers.length ? (
              planStickers.map((sticker) => (
                <div
                  key={sticker.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-background/70 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{sticker.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stickerPriorityLabels[sticker.priority]} priority · {stickerStatusLabels[sticker.status]}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={sticker.status === "done" ? "default" : "outline"}
                    disabled={saving || sticker.status === "done"}
                    onClick={() => void completeSticker(sticker)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {sticker.status === "done" ? "Done" : "Complete"}
                  </Button>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                No stickers selected for this day.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Add Stickers to Today</CardTitle>
            <CardDescription>
              Choose from inbox, this week, and current day stickers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableStickers.length ? (
              availableStickers.slice(0, 80).map((sticker) => {
                const selected = selectedStickerIds.includes(sticker.id);
                return (
                  <button
                    key={sticker.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-2 rounded-xl border border-border/70 bg-background/70 p-3 text-left hover:border-primary/35"
                    onClick={() => void toggleStickerInPlan(sticker.id)}
                    disabled={saving}
                  >
                    <div>
                      <p className="text-sm font-medium">{sticker.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stickerStatusLabels[sticker.status]} · {stickerPriorityLabels[sticker.priority]}
                      </p>
                    </div>
                    <Badge variant={selected ? "default" : "outline"}>{selected ? "Added" : "Add"}</Badge>
                  </button>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                No available stickers to add.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Day Review</DialogTitle>
            <DialogDescription>
              Capture reflection, then auto-reschedule incomplete stickers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="goals-review-well">What went well</Label>
              <Textarea
                id="goals-review-well"
                value={whatWentWell}
                onChange={(event) => setWhatWentWell(event.target.value)}
                rows={3}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goals-review-improve">What to improve</Label>
              <Textarea
                id="goals-review-improve"
                value={whatToImprove}
                onChange={(event) => setWhatToImprove(event.target.value)}
                rows={3}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goals-review-reschedule">Auto-reschedule incomplete items</Label>
              <Select
                id="goals-review-reschedule"
                value={autoReschedule}
                onChange={(event) =>
                  setAutoReschedule(
                    event.target.value as "none" | "tomorrow" | "this_week" | "inbox",
                  )
                }
              >
                <option value="tomorrow">Move to tomorrow</option>
                <option value="this_week">Move to this week</option>
                <option value="inbox">Move back to inbox</option>
                <option value="none">Keep unchanged</option>
              </Select>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">AI summary</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void generateAiSummary()}
                  disabled={generatingSummary}
                >
                  {generatingSummary ? "Generating..." : "Generate summary"}
                </Button>
              </div>
              {aiSummary ? <p className="mt-2 text-sm text-muted-foreground">{aiSummary}</p> : null}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitReview()} disabled={saving}>
              <Sparkles className="h-4 w-4" />
              Save Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
