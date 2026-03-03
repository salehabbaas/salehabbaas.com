"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onSnapshot, doc } from "firebase/firestore";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase/client";
import { mapResumeDocumentSnapshot } from "@/lib/resume-studio/client-mappers";
import type { AtsIssue, AtsResult, ResumeDocumentRecord } from "@/types/resume-studio";

function groupedIssues(issues: AtsIssue[]) {
  return {
    keywords: issues.filter((issue) => issue.group === "keywords"),
    sections: issues.filter((issue) => issue.group === "sections"),
    formatting: issues.filter((issue) => issue.group === "formatting"),
    readability: issues.filter((issue) => issue.group === "readability")
  };
}

export function ResumeStudioAts({ docId }: { docId: string }) {
  const router = useRouter();
  const [documentRecord, setDocumentRecord] = useState<ResumeDocumentRecord | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [result, setResult] = useState<AtsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsingUrl, setParsingUrl] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "resumeDocuments", docId), (snap) => {
      if (!snap.exists()) {
        setStatus("Document not found");
        return;
      }

      setDocumentRecord(mapResumeDocumentSnapshot(snap.id, snap.data()));
    });

    return () => unsub();
  }, [docId]);

  const issuesByGroup = useMemo(() => groupedIssues(result?.issues ?? []), [result]);

  async function runCheck() {
    if (!documentRecord) return;

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
      setStatus(`ATS check complete: ${payload.score}%`);
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
        warnings?: string[];
      };
      if (!response.ok || !payload.normalizedJobDescription) {
        throw new Error(payload.error || "Unable to parse job URL");
      }
      setJobDescription(payload.normalizedJobDescription);
      setStatus(
        `Job URL parsed (confidence ${Math.round((payload.confidence ?? 0) * 100)}%). ${(payload.warnings ?? []).join(" ")}`
          .trim()
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to parse job URL");
    } finally {
      setParsingUrl(false);
    }
  }

  async function tailorToJob() {
    if (!documentRecord?.linkedJobId) return;

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
      router.push(`/admin/resume-studio/${payload.docId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to tailor resume");
    } finally {
      setLoading(false);
    }
  }

  if (!documentRecord) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ATS Check</CardTitle>
          <CardDescription>Loading document...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>ATS Check</CardTitle>
              <CardDescription>{documentRecord.title}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push(`/admin/resume-studio/${docId}`)}>
                <ArrowLeft className="h-4 w-4" />
                Back to Editor
              </Button>
              <Button variant="outline" onClick={() => router.push(`/admin/resume-studio/${docId}/export`)}>
                Export
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Current ATS Score</p>
                <p className="text-3xl font-semibold">{result?.score ?? documentRecord.ats.lastScore ?? "-"}%</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {documentRecord.linkedJobId ? (
                  <Button onClick={tailorToJob} disabled={loading}>
                    <Sparkles className="h-4 w-4" />
                    Tailor to Job
                  </Button>
                ) : null}
                <Button onClick={runCheck} disabled={loading}>
                  <ClipboardCheck className="h-4 w-4" />
                  {loading ? "Checking..." : "Run ATS Check"}
                </Button>
              </div>
            </div>
          </div>

          {!documentRecord.linkedJobId ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Parse Job URL (optional)</p>
              <div className="flex flex-wrap gap-2">
                <input
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  value={jobUrl}
                  onChange={(event) => setJobUrl(event.target.value)}
                  placeholder="https://example.com/job-posting"
                />
                <Button variant="outline" onClick={parseJobUrl} disabled={parsingUrl}>
                  {parsingUrl ? "Parsing..." : "Parse URL"}
                </Button>
              </div>
              <p className="text-sm font-medium">Paste Job Description</p>
              <Textarea
                rows={6}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the target job description for keyword matching."
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Parse Job URL (optional)</p>
              <div className="flex flex-wrap gap-2">
                <input
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  value={jobUrl}
                  onChange={(event) => setJobUrl(event.target.value)}
                  placeholder="https://example.com/job-posting"
                />
                <Button variant="outline" onClick={parseJobUrl} disabled={parsingUrl}>
                  {parsingUrl ? "Parsing..." : "Parse URL"}
                </Button>
              </div>
              <p className="text-sm font-medium">Optional override job description</p>
              <Textarea
                rows={4}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Optional: paste a revised JD to compare against linked job"
              />
            </div>
          )}

          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardHeader>
      </Card>

      {result ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Keyword Coverage</CardTitle>
                <CardDescription>
                  {result.keywordCoverage.matchedKeywords}/{result.keywordCoverage.totalKeywords} matched
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  Coverage: <strong>{result.keywordCoverage.coveragePercent}%</strong>
                </p>
                <p className="text-xs text-muted-foreground">Top missing keywords</p>
                <div className="flex flex-wrap gap-2">
                  {result.topMissingKeywords.slice(0, 12).map((keyword) => (
                    <Badge key={keyword} variant="secondary">{keyword}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scoring Breakdown</CardTitle>
                <CardDescription>Deterministic + keyword + AI assisted</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Deterministic: {result.breakdown.deterministic}/50</p>
                <p>Keyword: {result.breakdown.keyword}/35</p>
                <p>AI: {result.breakdown.ai}/15</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Issue Summary</CardTitle>
                <CardDescription>Critical vs minor actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Critical: {result.criticalIssues.length}</p>
                <p className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Minor: {result.minorIssues.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Keyword Matrix</CardTitle>
              <CardDescription>Frequency in resume vs job description</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2">Keyword</th>
                      <th className="pb-2">In Resume</th>
                      <th className="pb-2">In Job Ad</th>
                      <th className="pb-2">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.keywordMatrix.map((row) => (
                      <tr key={row.keyword} className="border-t border-border/60">
                        <td className="py-2 font-medium">{row.keyword}</td>
                        <td className="py-2">{row.resumeCount}</td>
                        <td className="py-2">{row.jobCount}</td>
                        <td className="py-2">{row.matched ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {([
            ["Keywords coverage", issuesByGroup.keywords],
            ["Section completeness", issuesByGroup.sections],
            ["Formatting pitfalls", issuesByGroup.formatting],
            ["Readability", issuesByGroup.readability]
          ] as Array<[string, AtsIssue[]]>).map(([title, issues]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!issues.length ? <p className="text-sm text-muted-foreground">No issues detected.</p> : null}
                {issues.map((issue) => (
                  <article key={issue.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{issue.message}</p>
                      <Badge variant="secondary" className={issue.severity === "critical" ? "border-destructive/40 text-destructive" : ""}>
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{issue.recommendation}</p>
                  </article>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actionable Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.recommendations.map((recommendation, index) => (
                <div key={`${recommendation}-${index}`} className="rounded-xl border border-border/70 bg-card/70 p-3 text-sm">
                  {recommendation}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Run ATS check to view keyword coverage, structural checks, and recommendations.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
