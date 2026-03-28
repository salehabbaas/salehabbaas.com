"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CircleDot, FolderKanban, ListChecks, Siren, Zap } from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { priorityIconMap } from "@/lib/project-management/priority-ui";
import { formatDateTime, isTaskOverdue } from "@/lib/project-management/utils";
import { priorityLabelMap, priorityToneMap, type DashboardKpis, type ImportantTaskRow, type ProjectDoc, type ProjectMetrics } from "@/types/project-management";

type DashboardPayload = {
  kpis: DashboardKpis;
  projects: ProjectDoc[];
  metricsByProject: Record<string, ProjectMetrics>;
  importantTasks: ImportantTaskRow[];
};

const fallbackKpis: DashboardKpis = {
  totalProjects: 0,
  totalTasks: 0,
  overdueTasks: 0,
  dueThisWeek: 0,
  p1Tasks: 0
};

const cardMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 }
};

export function ProjectDashboard() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const dashboardResponse = await fetch("/api/admin/projects", { cache: "no-store" });

      const dashboardData = (await dashboardResponse.json()) as DashboardPayload & { error?: string };
      if (!dashboardResponse.ok) throw new Error(dashboardData.error ?? "Unable to load project dashboard");

      setPayload(dashboardData);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load project dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = payload?.kpis ?? fallbackKpis;
  const projects = useMemo(() => payload?.projects ?? [], [payload]);
  const metricsByProject = useMemo(() => payload?.metricsByProject ?? {}, [payload]);
  const importantTasks = useMemo(() => payload?.importantTasks ?? [], [payload]);

  const orderedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bUpdated - aUpdated;
    });
  }, [projects]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to create project");

      setDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Project Management Dashboard</CardTitle>
            <CardDescription>Kanban overview, deadlines, and task priorities.</CardDescription>
            {status ? <p className="text-sm text-destructive">{status}</p> : null}
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <FolderKanban className="h-4 w-4" />
            New Project
          </Button>
        </CardHeader>
      </Card>

      <motion.section
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {[
          {
            label: "Total projects",
            value: kpis.totalProjects,
            icon: FolderKanban
          },
          {
            label: "Total tasks",
            value: kpis.totalTasks,
            icon: ListChecks
          },
          {
            label: "Overdue tasks",
            value: kpis.overdueTasks,
            icon: AlertTriangle
          },
          {
            label: "Due this week",
            value: kpis.dueThisWeek,
            icon: CalendarClock
          },
          {
            label: "Critical tasks",
            value: kpis.p1Tasks,
            icon: Siren
          },
          {
            label: "Next deadline",
            value: kpis.nextClosestDeadline ? formatDateTime(kpis.nextClosestDeadline) : "None",
            icon: Zap
          }
        ].map((item) => (
          <motion.div key={item.label} variants={cardMotion}>
            <Card className="h-full">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Each card opens the board.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {orderedProjects.map((project) => {
              const metrics = metricsByProject[project.id];
              return (
                <Link key={project.id} href={`/admin/projects/${project.id}`} className="rounded-2xl border border-border/70 bg-card/80 p-4 hover:border-primary/45">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold tracking-tight">{project.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{project.description || "No description"}</p>
                    </div>
                    <Badge variant={project.status === "archived" ? "outline" : "default"}>{project.status}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <p className="rounded-lg border border-border/70 px-2 py-1">Open: {metrics?.openTaskCount ?? 0}</p>
                    <p className="rounded-lg border border-border/70 px-2 py-1">Overdue: {metrics?.overdueCount ?? 0}</p>
                    <p className="rounded-lg border border-border/70 px-2 py-1">Critical: {metrics?.p1Count ?? 0}</p>
                    <p className="rounded-lg border border-border/70 px-2 py-1">Next: {metrics?.nextDeadline ? formatDateTime(metrics.nextDeadline) : "None"}</p>
                  </div>
                </Link>
              );
            })}
            {!orderedProjects.length && !loading ? <p className="text-sm text-muted-foreground">No projects yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Important Tasks</CardTitle>
            <CardDescription>Sorted by overdue, critical, and nearest deadline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {importantTasks.map((entry) => {
              const PriorityIcon = priorityIconMap[entry.task.priority];
              return (
                <Link
                  key={entry.task.id}
                  href={`/admin/projects/${entry.task.projectId}?taskId=${entry.task.id}`}
                  className="block rounded-xl border border-border/70 bg-card/80 p-3 hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium tracking-tight">{entry.task.title}</p>
                    <Badge className={`inline-flex items-center gap-1 ${priorityToneMap[entry.task.priority]}`}>
                      <PriorityIcon className="h-3 w-3" />
                      {priorityLabelMap[entry.task.priority]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.projectName}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className={entry.isOverdue ? "text-destructive" : "text-muted-foreground"}>
                      {entry.task.dueDate ? formatDateTime(entry.task.dueDate) : "No due date"}
                    </span>
                    {isTaskOverdue(entry.task) ? <CircleDot className="h-3.5 w-3.5 text-destructive" /> : null}
                  </div>
                </Link>
              );
            })}
            {!importantTasks.length && !loading ? <p className="text-sm text-muted-foreground">No upcoming tasks.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Start a new Kanban project with a default board.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createProject}>
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input id="project-name" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={newProjectDescription}
                onChange={(event) => setNewProjectDescription(event.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
