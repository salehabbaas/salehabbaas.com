import Link from "next/link";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";

import { NotificationCenter } from "@/components/admin/notifications/notification-center";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemInboxSummary } from "@/lib/firestore/system-inbox";
import { formatDate } from "@/lib/utils";

export function SystemInboxDashboard({ summary }: { summary: SystemInboxSummary }) {
  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Inbox</CardTitle>
          <CardDescription>Single-source global status. Module details live in their owner pages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={summary.health.status === "healthy" ? "secondary" : "outline"}
              className={summary.health.status === "healthy" ? "" : "border-destructive/45 text-destructive"}
            >
              {summary.health.status === "healthy" ? "All systems healthy" : "Action required"}
            </Badge>
            <Link href="/admin/settings/health" className="inline-flex items-center gap-1 text-primary hover:text-primary/80">
              <Wrench className="h-3.5 w-3.5" />
              Open health diagnostics
            </Link>
          </div>
        </CardContent>
      </Card>

      <NotificationCenter maxItems={80} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Global Health Summary</CardTitle>
            <CardDescription>Owner page: Settings / Health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.health.features.map((feature) => (
              <div
                key={feature.feature}
                className={`rounded-xl border p-3 ${
                  feature.status === "healthy" ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
                }`}
              >
                <p className="font-medium">{feature.label}</p>
                <p className="text-xs text-muted-foreground">
                  {feature.status === "healthy" ? "Configured" : `Missing: ${feature.missing.join(", ")}`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Issues</CardTitle>
            <CardDescription>Unresolved blocking items from health and settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summary.pendingIssues.map((issue) => (
              <div key={issue.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {issue.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
              </div>
            ))}
            {!summary.pendingIssues.length ? (
              <p className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-success">
                <CheckCircle2 className="h-4 w-4" />
                No unresolved issues.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Activity</CardTitle>
          <CardDescription>Latest admin actions only. Full audits remain in owner modules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {summary.recentAudit.slice(0, 12).map((row) => (
            <div key={row.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{row.summary}</p>
                <p className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {row.module} · {row.action} · {row.actorEmail || "system"}
              </p>
            </div>
          ))}
          {!summary.recentAudit.length ? <p className="text-muted-foreground">No audit activity yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
