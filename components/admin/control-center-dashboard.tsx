import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Globe2,
  Layers3,
  LineChart,
  MonitorSmartphone,
  Radar,
  ShieldCheck,
  UserCheck,
  Users
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ControlCenterTrendChart } from "@/components/admin/control-center-trend-chart";
import type { ControlCenterSummary } from "@/lib/firestore/control-center";
import { formatDate } from "@/lib/utils";

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

type StatTone = "primary" | "accent" | "success" | "warning" | "danger";

function getToneStyles(tone: StatTone) {
  switch (tone) {
    case "accent":
      return {
        metricSurface: "border-accent/40 bg-accent/10",
        metricValue: "text-accent",
        dot: "bg-accent",
        bar: "bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--accent)/0.55))]"
      };
    case "success":
      return {
        metricSurface: "border-success/40 bg-success/10",
        metricValue: "text-success",
        dot: "bg-success",
        bar: "bg-[linear-gradient(135deg,hsl(var(--success)),hsl(var(--success)/0.55))]"
      };
    case "warning":
      return {
        metricSurface: "border-warning/40 bg-warning/10",
        metricValue: "text-warning",
        dot: "bg-warning",
        bar: "bg-[linear-gradient(135deg,hsl(var(--warning)),hsl(var(--warning)/0.55))]"
      };
    case "danger":
      return {
        metricSurface: "border-destructive/40 bg-destructive/10",
        metricValue: "text-destructive",
        dot: "bg-destructive",
        bar: "bg-[linear-gradient(135deg,hsl(var(--destructive)),hsl(var(--destructive)/0.55))]"
      };
    default:
      return {
        metricSurface: "border-primary/40 bg-primary/10",
        metricValue: "text-primary",
        dot: "bg-primary",
        bar: "bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/0.55))]"
      };
  }
}

function TrendChart({
  rows
}: {
  rows: Array<{ day: string; events: number; pageViews: number }>;
}) {
  return <ControlCenterTrendChart rows={rows} />;
}

function DistributionList({
  title,
  rows,
  emptyLabel = "No data yet.",
  tone = "primary"
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
  emptyLabel?: string;
  tone?: StatTone;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  const toneStyles = getToneStyles(tone);

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span className={`h-2.5 w-2.5 rounded-full ${toneStyles.dot}`} />
        {title}
      </p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="group cursor-pointer space-y-1 rounded-lg px-1 py-1 transition-colors hover:bg-card/75" title={`${row.label}: ${formatCount(row.count)}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/85">{row.label}</span>
              <span className="font-medium">{formatCount(row.count)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50">
              <div
                className={`h-2 rounded-full transition-all duration-300 group-hover:brightness-110 ${toneStyles.bar}`}
                style={{ width: `${Math.max(6, Math.round((row.count / max) * 100))}%` }}
              />
            </div>
          </div>
        ))}
        {!rows.length ? <p className="text-xs text-muted-foreground">{emptyLabel}</p> : null}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "primary",
  alert
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: StatTone;
  alert?: boolean;
}) {
  const toneStyles = getToneStyles(alert ? "danger" : tone);

  return (
    <Card className={`overflow-hidden border ${toneStyles.metricSurface}`}>
      <CardContent className="pt-6">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <span className={`h-2.5 w-2.5 rounded-full ${toneStyles.dot}`} />
          {label}
        </p>
        <p className={`mt-2 text-3xl font-semibold tracking-tight ${toneStyles.metricValue}`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

export function ControlCenterDashboard({ summary }: { summary: ControlCenterSummary }) {
  const profileAligned = summary.profileSync.totalCompared > 0 && summary.profileSync.alignmentPercent === 100;

  return (
    <div className="admin-workspace space-y-6">
      <Card className="overflow-hidden border-primary/35 bg-[linear-gradient(130deg,hsl(var(--primary)/0.16),hsl(var(--card)),hsl(var(--accent)/0.12))]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5 text-primary" />
                Website Statistics Dashboard
              </CardTitle>
              <CardDescription>
                Live visitor intelligence, cross-module operations, auditing, security access logs, and release versioning.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Dynamic Analytics</Badge>
              <Badge variant="secondary">Full Auditing</Badge>
              <Badge variant="secondary">Versioned Releases</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Events (30d)"
          value={formatCount(summary.traffic.events30d)}
          helper="All tracked analytics events"
          tone="primary"
        />
        <MetricCard
          label="Page Views (30d)"
          value={formatCount(summary.traffic.pageViews30d)}
          helper="Page view traffic volume"
          tone="accent"
        />
        <MetricCard
          label="Unique Sessions"
          value={formatCount(summary.traffic.uniqueSessions30d)}
          helper="Approximate visitor sessions"
          tone="success"
        />
        <MetricCard
          label="Returning Sessions"
          value={formatCount(summary.traffic.returningSessions30d)}
          helper="Sessions with multiple tracked actions"
          tone="warning"
        />
        <MetricCard
          label="SEO Issues"
          value={formatCount(summary.seo.issuesCount)}
          helper="Content metadata gaps"
          tone="danger"
          alert={summary.seo.issuesCount > 0}
        />
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/65 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Color Key</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            Events
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-accent">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            Page Views
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-success">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            Healthy Growth
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-warning">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" />
            Attention Needed
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-destructive">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            Critical / Issues
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" />
              Visitor Trend (Last 14 Days)
            </CardTitle>
            <CardDescription>Traffic movement by events and page views.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart rows={summary.traffic.byDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Visitor Intelligence
            </CardTitle>
            <CardDescription>Browser/device/source/country breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <DistributionList
              title="Top Browsers"
              rows={summary.traffic.byBrowser.map((item) => ({ label: item.browser, count: item.count }))}
              tone="accent"
            />
            <DistributionList
              title="Devices"
              rows={summary.traffic.byDevice.map((item) => ({ label: item.device, count: item.count }))}
              tone="primary"
            />
            <DistributionList
              title="Traffic Sources"
              rows={summary.traffic.bySource.map((item) => ({ label: item.source, count: item.count }))}
              tone="success"
            />
            <DistributionList
              title="Countries"
              rows={summary.traffic.byCountry.map((item) => ({ label: item.country, count: item.count }))}
              tone="warning"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              Project and Module Performance
            </CardTitle>
            <CardDescription>Traffic visibility and operational coverage across systems.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Projects</p>
                <p className="mt-1 text-2xl font-semibold">{summary.projects.total}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Projects with Traffic</p>
                <p className="mt-1 text-2xl font-semibold">{summary.projects.withTraffic}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">LinkedIn Draft Queue</p>
                <p className="mt-1 text-2xl font-semibold">{summary.projects.linkedinStudio.totalPosts}</p>
              </div>
            </div>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {summary.projects.topProjects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-border/70 bg-card/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{project.title}</p>
                      <p className="text-xs text-muted-foreground">
                        /{project.slug} · {project.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{project.views} views</p>
                      <p className="text-xs text-muted-foreground">
                        {project.lastViewedAt ? formatDate(project.lastViewedAt) : "No traffic"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!summary.projects.topProjects.length ? <p className="text-muted-foreground">No project traffic yet.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              Module Quick Control
            </CardTitle>
            <CardDescription>Go-to actions and operational counters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2">
              <span>CMS Projects</span>
              <span className="font-medium">{summary.modules.cmsProjects}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2">
              <span>Blog Posts</span>
              <span className="font-medium">{summary.modules.blogPosts}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2">
              <span>Creator Items</span>
              <span className="font-medium">{summary.modules.creatorItems}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2">
              <span>Upcoming Bookings</span>
              <span className="font-medium">{summary.modules.bookingsUpcoming}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2">
              <span>Job Applications</span>
              <span className="font-medium">{summary.modules.jobsTotal}</span>
            </div>
            <div className="grid gap-2 pt-2">
              <Link href="/admin/cms" className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 hover:border-primary">
                Open CMS
              </Link>
              <Link
                href="/admin/linkedin-studio"
                className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 hover:border-primary"
              >
                Open LinkedIn Studio
              </Link>
              <Link href="/admin/creator" className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 hover:border-primary">
                Open Creator OS
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Unified Profile Alignment
            </CardTitle>
            <CardDescription>Website profile vs LinkedIn Studio profile consistency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div
              className={`rounded-2xl border p-3 ${
                profileAligned ? "border-success/50 bg-success/10" : "border-warning/50 bg-warning/10"
              }`}
            >
              <p className="flex items-center gap-2 font-medium">
                {profileAligned ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
                Alignment Score: {summary.profileSync.alignmentPercent}% ({summary.profileSync.fieldsAligned}/{summary.profileSync.totalCompared})
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {profileAligned
                  ? "Website profile and LinkedIn profile are aligned."
                  : "Some profile fields differ. Review CMS Profile and LinkedIn Studio Profile + Voice sections."}
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Website Name</p>
                <p className="mt-1 font-medium">{summary.profileSync.websiteName || "-"}</p>
                <p className="mt-2 text-xs text-muted-foreground">Headline</p>
                <p className="font-medium">{summary.profileSync.websiteHeadline || "-"}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">LinkedIn Name</p>
                <p className="mt-1 font-medium">{summary.profileSync.linkedinDisplayName || "-"}</p>
                <p className="mt-2 text-xs text-muted-foreground">Headline</p>
                <p className="font-medium">{summary.profileSync.linkedinHeadline || "-"}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Last LinkedIn profile update:{" "}
              {summary.profileSync.lastLinkedinUpdateAt ? formatDate(summary.profileSync.lastLinkedinUpdateAt) : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-primary" />
              SEO + Content Alerts
            </CardTitle>
            <CardDescription>Incomplete metadata or content fields impacting search quality.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summary.seo.issues.map((issue) => (
              <div key={`${issue.type}-${issue.path}`} className="rounded-xl border border-border/70 bg-card/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{issue.title}</p>
                  <Badge variant="outline">{issue.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{issue.path}</p>
                <p className="mt-1 text-xs">Missing: {issue.missing.join(", ")}</p>
              </div>
            ))}
            {!summary.seo.issues.length ? (
              <p className="rounded-xl border border-success/45 bg-success/10 p-3 text-success">
                SEO baseline is healthy. No missing critical metadata fields detected.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Audit Feed
            </CardTitle>
            <CardDescription>All tracked changes by module.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Actions (7d)</p>
                <p className="mt-1 text-2xl font-semibold">{summary.auditing.actions7d}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Actions (30d)</p>
                <p className="mt-1 text-2xl font-semibold">{summary.auditing.actions30d}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.auditing.byModule.map((item) => (
                <Badge key={item.module} variant="secondary">
                  {item.module}: {item.count}
                </Badge>
              ))}
            </div>
            <div className="max-h-64 space-y-2 overflow-auto pr-1">
              {summary.auditing.recent.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.summary}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.module} · {item.action} · {item.actorEmail || "system"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-primary" />
              Admin Access Security
            </CardTitle>
            <CardDescription>Login/logout telemetry by device, browser, country, and IP mask.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Access Events (7d)</p>
                <p className="mt-1 text-2xl font-semibold">{summary.adminAccess.events7d}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Login Events (30d)</p>
                <p className="mt-1 text-2xl font-semibold">{summary.adminAccess.loginEvents30d}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <DistributionList
                title="Access Devices"
                rows={summary.adminAccess.byDevice.map((item) => ({ label: item.device, count: item.count }))}
                tone="primary"
              />
              <DistributionList
                title="Access Browsers"
                rows={summary.adminAccess.byBrowser.map((item) => ({ label: item.browser, count: item.count }))}
                tone="accent"
              />
              <DistributionList
                title="Access Countries"
                rows={summary.adminAccess.byCountry.map((item) => ({ label: item.country, count: item.count }))}
                tone="danger"
              />
            </div>

            <div className="max-h-64 space-y-2 overflow-auto pr-1">
              {summary.adminAccess.recent.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {item.eventType.toUpperCase()} · {item.actorEmail || item.actorUid || "unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.deviceType} · {item.browser} · {item.country}
                    {item.city ? `, ${item.city}` : ""} · IP {item.ipMasked || "n/a"}
                  </p>
                </div>
              ))}
              {!summary.adminAccess.recent.length ? <p className="text-muted-foreground">No admin access logs yet.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
