import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  CalendarRange,
  CheckCircle2,
  Database,
  FileSearch,
  FileText,
  FolderKanban,
  Layers3,
  Linkedin,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminSystemsSummary } from "@/lib/firestore/admin-systems-dashboard";
import { formatDate } from "@/lib/utils";

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

type Tone = "primary" | "accent" | "success" | "warning" | "danger";

const toneStyles: Record<Tone, { surface: string; icon: string; value: string; bar: string }> = {
  primary: {
    surface: "border-primary/40 bg-primary/10",
    icon: "bg-primary text-primary-foreground",
    value: "text-primary",
    bar: "bg-primary"
  },
  accent: {
    surface: "border-accent/40 bg-accent/10",
    icon: "bg-accent text-accent-foreground",
    value: "text-accent",
    bar: "bg-accent"
  },
  success: {
    surface: "border-success/40 bg-success/10",
    icon: "bg-success text-success-foreground",
    value: "text-success",
    bar: "bg-success"
  },
  warning: {
    surface: "border-warning/40 bg-warning/10",
    icon: "bg-warning text-warning-foreground",
    value: "text-warning",
    bar: "bg-warning"
  },
  danger: {
    surface: "border-destructive/40 bg-destructive/10",
    icon: "bg-destructive text-destructive-foreground",
    value: "text-destructive",
    bar: "bg-destructive"
  }
};

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone
}: {
  icon: typeof Layers3;
  label: string;
  value: number;
  helper: string;
  tone: Tone;
}) {
  const styles = toneStyles[tone];
  return (
    <Card className={`border ${styles.surface}`}>
      <CardContent className="pt-6">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <span className={`rounded-lg p-1.5 ${styles.icon}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          {label}
        </p>
        <p className={`mt-2 text-3xl font-semibold tracking-tight ${styles.value}`}>{formatCount(value)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function Distribution({
  rows,
  tone,
  emptyLabel = "No data yet."
}: {
  rows: Array<{ label: string; count: number }>;
  tone: Tone;
  emptyLabel?: string;
}) {
  const styles = toneStyles[tone];
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground/85">{row.label}</span>
            <span className="font-medium">{formatCount(row.count)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted/45">
            <div className={`h-2 rounded-full ${styles.bar}`} style={{ width: `${Math.max(6, Math.round((row.count / max) * 100))}%` }} />
          </div>
        </div>
      ))}
      {!rows.length ? <p className="text-xs text-muted-foreground">{emptyLabel}</p> : null}
    </div>
  );
}

function StatusRow({
  label,
  total,
  published,
  hidden,
  draft
}: {
  label: string;
  total: number;
  published: number;
  hidden: number;
  draft: number;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{label}</p>
        <p className="text-sm font-semibold">{formatCount(total)}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-success/35 bg-success/10 px-2 py-1 text-success">
          Published {formatCount(published)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/35 bg-warning/10 px-2 py-1 text-warning">
          Hidden {formatCount(hidden)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/35 bg-accent/10 px-2 py-1 text-accent">
          Draft {formatCount(draft)}
        </span>
      </div>
    </div>
  );
}

export function AdminSystemsDashboard({ summary }: { summary: AdminSystemsSummary }) {
  const issueTone: Tone = summary.healthCounts.degraded > 0 ? "danger" : "success";

  return (
    <div className="admin-workspace space-y-6">
      <Card className="overflow-hidden border-primary/35 bg-[linear-gradient(130deg,hsl(var(--primary)/0.17),hsl(var(--card)),hsl(var(--accent)/0.12))]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-primary" />
                Admin Systems Dashboard
              </CardTitle>
              <CardDescription>
                Single view for LinkedIn Studio, Job Tracker, Bookings, CMS collections, creator pipeline, flags, health, and audit flow.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={summary.health.status === "healthy" ? "secondary" : "outline"} className={summary.health.status === "healthy" ? "" : "border-destructive/45 text-destructive"}>
                {summary.health.status === "healthy" ? "All systems healthy" : "System actions required"}
              </Badge>
              <Badge variant="secondary">Updated {formatDate(summary.generatedAt)}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Layers3} label="Tracked Modules" value={summary.moduleTotals.tracked} helper="Coverage modules in this dashboard" tone="primary" />
        <MetricCard
          icon={Database}
          label="Active Collections"
          value={summary.moduleTotals.activeCollections}
          helper="Collections currently storing data"
          tone="accent"
        />
        <MetricCard icon={Linkedin} label="LinkedIn Posts" value={summary.linkedin.total} helper="Draft/scheduled/published pipeline" tone="success" />
        <MetricCard icon={BriefcaseBusiness} label="Job Applications" value={summary.jobs.total} helper="Tracked by Job Tracker module" tone="warning" />
        <MetricCard icon={AlertTriangle} label="Degraded Features" value={summary.healthCounts.degraded} helper="Settings/health dependencies to resolve" tone={issueTone} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              CMS + Creator Coverage
            </CardTitle>
            <CardDescription>Color-coded status for each managed content collection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <StatusRow label="Projects" {...summary.cms.projects} />
              <StatusRow label="Blog Posts" {...summary.cms.blog} />
              <StatusRow label="Experience" {...summary.cms.experiences} />
              <StatusRow label="Services" {...summary.cms.services} />
              <StatusRow label="Certificates" {...summary.cms.certificates} />
              <StatusRow label="Social Links" {...summary.cms.socialLinks} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-primary/35 bg-primary/10 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Creator Content Items</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{formatCount(summary.creator.contentItems)}</p>
              </div>
              <div className="rounded-xl border border-accent/35 bg-accent/10 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Media Assets</p>
                <p className="mt-1 text-2xl font-semibold text-accent">{formatCount(summary.cms.mediaAssets)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-success/35 bg-success/10 px-2 py-1 text-success">
                Public variants {formatCount(summary.creator.publicVariants)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/35 bg-accent/10 px-2 py-1 text-accent">
                Unlisted variants {formatCount(summary.creator.unlistedVariants)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/35 bg-warning/10 px-2 py-1 text-warning">
                Private variants {formatCount(summary.creator.privateVariants)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Workflow Pipelines
            </CardTitle>
            <CardDescription>LinkedIn Studio, job funnel, and bookings in one panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="flex items-center gap-2 font-medium">
                <Linkedin className="h-4 w-4 text-primary" />
                LinkedIn Studio
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-lg border border-primary/35 bg-primary/10 px-2 py-1 text-primary">Draft {summary.linkedin.drafts}</span>
                <span className="rounded-lg border border-warning/35 bg-warning/10 px-2 py-1 text-warning">Scheduled {summary.linkedin.scheduled}</span>
                <span className="rounded-lg border border-success/35 bg-success/10 px-2 py-1 text-success">Published {summary.linkedin.published}</span>
                <span className="rounded-lg border border-accent/35 bg-accent/10 px-2 py-1 text-accent">Total {summary.linkedin.total}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Last activity: {summary.linkedin.lastActivityAt ? formatDate(summary.linkedin.lastActivityAt) : "No activity"}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="flex items-center gap-2 font-medium">
                <BriefcaseBusiness className="h-4 w-4 text-warning" />
                Job Tracker
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-lg border border-accent/35 bg-accent/10 px-2 py-1 text-accent">Total {summary.jobs.total}</span>
                <span className="rounded-lg border border-success/35 bg-success/10 px-2 py-1 text-success">Offers {summary.jobs.offers}</span>
                <span className="rounded-lg border border-primary/35 bg-primary/10 px-2 py-1 text-primary">Interviews {summary.jobs.interviews}</span>
                <span className="rounded-lg border border-warning/35 bg-warning/10 px-2 py-1 text-warning">No response {summary.jobs.noResponse}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="flex items-center gap-2 font-medium">
                <CalendarRange className="h-4 w-4 text-accent" />
                Bookings
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-lg border border-primary/35 bg-primary/10 px-2 py-1 text-primary">Upcoming {summary.bookings.upcoming}</span>
                <span className="rounded-lg border border-success/35 bg-success/10 px-2 py-1 text-success">Confirmed {summary.bookings.confirmed}</span>
                <span className="rounded-lg border border-warning/35 bg-warning/10 px-2 py-1 text-warning">Completed {summary.bookings.completed}</span>
                <span className="rounded-lg border border-destructive/35 bg-destructive/10 px-2 py-1 text-destructive">
                  Cancelled {summary.bookings.cancelled}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              Feature Health
            </CardTitle>
            <CardDescription>Dependency readiness across admin-controlled features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summary.health.features.map((feature) => (
              <div
                key={feature.feature}
                className={`rounded-xl border p-3 ${
                  feature.status === "healthy" ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
                }`}
              >
                <p className="flex items-center gap-2 font-medium">
                  {feature.status === "healthy" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  {feature.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {feature.status === "healthy" ? "Ready" : `Missing: ${feature.missing.join(", ")}`}
                </p>
              </div>
            ))}
            <Link href="/admin/settings/health" className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80">
              <Wrench className="h-3.5 w-3.5" />
              Open diagnostics
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Feature Flags + Pages
            </CardTitle>
            <CardDescription>Runtime toggles and public page visibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-success/35 bg-success/10 p-3">
                <p className="text-xs text-muted-foreground">Pages Enabled</p>
                <p className="mt-1 text-xl font-semibold text-success">{summary.settings.enabledPages}</p>
              </div>
              <div className="rounded-xl border border-warning/35 bg-warning/10 p-3">
                <p className="text-xs text-muted-foreground">Pages Hidden</p>
                <p className="mt-1 text-xl font-semibold text-warning">{summary.settings.hiddenPages}</p>
              </div>
              <div className="rounded-xl border border-accent/35 bg-accent/10 p-3">
                <p className="text-xs text-muted-foreground">Total Pages</p>
                <p className="mt-1 text-xl font-semibold text-accent">{summary.settings.totalPages}</p>
              </div>
            </div>
            <div className="space-y-2">
              {summary.settings.featureFlags.map((flag) => (
                <div key={flag.key} className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/70 p-2.5">
                  <span className="text-xs font-medium">{flag.label}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] ${
                      flag.enabled ? "border border-success/35 bg-success/10 text-success" : "border border-destructive/35 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {flag.enabled ? "Enabled" : "Disabled"} · {flag.source}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/admin/settings/visibility" className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80">
              <FileSearch className="h-3.5 w-3.5" />
              Open visibility settings
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-warning" />
              Auditing + Versioning
            </CardTitle>
            <CardDescription>Latest change activity and snapshot coverage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-primary/35 bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">Audit Actions (7d)</p>
                <p className="mt-1 text-xl font-semibold text-primary">{summary.auditing.actions7d}</p>
              </div>
              <div className="rounded-xl border border-accent/35 bg-accent/10 p-3">
                <p className="text-xs text-muted-foreground">Audit Actions (30d)</p>
                <p className="mt-1 text-xl font-semibold text-accent">{summary.auditing.actions30d}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">Version snapshots</p>
              <p className="mt-1 text-2xl font-semibold">{summary.versioning.totalSnapshots}</p>
              <p className="text-xs text-muted-foreground">
                Latest: {summary.versioning.latestSnapshotAt ? formatDate(summary.versioning.latestSnapshotAt) : "No snapshots yet"}
              </p>
            </div>
            <div className="space-y-2">
              {summary.auditing.recent.slice(0, 5).map((audit) => (
                <div key={audit.id} className="rounded-xl border border-border/70 bg-card/70 p-2.5">
                  <p className="line-clamp-1 text-xs font-medium">{audit.summary}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {audit.module} · {audit.action} · {formatDate(audit.createdAt)}
                  </p>
                </div>
              ))}
              {!summary.auditing.recent.length ? <p className="text-xs text-muted-foreground">No audit entries yet.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-warning" />
              Job Responses Mix
            </CardTitle>
            <CardDescription>Response distribution from Job Tracker records.</CardDescription>
          </CardHeader>
          <CardContent>
            <Distribution rows={summary.jobs.byResponse} tone="warning" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-accent" />
              Creator Platform Mix
            </CardTitle>
            <CardDescription>Variant volume by platform across creator content.</CardDescription>
          </CardHeader>
          <CardContent>
            <Distribution
              rows={summary.creator.byPlatform.map((row) => ({ label: row.platform.toUpperCase(), count: row.count }))}
              tone="accent"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
