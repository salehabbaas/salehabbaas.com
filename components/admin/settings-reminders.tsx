"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase/client";
import { disablePushOnThisBrowser, getPushStatus, requestPushPermissionAndRegister } from "@/lib/notifications/push";
import {
  DEFAULT_REMINDER_SETTINGS,
  DEFAULT_USER_NOTIFICATION_PREFERENCES,
  type ReminderSettings,
  type UserNotificationPreferences
} from "@/types/notifications";

type SettingsPayload = {
  settings: ReminderSettings;
  userPreferences: UserNotificationPreferences;
  error?: string;
};

type ReminderDiagnostics = {
  nowIso: string;
  timezone: string;
  sweepCadence: string;
  quietHours: {
    start: string;
    end: string;
    activeNow: boolean;
  };
  goals: {
    enabled: boolean;
    overdueEnabled: boolean;
    overdueLookbackDays: number;
    totalCount: number;
    activeCount: number;
    overdueCount: number;
    missingDeadlineCount: number;
  };
  channels: {
    globalInAppEnabled: boolean;
    globalPushEnabled: boolean;
    userInAppEnabled: boolean;
    userPushEnabled: boolean;
    enabledDeviceCount: number;
  };
  blockers: string[];
};

type TestPushPayload = {
  diagnostics?: ReminderDiagnostics;
  testResult?: {
    notificationId: string;
    inAppCreated: boolean;
    pushAttempted: boolean;
    pushSent: number;
    pushFailed: number;
    createdAt?: string;
  };
  error?: string;
};

function windowsToInput(windows: number[]) {
  return windows.join(", ");
}

function parseWindowsInput(value: string) {
  const parsed = Array.from(
    new Set(
      value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item) && item > 0 && item <= 14 * 24 * 60)
        .map((item) => Math.floor(item))
    )
  ).sort((a, b) => b - a);

  return parsed.length ? parsed : [1440, 60];
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <Button type="submit" disabled={saving}>
      {saving ? "Saving..." : label}
    </Button>
  );
}

function CollapsibleReminderGroup({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-xl border border-border/70 bg-card/70">
      <summary className="cursor-pointer list-none p-4">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </summary>
      <div className="border-t border-border/60 p-4">{children}</div>
    </details>
  );
}

export function SettingsReminders() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [userPreferences, setUserPreferences] = useState<UserNotificationPreferences>(DEFAULT_USER_NOTIFICATION_PREFERENCES);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState("");
  const [currentUid, setCurrentUid] = useState("");
  const [diagnostics, setDiagnostics] = useState<ReminderDiagnostics | null>(null);
  const [testingPush, setTestingPush] = useState(false);
  const [pushEnabledOnBrowser, setPushEnabledOnBrowser] = useState(false);
  const [checkingPushStatus, setCheckingPushStatus] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);

  const [bookingsWindowsInput, setBookingsWindowsInput] = useState(windowsToInput(DEFAULT_REMINDER_SETTINGS.bookings.windowsMinutes));
  const [linkedinWindowsInput, setLinkedinWindowsInput] = useState(windowsToInput(DEFAULT_REMINDER_SETTINGS.linkedin.windowsMinutes));
  const [jobsWindowsInput, setJobsWindowsInput] = useState(windowsToInput(DEFAULT_REMINDER_SETTINGS.jobs.windowsMinutes));
  const [goalsWindowsInput, setGoalsWindowsInput] = useState(windowsToInput(DEFAULT_REMINDER_SETTINGS.goals.windowsMinutes));

  const hasPrimaryAdmin = useMemo(() => Boolean(settings.channels.primaryAdminUid.trim()), [settings.channels.primaryAdminUid]);
  const enabledPipelineCount = useMemo(
    () =>
      [
        settings.tasks.enabled,
        settings.bookings.enabled,
        settings.linkedin.enabled,
        settings.jobs.enabled,
        settings.goals.enabled,
        settings.audit.enabled
      ].filter(Boolean).length,
    [settings]
  );
  const enabledChannelCount = useMemo(
    () =>
      [
        settings.channels.inAppEnabled,
        settings.channels.bannerEnabled,
        settings.channels.pushEnabled,
        settings.channels.emailEnabled
      ].filter(Boolean).length,
    [settings]
  );
  const enabledPersonalChannelCount = useMemo(
    () => [userPreferences.inAppEnabled, userPreferences.bannerEnabled, userPreferences.pushEnabled].filter(Boolean).length,
    [userPreferences]
  );
  const totalWindowRules = useMemo(
    () =>
      settings.bookings.windowsMinutes.length +
      settings.linkedin.windowsMinutes.length +
      settings.jobs.windowsMinutes.length +
      settings.goals.windowsMinutes.length,
    [settings]
  );

  const loadDiagnostics = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/settings/reminders/test-push", { cache: "no-store" });
      const payload = (await response.json()) as TestPushPayload;
      if (!response.ok) throw new Error(payload.error ?? "Unable to load diagnostics");
      setDiagnostics(payload.diagnostics ?? null);
    } catch {
      setDiagnostics(null);
    }
  }, []);

  const loadPushStatus = useCallback(async (uidOverride?: string) => {
    const uid = uidOverride ?? currentUid;
    if (!uid) {
      setPushEnabledOnBrowser(false);
      setCheckingPushStatus(false);
      return;
    }

    setCheckingPushStatus(true);
    try {
      const status = await getPushStatus(uid);
      setPushEnabledOnBrowser(status.enabled);
    } catch {
      setPushEnabledOnBrowser(false);
    } finally {
      setCheckingPushStatus(false);
    }
  }, [currentUid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user?.uid ?? "");
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    void loadPushStatus();
  }, [loadPushStatus]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setStatus("");
      try {
        const response = await fetch("/api/admin/settings/reminders", { cache: "no-store" });
        const payload = (await response.json()) as SettingsPayload;
        if (!response.ok) throw new Error(payload.error ?? "Unable to load reminder settings");
        if (!mounted) return;

        setSettings(payload.settings);
        setUserPreferences(payload.userPreferences);
        setBookingsWindowsInput(windowsToInput(payload.settings.bookings.windowsMinutes));
        setLinkedinWindowsInput(windowsToInput(payload.settings.linkedin.windowsMinutes));
        setJobsWindowsInput(windowsToInput(payload.settings.jobs.windowsMinutes));
        setGoalsWindowsInput(windowsToInput(payload.settings.goals.windowsMinutes));
        void loadDiagnostics();
      } catch (error) {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Unable to load reminder settings");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [loadDiagnostics]);

  async function saveSection(section: string, payload: Record<string, unknown>) {
    setSavingSection(section);
    setStatus("");

    try {
      const response = await fetch("/api/admin/settings/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as SettingsPayload & { success?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save settings");

      setSettings(data.settings);
      setUserPreferences(data.userPreferences);
      setStatus(`Saved ${section}.`);
      void loadDiagnostics();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setSavingSection("");
    }
  }

  async function saveTasks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSection("task reminders", { tasks: settings.tasks });
  }

  async function saveBookings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSection("bookings reminders", {
      bookings: {
        ...settings.bookings,
        windowsMinutes: parseWindowsInput(bookingsWindowsInput)
      }
    });
  }

  async function saveLinkedin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSection("LinkedIn reminders", {
      linkedin: {
        ...settings.linkedin,
        windowsMinutes: parseWindowsInput(linkedinWindowsInput)
      }
    });
  }

  async function saveJobs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSection("job tracker reminders", {
      jobs: {
        ...settings.jobs,
        windowsMinutes: parseWindowsInput(jobsWindowsInput)
      }
    });
  }

  async function saveGoals(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSection("goal reminders", {
      goals: {
        ...settings.goals,
        windowsMinutes: parseWindowsInput(goalsWindowsInput)
      }
    });
  }

  async function saveAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSection("audit reminders", { audit: settings.audit });
  }

  async function saveChannels(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSection("channel settings", { channels: settings.channels });
  }

  async function saveUserPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSection("personal preferences", { userPreferences });
  }

  async function togglePushOnThisBrowser() {
    if (!currentUid) {
      setStatus("Admin session is still loading. Wait a second and try again.");
      return;
    }

    setTogglingPush(true);
    try {
      const result = pushEnabledOnBrowser
        ? await disablePushOnThisBrowser(currentUid)
        : await requestPushPermissionAndRegister(currentUid);
      setStatus(result.message);
      await Promise.all([loadDiagnostics(), loadPushStatus(currentUid)]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update push notification setting.");
    } finally {
      setTogglingPush(false);
    }
  }

  async function sendTestPushReminder() {
    setTestingPush(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/settings/reminders/test-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const payload = (await response.json()) as TestPushPayload;
      if (!response.ok) throw new Error(payload.error ?? "Unable to send test reminder notification");
      setDiagnostics(payload.diagnostics ?? null);
      if (!payload.testResult) {
        setStatus("Test notification was created, but push status was unavailable.");
        return;
      }
      setStatus(
        payload.testResult.pushAttempted
          ? `Test sent. Push success: ${payload.testResult.pushSent}, failed: ${payload.testResult.pushFailed}.`
          : "Test notification created in-app. Push was not attempted because reminder prerequisites are currently blocked."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send test reminder notification");
    } finally {
      setTestingPush(false);
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reminder Settings Hub</CardTitle>
          <CardDescription>Independent controls for tasks, bookings, LinkedIn, jobs, goals, audit, and channels.</CardDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
          {!hasPrimaryAdmin ? <p className="text-sm text-destructive">Set Primary Admin UID in channels to route booking and audit reminders.</p> : null}
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading reminder settings...</CardContent>
        </Card>
      ) : null}

      {!loading ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Setup Assistant</CardTitle>
              <CardDescription>
                Reminders are generated by background sweeps, then delivered through in-app/banner/push channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="font-medium">How reminders work</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>The scheduler checks due and overdue records every 15 minutes.</li>
                  <li>Matching items create notification documents for your admin account.</li>
                  <li>Push is sent only when push channels are enabled, device is registered, and not in quiet hours.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="font-medium">Quick test</p>
                <p className="mt-1 text-muted-foreground">
                  Register this browser for push, then send a test reminder notification using your current configuration.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={togglePushOnThisBrowser}
                    disabled={!currentUid || checkingPushStatus || togglingPush}
                  >
                    {togglingPush
                      ? pushEnabledOnBrowser
                        ? "Disabling Push..."
                        : "Enabling Push..."
                      : checkingPushStatus
                        ? "Checking Push..."
                        : pushEnabledOnBrowser
                          ? "Disable Push On This Browser"
                          : "Enable Push On This Browser"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void sendTestPushReminder()} disabled={testingPush}>
                    {testingPush ? "Sending Test..." : "Send Test Reminder Push"}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {pushEnabledOnBrowser
                    ? "Push is active on this browser. You can disable it anytime."
                    : "Push is currently disabled on this browser."}
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="font-medium">Diagnostics</p>
                {diagnostics ? (
                  <div className="mt-2 space-y-2 text-muted-foreground">
                    <p>
                      {diagnostics.sweepCadence} Current timezone: <span className="font-medium text-foreground">{diagnostics.timezone}</span>.
                    </p>
                    <p>
                      Goals overdue: <span className="font-medium text-foreground">{diagnostics.goals.overdueCount}</span> (lookback{" "}
                      {diagnostics.goals.overdueLookbackDays} days).
                    </p>
                    <p>
                      Push devices: <span className="font-medium text-foreground">{diagnostics.channels.enabledDeviceCount}</span> · Quiet hours now:{" "}
                      <span className={`font-medium ${diagnostics.quietHours.activeNow ? "text-warning" : "text-success"}`}>
                        {diagnostics.quietHours.activeNow ? "active" : "inactive"}
                      </span>
                      .
                    </p>
                    {diagnostics.blockers.length ? (
                      <div className="rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs">
                        <p className="font-semibold text-foreground">Why reminders might not appear:</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4">
                          {diagnostics.blockers.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-success/40 bg-success/10 p-2 text-xs text-success">
                        No blocking conditions detected for reminder delivery.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">Diagnostics unavailable right now. Save any section or refresh the page.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Overview</CardTitle>
              <CardDescription>Current snapshot of reminder pipelines, channels, windows, and routing.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Pipelines</p>
                <p className="mt-1 text-sm font-semibold">{enabledPipelineCount}/6 enabled</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Delivery Channels</p>
                <p className="mt-1 text-sm font-semibold">{enabledChannelCount}/4 enabled</p>
                <p className="text-xs text-muted-foreground">Personal: {enabledPersonalChannelCount}/3</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Window Rules</p>
                <p className="mt-1 text-sm font-semibold">{totalWindowRules} configured</p>
                <p className="text-xs text-muted-foreground">
                  Bookings {settings.bookings.windowsMinutes.length} · LinkedIn {settings.linkedin.windowsMinutes.length}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Routing</p>
                <p className={`mt-1 text-sm font-semibold ${hasPrimaryAdmin ? "text-success" : "text-destructive"}`}>
                  {hasPrimaryAdmin ? "Primary admin set" : "Primary admin missing"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Quiet hours {settings.channels.quietHoursStart}-{settings.channels.quietHoursEnd} ({settings.channels.timezone})
                </p>
              </div>
            </CardContent>
          </Card>

          <CollapsibleReminderGroup
            title="Tasks Reminders"
            description="Default rules used by task reminder sweeps. Task-level overrides still apply."
          >
            <form className="space-y-3" onSubmit={saveTasks}>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.tasks.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, tasks: { ...prev.tasks, enabled: event.target.checked } }))
                  }
                />
                Enable task reminder pipeline
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.tasks.default24h}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, tasks: { ...prev.tasks, default24h: event.target.checked } }))
                  }
                />
                Default 24h reminder
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.tasks.default1h}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, tasks: { ...prev.tasks, default1h: event.target.checked } }))
                  }
                />
                Default 1h reminder
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.tasks.defaultDailyOverdue}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      tasks: { ...prev.tasks, defaultDailyOverdue: event.target.checked }
                    }))
                  }
                />
                Default daily overdue reminder
              </label>
              <SaveButton saving={savingSection === "task reminders"} label="Save Tasks" />
            </form>
          </CollapsibleReminderGroup>

          <CollapsibleReminderGroup
            title="Bookings Reminders"
            description="Reminder windows in minutes before booking start (example: 1440, 60)."
          >
            <form className="space-y-3" onSubmit={saveBookings}>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.bookings.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, bookings: { ...prev.bookings, enabled: event.target.checked } }))
                  }
                />
                Enable booking reminders
              </label>
              <div className="space-y-2">
                <Label>Windows (minutes)</Label>
                <Input value={bookingsWindowsInput} onChange={(event) => setBookingsWindowsInput(event.target.value)} />
              </div>
              <SaveButton saving={savingSection === "bookings reminders"} label="Save Bookings" />
            </form>
          </CollapsibleReminderGroup>

          <CollapsibleReminderGroup
            title="LinkedIn Studio Reminders"
            description="Reminder windows before scheduled post time."
          >
            <form className="space-y-3" onSubmit={saveLinkedin}>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.linkedin.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, linkedin: { ...prev.linkedin, enabled: event.target.checked } }))
                  }
                />
                Enable LinkedIn reminders
              </label>
              <div className="space-y-2">
                <Label>Windows (minutes)</Label>
                <Input value={linkedinWindowsInput} onChange={(event) => setLinkedinWindowsInput(event.target.value)} />
              </div>
              <SaveButton saving={savingSection === "LinkedIn reminders"} label="Save LinkedIn" />
            </form>
          </CollapsibleReminderGroup>

          <CollapsibleReminderGroup title="Job Tracker Reminders" description="Follow-up windows and overdue cadence.">
            <form className="space-y-3" onSubmit={saveJobs}>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.jobs.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, jobs: { ...prev.jobs, enabled: event.target.checked } }))
                  }
                />
                Enable job reminders
              </label>
              <div className="space-y-2">
                <Label>Follow-up windows (minutes)</Label>
                <Input value={jobsWindowsInput} onChange={(event) => setJobsWindowsInput(event.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.jobs.overdue.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      jobs: { ...prev.jobs, overdue: { ...prev.jobs.overdue, enabled: event.target.checked } }
                    }))
                  }
                />
                Enable overdue reminders
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Overdue cadence (hours)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.jobs.overdue.cadenceHours}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          overdue: { ...prev.jobs.overdue, cadenceHours: Number(event.target.value || 24) }
                        }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Overdue lookback (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.jobs.overdue.lookbackDays}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        jobs: {
                          ...prev.jobs,
                          overdue: { ...prev.jobs.overdue, lookbackDays: Number(event.target.value || 30) }
                        }
                      }))
                    }
                  />
                </div>
              </div>
              <SaveButton saving={savingSection === "job tracker reminders"} label="Save Jobs" />
            </form>
          </CollapsibleReminderGroup>

          <CollapsibleReminderGroup
            title="Goals Reminders"
            description="Deadline windows and overdue rules for top goals. Overdue checks only include active goals with valid deadlines."
          >
            <form className="space-y-3" onSubmit={saveGoals}>
              <div className="rounded-lg border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground">
                <p>
                  Overdue reminders are created when: goal is not completed, deadline is in the past, and deadline is within lookback days.
                </p>
                <p className="mt-1">
                  If your goal deadline is very old, increase lookback days. Scheduler runs every 15 minutes.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.goals.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, goals: { ...prev.goals, enabled: event.target.checked } }))
                  }
                />
                Enable goals reminders
              </label>
              <div className="space-y-2">
                <Label>Deadline windows (minutes)</Label>
                <Input value={goalsWindowsInput} onChange={(event) => setGoalsWindowsInput(event.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.goals.overdue.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      goals: { ...prev.goals, overdue: { ...prev.goals.overdue, enabled: event.target.checked } }
                    }))
                  }
                />
                Enable overdue reminders
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Overdue cadence (hours)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.goals.overdue.cadenceHours}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        goals: {
                          ...prev.goals,
                          overdue: { ...prev.goals.overdue, cadenceHours: Number(event.target.value || 24) }
                        }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Overdue lookback (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.goals.overdue.lookbackDays}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        goals: {
                          ...prev.goals,
                          overdue: { ...prev.goals.overdue, lookbackDays: Number(event.target.value || 60) }
                        }
                      }))
                    }
                  />
                </div>
              </div>
              <SaveButton saving={savingSection === "goal reminders"} label="Save Goals" />
            </form>
          </CollapsibleReminderGroup>

          <CollapsibleReminderGroup
            title="Audit / System Alerts"
            description="Control alert behavior for audit log events."
          >
            <form className="space-y-3" onSubmit={saveAudit}>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.audit.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, audit: { ...prev.audit, enabled: event.target.checked } }))
                  }
                />
                Enable audit alerts
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.audit.highRiskOnly}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, audit: { ...prev.audit, highRiskOnly: event.target.checked } }))
                  }
                />
                High-risk only
              </label>
              <SaveButton saving={savingSection === "audit reminders"} label="Save Audit" />
            </form>
          </CollapsibleReminderGroup>

          <CollapsibleReminderGroup
            title="Channels + Routing"
            description="Global delivery toggles and routing defaults."
          >
            <form className="space-y-3" onSubmit={saveChannels}>
              <div className="rounded-lg border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground">
                <p>
                  Push requires all of these: global push enabled, your personal push enabled, at least one registered device, and outside quiet hours.
                </p>
                {diagnostics ? (
                  <p className="mt-1">
                    Registered devices detected:{" "}
                    <span className="font-semibold text-foreground">{diagnostics.channels.enabledDeviceCount}</span>.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={settings.channels.inAppEnabled}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        channels: { ...prev.channels, inAppEnabled: event.target.checked }
                      }))
                    }
                  />
                  In-app enabled
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={settings.channels.bannerEnabled}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        channels: { ...prev.channels, bannerEnabled: event.target.checked }
                      }))
                    }
                  />
                  Banner enabled
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={settings.channels.pushEnabled}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        channels: { ...prev.channels, pushEnabled: event.target.checked }
                      }))
                    }
                  />
                  Push enabled
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={settings.channels.emailEnabled}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        channels: { ...prev.channels, emailEnabled: event.target.checked }
                      }))
                    }
                  />
                  Email enabled
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quiet hours start (HH:MM)</Label>
                  <Input
                    value={settings.channels.quietHoursStart}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        channels: { ...prev.channels, quietHoursStart: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quiet hours end (HH:MM)</Label>
                  <Input
                    value={settings.channels.quietHoursEnd}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        channels: { ...prev.channels, quietHoursEnd: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default timezone</Label>
                  <Input
                    value={settings.channels.timezone}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, channels: { ...prev.channels, timezone: event.target.value } }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary admin UID</Label>
                  <Input
                    value={settings.channels.primaryAdminUid}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        channels: { ...prev.channels, primaryAdminUid: event.target.value.trim() }
                      }))
                    }
                    placeholder="admin uid"
                  />
                </div>
              </div>

              <SaveButton saving={savingSection === "channel settings"} label="Save Channels" />
            </form>
          </CollapsibleReminderGroup>

          <CollapsibleReminderGroup
            title="Your Personal Notification Preferences"
            description="Stored in your projectManagement settings document."
          >
            <form className="space-y-3" onSubmit={saveUserPreferences}>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={userPreferences.timezone}
                  onChange={(event) => setUserPreferences((prev) => ({ ...prev, timezone: event.target.value }))}
                />
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={userPreferences.inAppEnabled}
                    onChange={(event) =>
                      setUserPreferences((prev) => ({ ...prev, inAppEnabled: event.target.checked }))
                    }
                  />
                  In-app
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={userPreferences.bannerEnabled}
                    onChange={(event) =>
                      setUserPreferences((prev) => ({ ...prev, bannerEnabled: event.target.checked }))
                    }
                  />
                  Banner
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={userPreferences.pushEnabled}
                    onChange={(event) =>
                      setUserPreferences((prev) => ({ ...prev, pushEnabled: event.target.checked }))
                    }
                  />
                  Push
                </label>
              </div>
              <SaveButton saving={savingSection === "personal preferences"} label="Save Personal Preferences" />
            </form>
          </CollapsibleReminderGroup>
        </>
      ) : null}
    </div>
  );
}
