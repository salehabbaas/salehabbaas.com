"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { AtsIssue, AtsResult, ResumeDocumentRecord } from "@/types/resume-studio";

function groupedIssues(issues: AtsIssue[]) {
  return {
    keywords: issues.filter((issue) => issue.group === "keywords"),
    sections: issues.filter((issue) => issue.group === "sections"),
    formatting: issues.filter((issue) => issue.group === "formatting"),
    readability: issues.filter((issue) => issue.group === "readability")
  };
}

export function EditorAtsModal({
  open,
  onOpenChange,
  documentRecord
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentRecord: ResumeDocumentRecord;
}) {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [result, setResult] = useState<AtsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsingUrl, setParsingUrl] = useState(false);
  const [status, setStatus] = useState("");

  const grouped = useMemo(() => groupedIssues(result?.issues ?? []), [result?.issues]);

  async function runCheck() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/resume-studio/ats-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: documentRecord.id,
          jobId: documentRecord.linkedJobId || undefined,
          pastedJobDescription: jobDescription || undefined
        })
      });
      const payload = (await response.json()) as AtsResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "ATS check failed");
      setResult(payload);
      setStatus(`ATS score: ${payload.score}%`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ATS check failed");
    } finally {
      setLoading(false);
    }
  }

  async function parseJobUrl() {
    if (!jobUrl.trim()) return;
    setParsingUrl(true);
    setStatus("");
    try {
      const response = await fetch("/api/resume-studio/job/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() })
      });
      const payload = (await response.json()) as {
        error?: string;
        normalizedJobDescription?: string;
        confidence?: number;
      };
      if (!response.ok || !payload.normalizedJobDescription) {
        throw new Error(payload.error || "Unable to parse job URL");
      }
      setJobDescription(payload.normalizedJobDescription);
      setStatus(`Job URL parsed (${Math.round((payload.confidence ?? 0) * 100)}%).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to parse job URL");
    } finally {
      setParsingUrl(false);
    }
  }

  async function tailorToJob() {
    if (!documentRecord.linkedJobId) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/resume-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseDocId: documentRecord.id,
          jobId: documentRecord.linkedJobId
        })
      });
      const payload = (await response.json()) as { error?: string; docId?: string };
      if (!response.ok || !payload.docId) throw new Error(payload.error || "Unable to tailor resume");
      onOpenChange(false);
      router.push(`/admin/resume-studio/${payload.docId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to tailor resume");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>ATS Check</DialogTitle>
          <DialogDescription>Run ATS scoring, keyword matching, and suggestions without leaving the editor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Score</p>
                <p className="text-3xl font-semibold">{result?.score ?? documentRecord.ats.lastScore ?? "-"}%</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {documentRecord.linkedJobId ? (
                  <Button variant="outline" onClick={tailorToJob} disabled={loading}>
                    <Sparkles className="h-4 w-4" />
                    Tailor to Job
                  </Button>
                ) : null}
                <Button onClick={runCheck} disabled={loading}>
                  <ClipboardCheck className="h-4 w-4" />
                  {loading ? "Checking..." : "Analyze"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                value={jobUrl}
                onChange={(event) => setJobUrl(event.target.value)}
                placeholder="Parse JD from URL"
              />
              <Button variant="outline" onClick={parseJobUrl} disabled={parsingUrl}>
                {parsingUrl ? "Parsing..." : "Parse URL"}
              </Button>
            </div>
            <Textarea
              rows={6}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste target job description"
            />
          </div>

          {result ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="mb-2 text-sm font-medium">Keyword Matrix</p>
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-1">Keyword</th>
                        <th className="pb-1">In Resume</th>
                        <th className="pb-1">In JD</th>
                        <th className="pb-1">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.keywordMatrix.map((row) => (
                        <tr key={row.keyword} className="border-t border-border/60">
                          <td className="py-1.5 font-medium">{row.keyword}</td>
                          <td className="py-1.5">{row.resumeCount}</td>
                          <td className="py-1.5">{row.jobCount}</td>
                          <td className="py-1.5">{row.matched ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
              <article className="space-y-2 rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="text-sm font-medium">Recommendations</p>
                {result.recommendations.map((item, index) => (
                  <p key={`${item}-${index}`} className="text-sm text-muted-foreground">
                    {item}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary">Keyword Issues: {grouped.keywords.length}</Badge>
                  <Badge variant="secondary">Section Issues: {grouped.sections.length}</Badge>
                  <Badge variant="secondary">Formatting: {grouped.formatting.length}</Badge>
                  <Badge variant="secondary">Readability: {grouped.readability.length}</Badge>
                </div>
              </article>
            </div>
          ) : null}

          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
