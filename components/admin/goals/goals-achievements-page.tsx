"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Flame, Loader2, Sparkles, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AchievementsPayload = {
  totals: {
    totalXp: number;
    completedCount: number;
    streak: number;
    badgesUnlocked: number;
  };
  chart: Array<{
    dateId: string;
    xp: number;
    completed: number;
  }>;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    achieved: boolean;
    progress: number;
    target: number;
    achievedAt?: string;
  }>;
  ledger: Array<{
    id: string;
    dateId: string;
    xp: number;
    reason: string;
    createdAt?: string;
  }>;
  error?: string;
};

function metricCard(input: {
  label: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const Icon = input.icon;

  return (
    <Card className="border-border/70 bg-card/70">
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{input.label}</p>
          <p className="mt-1 text-2xl font-semibold">{input.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{input.helper}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

export function GoalsAchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [payload, setPayload] = useState<AchievementsPayload | null>(null);

  async function load() {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/achievements", { cache: "no-store" });
      const data = (await response.json()) as AchievementsPayload;
      if (!response.ok) throw new Error(data.error ?? "Unable to load achievements");
      setPayload(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load achievements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const unlockedBadges = useMemo(
    () => payload?.badges.filter((badge) => badge.achieved) ?? [],
    [payload?.badges],
  );

  if (loading || !payload) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border/70 bg-card/70">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading achievements...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metricCard({
          label: "Total XP",
          value: String(payload.totals.totalXp),
          helper: "Lifetime points from completions and streaks",
          icon: Trophy,
        })}
        {metricCard({
          label: "Completed",
          value: String(payload.totals.completedCount),
          helper: "Total stickers completed",
          icon: Award,
        })}
        {metricCard({
          label: "Current Streak",
          value: `${payload.totals.streak} day${payload.totals.streak === 1 ? "" : "s"}`,
          helper: "Daily consistency",
          icon: Flame,
        })}
        {metricCard({
          label: "Badges",
          value: `${payload.totals.badgesUnlocked}`,
          helper: "Unlocked achievements",
          icon: Sparkles,
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>14-day momentum</CardTitle>
            <CardDescription>XP and completed stickers by day.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payload.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="dateId" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.9)",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="xp" fill="rgba(14,165,233,0.75)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" fill="rgba(16,185,129,0.75)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Badge Progress</CardTitle>
            <CardDescription>{unlockedBadges.length} unlocked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {payload.badges.map((badge) => {
              const progressRatio = Math.min(1, badge.target ? badge.progress / badge.target : 0);
              return (
                <div key={badge.id} className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{badge.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                    <Badge variant={badge.achieved ? "default" : "outline"}>
                      {badge.achieved ? "Unlocked" : `${badge.progress}/${badge.target}`}
                    </Badge>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(6, Math.round(progressRatio * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Recent XP Ledger</CardTitle>
          <CardDescription>Latest point events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {payload.ledger.slice(0, 18).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border/65 bg-background/70 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{entry.reason.replaceAll("_", " ")}</span>
                <span className="ml-2 text-xs text-muted-foreground">{entry.dateId}</span>
              </span>
              <Badge variant="outline">+{entry.xp} XP</Badge>
            </div>
          ))}

          {!payload.ledger.length ? (
            <p className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
              No XP entries yet.
            </p>
          ) : null}

          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
