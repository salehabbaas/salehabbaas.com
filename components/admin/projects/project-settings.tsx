"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Plus, RefreshCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { defaultBoardColumns, type BoardColumn, type BoardDoc, type ProjectDoc } from "@/types/project-management";

type ProjectSettingsProps = {
  projectId: string;
};

type ProjectPayload = {
  project: ProjectDoc;
  board: BoardDoc | null;
};

type UserSettingsPayload = {
  emailRemindersEnabled: boolean;
  calendarIcsToken: string;
  timezone: string;
  subscriptionUrl: string;
};

function makeColumnId(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `column-${Date.now()}`
  );
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [board, setBoard] = useState<BoardDoc | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] = useState<ProjectDoc["status"]>("active");

  const [boardName, setBoardName] = useState("Kanban Board");
  const [columns, setColumns] = useState<BoardColumn[]>(defaultBoardColumns);

  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true);
  const [timezone, setTimezone] = useState("UTC");
  const [subscriptionUrl, setSubscriptionUrl] = useState("");

  const [savingProject, setSavingProject] = useState(false);
  const [savingBoard, setSavingBoard] = useState(false);
  const [savingUserSettings, setSavingUserSettings] = useState(false);

  const orderedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);

  const load = useCallback(async () => {
    setLoading(true);
    setStatus("");

    try {
      const [projectResponse, settingsResponse] = await Promise.all([
        fetch(`/api/admin/projects/${projectId}`, { cache: "no-store" }),
        fetch("/api/admin/projects/settings", { cache: "no-store" })
      ]);

      const projectData = (await projectResponse.json()) as ProjectPayload & { error?: string };
      if (!projectResponse.ok) throw new Error(projectData.error ?? "Unable to load project settings");

      const userData = (await settingsResponse.json()) as UserSettingsPayload & { error?: string };
      if (!settingsResponse.ok) throw new Error(userData.error ?? "Unable to load user settings");

      setProject(projectData.project);
      setBoard(projectData.board);
      setProjectName(projectData.project.name);
      setProjectDescription(projectData.project.description);
      setProjectStatus(projectData.project.status);

      setBoardName(projectData.board?.name ?? "Kanban Board");
      setColumns(projectData.board?.columns?.length ? projectData.board.columns : defaultBoardColumns);

      setEmailRemindersEnabled(userData.emailRemindersEnabled);
      setTimezone(userData.timezone);
      setSubscriptionUrl(userData.subscriptionUrl);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProject(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          status: projectStatus
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save project settings");

      setStatus("Project settings saved.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save project settings");
    } finally {
      setSavingProject(false);
    }
  }

  async function saveBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingBoard(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/board`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: board?.id,
          name: boardName,
          columns: orderedColumns
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save board settings");

      setStatus("Board settings saved.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save board settings");
    } finally {
      setSavingBoard(false);
    }
  }

  async function saveUserSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUserSettings(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/projects/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailRemindersEnabled,
          timezone
        })
      });

      const data = (await response.json()) as UserSettingsPayload & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save user settings");

      setSubscriptionUrl(data.subscriptionUrl);
      setStatus("Reminder and calendar settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save user settings");
    } finally {
      setSavingUserSettings(false);
    }
  }

  async function regenerateToken() {
    setSavingUserSettings(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/projects/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateCalendarToken: true })
      });

      const data = (await response.json()) as UserSettingsPayload & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to regenerate token");

      setSubscriptionUrl(data.subscriptionUrl);
      setStatus("Calendar token regenerated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to regenerate token");
    } finally {
      setSavingUserSettings(false);
    }
  }

  async function copySubscriptionUrl() {
    if (!subscriptionUrl) return;
    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      setStatus("Subscription URL copied.");
    } catch {
      setStatus("Unable to copy URL. Copy manually from the input field.");
    }
  }

  function updateColumn(index: number, patch: Partial<BoardColumn>) {
    setColumns((prev) => prev.map((column, idx) => (idx === index ? { ...column, ...patch } : column)));
  }

  function addColumn() {
    setColumns((prev) => {
      const nextOrder = prev.length;
      const name = `Column ${nextOrder + 1}`;
      return [...prev, { id: makeColumnId(name), name, order: nextOrder }];
    });
  }

  function removeColumn(index: number) {
    setColumns((prev) => prev.filter((_, idx) => idx !== index).map((column, order) => ({ ...column, order })));
  }

  if (loading) {
    return (
      <div className="admin-workspace">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading settings...</CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="admin-workspace">
        <Card>
          <CardHeader>
            <CardTitle>Project not found</CardTitle>
            <CardDescription>{status || "Unable to load this project."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/projects">Back to projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
          <CardDescription>Manage project metadata, board columns, and personal reminders/calendar integration.</CardDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProject} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={projectStatus} onChange={(event) => setProjectStatus(event.target.value as ProjectDoc["status"])}>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </Select>
            </div>
            <Button type="submit" disabled={savingProject}>
              {savingProject ? "Saving..." : "Save Project"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Board Columns</CardTitle>
            <CardDescription>Set status lanes, order, and optional WIP limits.</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={addColumn}>
            <Plus className="h-4 w-4" />
            Column
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveBoard} className="space-y-4">
            <div className="space-y-2">
              <Label>Board name</Label>
              <Input value={boardName} onChange={(event) => setBoardName(event.target.value)} required />
            </div>

            <div className="space-y-3">
              {orderedColumns.map((column, index) => (
                <div key={`${column.id}-${index}`} className="grid gap-2 rounded-2xl border border-border/70 p-3 md:grid-cols-[1fr_1fr_120px_80px]">
                  <Input value={column.name} onChange={(event) => updateColumn(index, { name: event.target.value })} placeholder="Column name" required />
                  <Input
                    value={column.id}
                    onChange={(event) => updateColumn(index, { id: event.target.value.trim() || makeColumnId(column.name) })}
                    placeholder="Column id"
                    required
                  />
                  <Input
                    type="number"
                    min={0}
                    value={column.order}
                    onChange={(event) => updateColumn(index, { order: Number(event.target.value || 0) })}
                    placeholder="Order"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={column.wipLimit ?? ""}
                      onChange={(event) =>
                        updateColumn(index, {
                          wipLimit: event.target.value ? Number(event.target.value) : undefined
                        })
                      }
                      placeholder="WIP"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => removeColumn(index)} disabled={orderedColumns.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={savingBoard}>
              {savingBoard ? "Saving..." : "Save Board"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Reminders + iPhone Calendar (ICS)</CardTitle>
          <CardDescription>Manage your reminder behavior and subscribed calendar feed token.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveUserSettings} className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={emailRemindersEnabled} onChange={(event) => setEmailRemindersEnabled(event.target.checked)} />
              Enable email reminders
            </label>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="America/Toronto" required />
            </div>

            <div className="space-y-2">
              <Label>Subscription URL</Label>
              <div className="flex flex-col gap-2 md:flex-row">
                <Input value={subscriptionUrl} readOnly className="font-mono text-xs" />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={copySubscriptionUrl} disabled={!subscriptionUrl}>
                    <Copy className="h-4 w-4" />
                    Copy URL
                  </Button>
                  <Button type="button" variant="outline" onClick={regenerateToken} disabled={savingUserSettings}>
                    <RefreshCcw className="h-4 w-4" />
                    Generate Calendar Token
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/80 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">iPhone subscription steps</p>
              <p className="mt-2">Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar.</p>
              <p className="mt-1">Paste the URL above, then save.</p>
            </div>

            <Button type="submit" disabled={savingUserSettings}>
              {savingUserSettings ? "Saving..." : "Save Reminder Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
