"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Brain, Loader2, PlusCircle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentWeekId } from "@/lib/goals/date";
import { learningDifficultyLabels, studyTypeLabels } from "@/lib/goals/constants";
import type { GoalLearningSession, GoalLearningStats, GoalSticker } from "@/types/goals";

type DashboardPayload = {
  weekId: string;
  stats: GoalLearningStats;
  plan: {
    stickerIds: string[];
    focusAreas: string[];
    targetMinutes: number;
    notes?: string;
  } | null;
  weekMinutes: number;
  areaRows: Array<{
    area: string;
    minutes: number;
    completed: number;
    sessions: number;
  }>;
  recentSessions: GoalLearningSession[];
  learningStickers: GoalSticker[];
  error?: string;
};

type NextTaskResult = {
  stickerId: string;
  rationale: string;
  suggestedMinutes: number;
  sticker: GoalSticker;
  error?: string;
};

export function GoalsLearningDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [payload, setPayload] = useState<DashboardPayload | null>(null);

  const [weekId, setWeekId] = useState(currentWeekId("America/Montreal"));
  const [sessionMinutes, setSessionMinutes] = useState("45");
  const [sessionArea, setSessionArea] = useState("");
  const [sessionStickerId, setSessionStickerId] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [nextTaskLoading, setNextTaskLoading] = useState(false);
  const [nextTaskArea, setNextTaskArea] = useState("");
  const [nextTask, setNextTask] = useState<NextTaskResult | null>(null);

  const load = useCallback(async (nextWeekId?: string) => {
    const targetWeekId = nextWeekId ?? currentWeekId("America/Montreal");
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(
        `/api/admin/goals/learning/dashboard?weekId=${targetWeekId}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as DashboardPayload;
      if (!response.ok) throw new Error(data.error ?? "Unable to load learning dashboard");
      setPayload(data);
      setWeekId(data.weekId);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to load learning dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(currentWeekId("America/Montreal"));
  }, [load]);

  async function submitSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload) return;
    const minutes = Number(sessionMinutes);
    if (!Number.isFinite(minutes) || minutes < 5) return;

    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/goals/learning/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateId: undefined,
          stickerId: sessionStickerId || undefined,
          learningArea: sessionArea.trim() || undefined,
          minutesSpent: Math.floor(minutes),
          notes: sessionNotes.trim() || undefined,
          completed: true,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to log learning session");

      setSessionMinutes("45");
      setSessionArea("");
      setSessionStickerId("");
      setSessionNotes("");
      setStatus("Learning session logged.");
      await load(weekId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to log learning session");
    } finally {
      setSaving(false);
    }
  }

  async function suggestNextTask() {
    setNextTaskLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/ai/goals/learning/next-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          availableMinutes: Number(sessionMinutes) || 45,
          learningArea: nextTaskArea.trim() || undefined,
        }),
      });

      const data = (await response.json()) as NextTaskResult;
      if (!response.ok) throw new Error(data.error ?? "Unable to suggest next task");
      setNextTask(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to suggest next task");
    } finally {
      setNextTaskLoading(false);
    }
  }

  if (loading || !payload) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border/70 bg-card/70">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading learning dashboard...
        </p>
      </div>
    );
  }

  const weekTarget = payload.plan?.targetMinutes ?? 300;
  const weekProgressPct = Math.min(100, Math.round((payload.weekMinutes / weekTarget) * 100));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current streak</p>
            <p className="mt-1 text-2xl font-semibold">{payload.stats.currentStreak} days</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Longest streak</p>
            <p className="mt-1 text-2xl font-semibold">{payload.stats.longestStreak} days</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total minutes</p>
            <p className="mt-1 text-2xl font-semibold">{payload.stats.totalMinutes}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sessions logged</p>
            <p className="mt-1 text-2xl font-semibold">{payload.stats.sessionsCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Week Progress</CardTitle>
            <CardDescription>
              {payload.weekId} · {payload.weekMinutes}/{weekTarget} minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.max(4, weekProgressPct)}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(payload.plan?.focusAreas ?? []).map((area) => (
                <Badge key={area} variant="outline">
                  {area}
                </Badge>
              ))}
              {!payload.plan?.focusAreas?.length ? (
                <Badge variant="outline">No focus areas set</Badge>
              ) : null}
            </div>

            {payload.plan?.notes ? (
              <p className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                {payload.plan.notes}
              </p>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium">Top learning areas</p>
              {payload.areaRows.length ? (
                payload.areaRows.slice(0, 6).map((row) => (
                  <div
                    key={row.area}
                    className="flex items-center justify-between rounded-lg border border-border/65 bg-background/70 px-3 py-2 text-sm"
                  >
                    <span>{row.area}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.minutes}m · {row.completed} completed
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-border/70 bg-background/50 p-3 text-sm text-muted-foreground">
                  No learning activity yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Log Study Session</CardTitle>
            <CardDescription>Track minutes to keep streaks and recap quality high.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(event) => void submitSession(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="learning-session-minutes">Minutes</Label>
                <Input
                  id="learning-session-minutes"
                  type="number"
                  min={5}
                  step={5}
                  value={sessionMinutes}
                  onChange={(event) => setSessionMinutes(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="learning-session-area">Learning area (optional)</Label>
                <Input
                  id="learning-session-area"
                  value={sessionArea}
                  onChange={(event) => setSessionArea(event.target.value)}
                  placeholder="System design"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="learning-session-sticker">Linked sticker (optional)</Label>
                <select
                  id="learning-session-sticker"
                  value={sessionStickerId}
                  onChange={(event) => setSessionStickerId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">No linked sticker</option>
                  {payload.learningStickers.map((sticker) => (
                    <option key={sticker.id} value={sticker.id}>
                      {sticker.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="learning-session-notes">Notes (optional)</Label>
                <Input
                  id="learning-session-notes"
                  value={sessionNotes}
                  onChange={(event) => setSessionNotes(event.target.value)}
                  placeholder="What I practiced"
                />
              </div>

              <Button type="submit" disabled={saving}>
                <PlusCircle className="h-4 w-4" />
                Log Session
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>AI Next Learning Task</CardTitle>
          <CardDescription>Pick the most useful next step from your learning backlog.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              value={nextTaskArea}
              onChange={(event) => setNextTaskArea(event.target.value)}
              placeholder="Optional preferred area"
            />
            <Button type="button" variant="outline" onClick={() => void suggestNextTask()} disabled={nextTaskLoading}>
              <Brain className="h-4 w-4" />
              {nextTaskLoading ? "Thinking..." : "Suggest Next Task"}
            </Button>
          </div>

          {nextTask ? (
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="text-sm font-semibold">{nextTask.sticker.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{nextTask.rationale}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">{nextTask.suggestedMinutes} min</Badge>
                {nextTask.sticker.learning?.difficulty ? (
                  <Badge variant="outline">
                    {learningDifficultyLabels[nextTask.sticker.learning.difficulty]}
                  </Badge>
                ) : null}
                {nextTask.sticker.learning?.studyType ? (
                  <Badge variant="outline">
                    {studyTypeLabels[nextTask.sticker.learning.studyType]}
                  </Badge>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Latest logged learning activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {payload.recentSessions.slice(0, 16).map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-border/65 bg-background/70 px-3 py-2 text-sm"
            >
              <span>
                {session.dateId} · {session.learningArea || "General"}
              </span>
              <Badge variant="outline">{session.minutesSpent}m</Badge>
            </div>
          ))}
          {!payload.recentSessions.length ? (
            <p className="rounded-lg border border-dashed border-border/70 bg-background/50 p-3 text-sm text-muted-foreground">
              No sessions yet.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {status ? (
        <p className="inline-flex items-center gap-2 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          {status}
        </p>
      ) : null}
    </div>
  );
}
