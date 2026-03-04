"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Bell, Building2, BriefcaseBusiness, CalendarClock, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AiIntakeCard } from "@/components/admin/job-tracker-v2/ai-intake-card";
import { JobTrackerNav } from "@/components/admin/job-tracker-v2/job-tracker-nav";
import { formatDate, jobStatusLabels } from "@/components/admin/job-tracker-v2/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { seedCompanyCategoriesIfMissing, subscribeCompanies, subscribeJobs, subscribeNotifications } from "@/lib/job-tracker/client";
import { cn } from "@/lib/utils";
import type { CompanyRecord, JobRecord, NotificationRecord } from "@/types/job-tracker-system";

function daysSince(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  return (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
}

function metricCard(input: { icon: ComponentType<{ className?: string }>; label: string; value: string; helper: string }) {
  const Icon = input.icon;
  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{input.label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{input.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{input.helper}</p>
        </div>
        <span className="rounded-lg border border-warning/35 bg-warning/10 p-2">
          <Icon className="h-4 w-4 text-warning" />
        </span>
      </CardContent>
    </Card>
  );
}

export function JobTrackerDashboardPage({ ownerId }: { ownerId: string }) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    seedCompanyCategoriesIfMissing().catch(() => {
      // Non-blocking initializer.
    });

    const unsubJobs = subscribeJobs(ownerId, setJobs, (nextError) => setError(nextError.message));
    const unsubCompanies = subscribeCompanies(ownerId, setCompanies, (nextError) => setError(nextError.message));
    const unsubNotifications = subscribeNotifications(ownerId, setNotifications, (nextError) => setError(nextError.message));

    return () => {
      unsubJobs();
      unsubCompanies();
      unsubNotifications();
    };
  }, [ownerId]);

  const jobStatusCounts = useMemo(() => {
    return jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.status] = (acc[job.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [jobs]);

  const analytics = useMemo(() => {
    const totalJobs = jobs.length;
    const interviews = jobs.filter((job) => job.status === "INTERVIEW" || job.status === "OFFER").length;
    const offers = jobs.filter((job) => job.status === "OFFER").length;
    const responded = jobs.filter((job) => ["INTERVIEW", "OFFER", "REJECTED"].includes(job.status)).length;

    const notChecked7 = companies.filter((company) => daysSince(company.lastCheckedAt) >= 7).length;
    const notChecked14 = companies.filter((company) => daysSince(company.lastCheckedAt) >= 14).length;
    const notChecked30 = companies.filter((company) => daysSince(company.lastCheckedAt) >= 30).length;

    return {
      totalJobs,
      interviewRatio: totalJobs ? interviews / totalJobs : 0,
      offerRatio: totalJobs ? offers / totalJobs : 0,
      responseRate: totalJobs ? responded / totalJobs : 0,
      notChecked7,
      notChecked14,
      notChecked30
    };
  }, [jobs, companies]);

  const chartData = useMemo(
    () =>
      ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"].map((status) => ({
        status: jobStatusLabels[status as keyof typeof jobStatusLabels],
        count: jobStatusCounts[status] ?? 0
      })),
    [jobStatusCounts]
  );

  const recentNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Job Tracker Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track companies, monitor your job pipeline, run AI intake, and manage reminders from one workspace.
        </p>
      </div>

      <JobTrackerNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCard({
          icon: BriefcaseBusiness,
          label: "Total Jobs",
          value: String(analytics.totalJobs),
          helper: "All tracked job records"
        })}
        {metricCard({
          icon: TrendingUp,
          label: "Interview Ratio",
          value: `${(analytics.interviewRatio * 100).toFixed(1)}%`,
          helper: "Interview and offer outcomes"
        })}
        {metricCard({
          icon: Building2,
          label: "Offer Ratio",
          value: `${(analytics.offerRatio * 100).toFixed(1)}%`,
          helper: "Offer conversion from total jobs"
        })}
        {metricCard({
          icon: CalendarClock,
          label: "Response Rate",
          value: `${(analytics.responseRate * 100).toFixed(1)}%`,
          helper: "Interview, offer, or rejection received"
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Jobs by Status</CardTitle>
            <CardDescription>Pipeline distribution for the current job list.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="status" stroke="rgba(255,255,255,0.45)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.45)" fontSize={12} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(9, 13, 26, 0.92)",
                    color: "#fff"
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="rgba(251, 191, 36, 0.8)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Company Check Cadence</CardTitle>
            <CardDescription>Companies not checked in key intervals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <span>7+ days</span>
              <Badge variant="outline">{analytics.notChecked7}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <span>14+ days</span>
              <Badge variant="outline">{analytics.notChecked14}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <span>30+ days</span>
              <Badge variant="outline">{analytics.notChecked30}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AiIntakeCard ownerId={ownerId} compact />
        </div>
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Latest Notifications
            </CardTitle>
            <CardDescription>In-app alerts from reminders, scans, and AI actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              recentNotifications.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs",
                    item.isRead ? "border-border/60 bg-background/35" : "border-warning/40 bg-warning/10"
                  )}
                >
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-muted-foreground">{item.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(item.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
