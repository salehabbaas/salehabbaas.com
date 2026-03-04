"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Download, FileSpreadsheet, Loader2 } from "lucide-react";

import { JobTrackerNav } from "@/components/admin/job-tracker-v2/job-tracker-nav";
import { formatDateTime, monthInputValue } from "@/components/admin/job-tracker-v2/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { subscribeMonthlyExports } from "@/lib/job-tracker/client";
import { callExportMonthlyXlsx } from "@/lib/job-tracker/functions-client";
import type { MonthlyExportRecord } from "@/types/job-tracker-system";

export function JobTrackerExportsPage({ ownerId }: { ownerId: string }) {
  const [month, setMonth] = useState(monthInputValue());
  const [generateOpen, setGenerateOpen] = useState(false);
  const [exports, setExports] = useState<MonthlyExportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsub = subscribeMonthlyExports(ownerId, setExports, (error) => setStatus(error.message));
    return () => unsub();
  }, [ownerId]);

  async function generateExport() {
    if (!month) {
      setStatus("Select a month first.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const result = await callExportMonthlyXlsx({ month });
      setStatus(`Export ready for ${result.month}.`);
      setGenerateOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate export.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Monthly YMCA Export</h1>
        <p className="text-sm text-muted-foreground">
          Generate XLSX exports with the exact YMCA Canada column order and dropdown validation values.
        </p>
      </div>

      <JobTrackerNav />

      <Card className="overflow-hidden border-border/60 bg-card/70">
        <CardContent className="relative p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsla(var(--warning),0.15),transparent_58%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Export actions</p>
              <p className="text-xs text-muted-foreground">
                Open export form only when you are ready to generate YMCA monthly XLSX.
              </p>
            </div>
            <Button
              type="button"
              variant="cta"
              className="transition-all duration-300 hover:-translate-y-0.5"
              onClick={() => setGenerateOpen(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Generate Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Available Exports</CardTitle>
          <CardDescription>{exports.length} export files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {exports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exports generated yet.</p>
          ) : (
            exports.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{row.month}</p>
                  <p className="text-xs text-muted-foreground">Created {formatDateTime(row.createdAt)}</p>
                </div>
                <Link
                  href={row.fileUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs text-warning"
                >
                  Download
                  <Download className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(7,12,23,0.95)_36%)]">
          <DialogHeader className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <DialogTitle>Generate Export</DialogTitle>
            <DialogDescription>Output path: exports/{"{userId}"}/{"{YYYY-MM}"}/job-tracker-export.xlsx</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <CalendarClock className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="w-full pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="cta"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => void generateExport()}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                Generate XLSX
              </Button>
              <Button
                type="button"
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => setGenerateOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
