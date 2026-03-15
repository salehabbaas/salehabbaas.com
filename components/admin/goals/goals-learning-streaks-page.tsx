"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { currentWeekId } from "@/lib/goals/date";

type LearningStreaksPayload = {
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalMinutes: number;
    sessionsCount: number;
  };
  monthMinutes: number;
  heatmap: Array<{
    dateId: string;
    active: boolean;
    minutes: number;
  }>;
  error?: string;
};

type WeeklyRecapPayload = {
  weekId: string;
  summary: string;
  wins: string[];
  gaps: string[];
  nextFocus: string[];
  metrics: {
    sessions: number;
    completedLearningStickers: number;
    plannedLearningStickers: number;
  };
  error?: string;
};

export function GoalsLearningStreaksPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [payload, setPayload] = useState<LearningStreaksPayload | null>(null);

  const [recapLoading, setRecapLoading] = useState(false);
  const [recapWeekId, setRecapWeekId] = useState(currentWeekId("America/Montreal"));
  const [recap, setRecap] = useState<WeeklyRecapPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/goals/learning/streaks", {
        cache: "no-store",
      });
      const data = (await response.json()) as LearningStreaksPayload;
      if (!response.ok) throw new Error(data.error ?? "Unable to load learning streaks");
      setPayload(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load learning streaks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const weeklyHeatRows = useMemo(() => {
    const source = payload?.heatmap ?? [];
    const rows: typeof source[] = [];
    for (let index = 0; index < source.length; index += 7) {
      rows.push(source.slice(index, index + 7));
    }
    return rows;
  }, [payload?.heatmap]);

  async function generateRecap() {
    setRecapLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/ai/goals/learning/recap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekId: recapWeekId.trim() || undefined,
        }),
      });
      const data = (await response.json()) as WeeklyRecapPayload;
      if (!response.ok) throw new Error(data.error ?? "Unable to generate weekly recap");
      setRecap(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate weekly recap");
    } finally {
      setRecapLoading(false);
    }
  }

  if (loading || !payload) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border/70 bg-card/70">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading learning streaks...
        </p>
      </div>
    );
  }

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
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last 30 days</p>
            <p className="mt-1 text-2xl font-semibold">{payload.monthMinutes} min</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sessions</p>
            <p className="mt-1 text-2xl font-semibold">{payload.stats.sessionsCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            Learning Heatmap (last 56 days)
          </CardTitle>
          <CardDescription>Each square shows active learning minutes by day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {weeklyHeatRows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-7 gap-2">
              {row.map((cell) => (
                <div
                  key={cell.dateId}
                  title={`${cell.dateId}: ${cell.minutes} min`}
                  className={`h-7 rounded-md border ${
                    cell.active
                      ? "border-emerald-500/50 bg-emerald-500/25"
                      : "border-border/70 bg-background/70"
                  }`}
                />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>AI Weekly Learning Recap</CardTitle>
          <CardDescription>Generate a weekly summary, wins, gaps, and next focus.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[180px_auto]">
            <Input
              value={recapWeekId}
              onChange={(event) => setRecapWeekId(event.target.value)}
              placeholder="YYYY-Www"
            />
            <Button type="button" variant="outline" onClick={() => void generateRecap()} disabled={recapLoading}>
              {recapLoading ? "Generating..." : "Generate Recap"}
            </Button>
          </div>

          {recap ? (
            <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-semibold">{recap.weekId}</p>
              <p className="text-sm text-muted-foreground">{recap.summary}</p>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Sessions: {recap.metrics.sessions}</Badge>
                <Badge variant="outline">
                  Completed stickers: {recap.metrics.completedLearningStickers}
                </Badge>
                <Badge variant="outline">
                  Planned stickers: {recap.metrics.plannedLearningStickers}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wins</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {recap.wins.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gaps</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {recap.gaps.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next focus</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {recap.nextFocus.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
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
