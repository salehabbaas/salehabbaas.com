import { Activity, Clock3, KeyRound, Mail, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminLogsSummary } from "@/lib/firestore/admin-logs";

function formatDateTime(value: string) {
  if (!value) return "n/a";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "n/a";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function TimelineBadge({ type }: { type: "audit" | "access" | "email" | "activity" }) {
  const tone =
    type === "audit"
      ? "border-primary/35 bg-primary/12 text-primary"
      : type === "access"
        ? "border-success/35 bg-success/12 text-success"
        : type === "email"
          ? "border-accent/35 bg-accent/12 text-accent"
          : "border-warning/35 bg-warning/12 text-warning";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone}`}>
      {type}
    </span>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  if (status === "sent") {
    return <Badge variant="secondary">sent</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="outline" className="border-destructive/45 text-destructive">failed</Badge>;
  }
  return <Badge variant="outline">{status || "unknown"}</Badge>;
}

export function AdminLogsDashboard({ summary }: { summary: AdminLogsSummary }) {
  return (
    <div className="admin-workspace space-y-6">
      <Card className="overflow-hidden border-primary/30 bg-[linear-gradient(130deg,hsl(var(--primary)/0.16),hsl(var(--card)),hsl(var(--accent)/0.14))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin Logs
          </CardTitle>
          <CardDescription>
            Unified view for audit, access, email, and activity logs. Email logs are stored in
            <span className="mx-1 rounded bg-background/70 px-1.5 py-0.5 font-mono text-[11px]">{summary.locations.email}</span>
            collection.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-primary/20 bg-primary/10">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Latest Event</p>
            <p className="mt-1 text-sm font-semibold">{formatDateTime(summary.metrics.latestEventAt)}</p>
          </CardContent>
        </Card>
        <Card className="border-accent/20 bg-accent/10">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Audit Actions</p>
            <p className="mt-1 text-2xl font-semibold">{summary.metrics.auditActions}</p>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-success/10">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Access Events</p>
            <p className="mt-1 text-2xl font-semibold">{summary.metrics.accessEvents}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-warning/10">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Email Sent</p>
            <p className="mt-1 text-2xl font-semibold">{summary.metrics.emailSent}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Email Failed</p>
            <p className="mt-1 text-2xl font-semibold">{summary.metrics.emailFailed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              Unified Timeline
            </CardTitle>
            <CardDescription>Latest events across all log streams.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {summary.timeline.map((row) => (
              <div key={row.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
                <div className="mt-2">
                  <TimelineBadge type={row.type} />
                </div>
              </div>
            ))}
            {!summary.timeline.length ? <p className="text-sm text-muted-foreground">No log events found.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collections</CardTitle>
            <CardDescription>Exact Firestore locations used by admin logging.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="font-medium">Email activity</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{summary.locations.email}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="font-medium">Audit actions</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{summary.locations.audit}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="font-medium">Admin access</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{summary.locations.adminAccess}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="font-medium">Module activity</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{summary.locations.activity}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">
                Activity events in sample: <span className="font-semibold text-foreground">{summary.metrics.activityEvents}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent" />
              Email Activity
            </CardTitle>
            <CardDescription>Recent delivery attempts and provider statuses.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.email.slice(0, 40).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><EmailStatusBadge status={row.status} /></TableCell>
                    <TableCell>
                      <p className="font-medium">{row.subject || "No subject"}</p>
                      <p className="text-xs text-muted-foreground">{row.provider || "unknown"} · {row.trigger || "no trigger"}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.recipient || "n/a"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {!summary.email.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No email logs found.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-success" />
              Admin Access Logs
            </CardTitle>
            <CardDescription>Authentication and access events.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.adminAccess.slice(0, 40).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Badge variant="secondary">{row.eventType || "unknown"}</Badge></TableCell>
                    <TableCell>
                      <p className="font-medium">{row.actorEmail || row.actorUid || "unknown"}</p>
                      <p className="text-xs text-muted-foreground">{row.country || "unknown"}{row.city ? `, ${row.city}` : ""}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.deviceType || "unknown"} · {row.browser || "unknown"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {!summary.adminAccess.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No access logs found.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Audit Logs
            </CardTitle>
            <CardDescription>Tracked admin actions across modules.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.audit.slice(0, 40).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Badge variant="outline">{row.module || "unknown"}</Badge></TableCell>
                    <TableCell>
                      <p className="font-medium">{row.summary || row.action || "Audit event"}</p>
                      <p className="text-xs text-muted-foreground">{row.action || "unknown action"}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.actorEmail || "system"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {!summary.audit.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No audit logs found.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-warning" />
              Activity Logs
            </CardTitle>
            <CardDescription>Task movement, updates, and workflow events.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.activity.slice(0, 40).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Badge variant="secondary">{row.action || "activity"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.projectId || row.ownerId || "n/a"}
                      {(row.taskId || row.entityId) ? ` · ${row.taskId || row.entityId}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.actorId || "system"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {!summary.activity.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No activity logs found.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
