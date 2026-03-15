"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { GoalReminderRuleDoc } from "@/types/goals";

type SettingsPayload = {
  settings: GoalReminderRuleDoc;
  error?: string;
};

export function GoalsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [settings, setSettings] = useState<GoalReminderRuleDoc | null>(null);

  async function load() {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/settings", { cache: "no-store" });
      const data = (await response.json()) as SettingsPayload;
      if (!response.ok) throw new Error(data.error ?? "Unable to load settings");
      setSettings(data.settings);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;

    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enableDailyBrief: settings.enableDailyBrief,
          enableWrapUp: settings.enableWrapUp,
          enableWeeklyPlanning: settings.enableWeeklyPlanning,
          dailyBriefTime: settings.dailyBriefTime,
          wrapUpTime: settings.wrapUpTime,
          weeklyPlanningTime: settings.weeklyPlanningTime,
          quietHoursStart: settings.quietHoursStart,
          quietHoursEnd: settings.quietHoursEnd,
          timezone: settings.timezone,
          forceDailyPlan: settings.forceDailyPlan,
          minTasksRequired: settings.minTasksRequired,
          maxTasksRecommended: settings.maxTasksRecommended,
          streakMode: settings.streakMode,
        }),
      });

      const data = (await response.json()) as SettingsPayload;
      if (!response.ok) throw new Error(data.error ?? "Unable to save settings");

      setSettings(data.settings);
      setStatus("Goals settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border/70 bg-card/70">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading goals settings...
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void save(event)}>
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Reminder toggles</CardTitle>
          <CardDescription>Daily brief, wrap-up, and weekly planning nudges.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <label className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={settings.enableDailyBrief}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, enableDailyBrief: event.target.checked } : prev)}
            />
            Enable daily brief
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={settings.enableWrapUp}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, enableWrapUp: event.target.checked } : prev)}
            />
            Enable wrap-up reminder
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={settings.enableWeeklyPlanning}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, enableWeeklyPlanning: event.target.checked } : prev)}
            />
            Enable weekly planning reminder
          </label>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Schedule + quiet hours</CardTitle>
          <CardDescription>Default timezone should stay set to America/Montreal unless needed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="goals-daily-time">Daily brief time</Label>
            <Input
              id="goals-daily-time"
              type="time"
              value={settings.dailyBriefTime}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, dailyBriefTime: event.target.value } : prev)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals-wrap-time">Wrap-up time</Label>
            <Input
              id="goals-wrap-time"
              type="time"
              value={settings.wrapUpTime}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, wrapUpTime: event.target.value } : prev)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals-weekly-time">Weekly planning time</Label>
            <Input
              id="goals-weekly-time"
              type="time"
              value={settings.weeklyPlanningTime}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, weeklyPlanningTime: event.target.value } : prev)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals-quiet-start">Quiet hours start</Label>
            <Input
              id="goals-quiet-start"
              type="time"
              value={settings.quietHoursStart}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, quietHoursStart: event.target.value } : prev)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals-quiet-end">Quiet hours end</Label>
            <Input
              id="goals-quiet-end"
              type="time"
              value={settings.quietHoursEnd}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, quietHoursEnd: event.target.value } : prev)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals-timezone">Timezone</Label>
            <Input
              id="goals-timezone"
              value={settings.timezone}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, timezone: event.target.value } : prev)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Planning rules + streak</CardTitle>
          <CardDescription>Control force-plan behavior and streak logic.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <label className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm md:col-span-3">
            <input
              type="checkbox"
              checked={settings.forceDailyPlan}
              onChange={(event) => setSettings((prev) => prev ? { ...prev, forceDailyPlan: event.target.checked } : prev)}
            />
            Force daily plan before start
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="goals-min-required">Min tasks required</Label>
            <Input
              id="goals-min-required"
              type="number"
              min={1}
              max={20}
              value={settings.minTasksRequired}
              onChange={(event) =>
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        minTasksRequired: Math.max(1, Number(event.target.value || 1)),
                      }
                    : prev,
                )
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals-max-recommended">Max tasks recommended</Label>
            <Input
              id="goals-max-recommended"
              type="number"
              min={1}
              max={30}
              value={settings.maxTasksRecommended}
              onChange={(event) =>
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        maxTasksRecommended: Math.max(1, Number(event.target.value || 1)),
                      }
                    : prev,
                )
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goals-streak-mode">Streak mode</Label>
            <Select
              id="goals-streak-mode"
              value={settings.streakMode}
              onChange={(event) =>
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        streakMode: event.target.value as "completion_or_review" | "completion_only",
                      }
                    : prev,
                )
              }
            >
              <option value="completion_or_review">Completion or reviewed day</option>
              <option value="completion_only">Completion only</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4" />
          Save Goals Settings
        </Button>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={saving}>
          Reload
        </Button>
      </div>

      {status ? <p className="text-sm text-primary">{status}</p> : null}
    </form>
  );
}
