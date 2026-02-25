"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminHealthStatus } from "@/types/site-settings";
import { formatDate } from "@/lib/utils";

export function SettingsHealth() {
  const [health, setHealth] = useState<AdminHealthStatus | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setStatus("");
      try {
        const response = await fetch("/api/admin/settings/health");
        const payload = (await response.json()) as AdminHealthStatus & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load health");
        if (!mounted) return;
        setHealth(payload);
      } catch (error) {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Unable to load health");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feature Health Diagnostics</CardTitle>
          <CardDescription>Central owner page for dependency and key readiness.</CardDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardHeader>
        {health ? (
          <CardContent className="flex flex-wrap items-center gap-2">
            <Badge
              variant={health.status === "healthy" ? "secondary" : "outline"}
              className={health.status === "healthy" ? "" : "border-destructive/45 text-destructive"}
            >
              {health.status === "healthy" ? "All features healthy" : "Degraded features detected"}
            </Badge>
            <p className="text-xs text-muted-foreground">Updated {formatDate(health.generatedAt)}</p>
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {health?.features.map((feature) => (
          <Card key={feature.feature} className={feature.status === "healthy" ? "border-success/45 bg-success/10" : "border-destructive/45 bg-destructive/10"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {feature.status === "healthy" ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                {feature.label}
              </CardTitle>
              <CardDescription>
                {feature.status === "healthy" ? "No missing dependencies." : `Missing: ${feature.missing.join(", ")}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {feature.dependencies.map((dependency) => (
                <div key={`${feature.feature}-${dependency.key}`} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                  <span>{dependency.label}</span>
                  <Badge
                    variant={dependency.configured ? "secondary" : "outline"}
                    className={dependency.configured ? "" : "border-destructive/45 text-destructive"}
                  >
                    {dependency.configured ? "Configured" : "Missing"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && !health ? <p className="text-sm text-muted-foreground">Loading health diagnostics...</p> : null}
    </div>
  );
}
