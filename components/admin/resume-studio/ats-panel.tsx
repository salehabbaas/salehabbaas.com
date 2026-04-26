"use client";

/**
 * ATS Scoring Panel — rebuilt with visual score gauge, per-category breakdown,
 * keyword matrix, actionable recommendations, and job description parsing.
 */

import { useState, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { AtsResult, ResumeDocumentRecord } from "@/types/resume-studio";
import { cn } from "@/lib/utils";

// ─── Score gauge ─────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.round(score);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct / 100);

  const color =
    pct >= 80 ? "#22c55e" :
    pct >= 60 ? "#eab308" :
    pct >= 40 ? "#f97316" :
    "#ef4444";

  const label =
    pct >= 80 ? "Excellent" :
    pct >= 60 ? "Good" :
    pct >= 40 ? "Fair" :
    "Needs Work";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-800 leading-none">{pct}</span>
          <span className="text-xs text-slate-400 mt-0.5">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Breakdown bars ───────────────────────────────────────────────────────────

function BreakdownBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-500">{value} / {max}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Issue card ───────────────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: { id: string; severity: string; group: string; message: string; recommendation: string } }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={cn(
        "w-full text-left rounded-lg border px-3 py-2.5 transition",
        issue.severity === "critical"
          ? "bg-red-50 border-red-200 hover:bg-red-100"
          : "bg-amber-50 border-amber-200 hover:bg-amber-100"
      )}
    >
      <div className="flex items-start gap-2">
        {issue.severity === "critical"
          ? <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 leading-snug">{issue.message}</p>
          {expanded && (
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{issue.recommendation}</p>
          )}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </div>
    </button>
  );
}

// ─── Keyword pill ─────────────────────────────────────────────────────────────

function KeywordPill({ keyword, matched, resumeCount, jobCount }: { keyword: string; matched: boolean; resumeCount: number; jobCount: number }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs",
        matched
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"
      )}
      title={`Resume: ${resumeCount}x  |  Job: ${jobCount}x`}
    >
      {matched
        ? <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
        : <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
      }
      <span className="font-medium truncate">{keyword}</span>
    </div>
  );
}

// ─── Section toggle ───────────────────────────────────────────────────────────

function Collapsible({ title, badge, badgeColor, children, defaultOpen = true }: {
  title: string;
  badge?: string | number;
  badgeColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition"
      >
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <div className="flex items-center gap-2">
          {badge !== undefined && (
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", badgeColor ?? "bg-slate-200 text-slate-600")}>
              {badge}
            </span>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

// ─── Main ATS Panel ───────────────────────────────────────────────────────────

type AtsPanelProps = {
  doc: ResumeDocumentRecord;
  result: AtsResult | null;
  loading: boolean;
  jobDescription: string;
  jobUrl: string;
  parsingUrl: boolean;
  onJobDescriptionChange: (v: string) => void;
  onJobUrlChange: (v: string) => void;
  onRun: () => void;
  onParseUrl: () => void;
};

export function AtsPanel({
  doc,
  result,
  loading,
  jobDescription,
  jobUrl,
  parsingUrl,
  onJobDescriptionChange,
  onJobUrlChange,
  onRun,
  onParseUrl,
}: AtsPanelProps) {
  const [keywordView, setKeywordView] = useState<"all" | "missing" | "matched">("all");
  const [showMatrix, setShowMatrix] = useState(false);

  const criticalCount = result?.criticalIssues.length ?? 0;
  const minorCount = result?.minorIssues.length ?? 0;

  const filteredKeywords = result?.keywordMatrix.filter(row =>
    keywordView === "all" ? true :
    keywordView === "missing" ? !row.matched :
    row.matched
  ) ?? [];

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* Job description input */}
      <Collapsible title="Job Description" defaultOpen={!result}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={jobUrl}
              onChange={e => onJobUrlChange(e.target.value)}
              placeholder="Paste job posting URL..."
              className="flex-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
            />
            <button
              onClick={onParseUrl}
              disabled={parsingUrl || !jobUrl.trim()}
              className="flex items-center gap-1 px-3 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-50 transition"
            >
              {parsingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              Parse
            </button>
          </div>

          <div className="relative">
            <textarea
              value={jobDescription}
              onChange={e => onJobDescriptionChange(e.target.value)}
              placeholder="Or paste the full job description text here..."
              rows={6}
              className="w-full px-2.5 py-2 rounded-md border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition resize-none leading-relaxed"
            />
            {jobDescription && (
              <span className="absolute bottom-2 right-2 text-xs text-slate-400">
                {jobDescription.trim().split(/\s+/).length} words
              </span>
            )}
          </div>

          <button
            onClick={onRun}
            disabled={loading || !jobDescription.trim()}
            className="flex items-center justify-center gap-2 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Target className="w-4 h-4" /> Run ATS Check</>
            )}
          </button>
        </div>
      </Collapsible>

      {/* Results */}
      {result && (
        <>
          {/* Score overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">ATS Score</h3>
              <button
                onClick={onRun}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                Recheck
              </button>
            </div>

            <div className="flex items-center gap-6">
              <ScoreGauge score={result.score} />
              <div className="flex-1 flex flex-col gap-3">
                <BreakdownBar
                  label="Resume quality"
                  value={result.breakdown.deterministic}
                  max={50}
                  color="#6366f1"
                />
                <BreakdownBar
                  label="Keyword match"
                  value={result.breakdown.keyword}
                  max={35}
                  color="#0ea5e9"
                />
                <BreakdownBar
                  label="AI analysis"
                  value={result.breakdown.ai}
                  max={15}
                  color="#8b5cf6"
                />
              </div>
            </div>

            {/* Issue summary chips */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-700">{criticalCount} critical</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">{minorCount} minor</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-semibold text-green-700">
                  {result.keywordCoverage.coveragePercent}% keywords
                </span>
              </div>
            </div>
          </div>

          {/* Keyword coverage */}
          <Collapsible
            title="Keyword Coverage"
            badge={`${result.keywordCoverage.matchedKeywords} / ${result.keywordCoverage.totalKeywords}`}
            badgeColor={
              result.keywordCoverage.coveragePercent >= 70 ? "bg-green-100 text-green-700" :
              result.keywordCoverage.coveragePercent >= 50 ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }
          >
            <div className="flex flex-col gap-3">
              {/* Filter tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {(["all", "matched", "missing"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setKeywordView(tab)}
                    className={cn(
                      "flex-1 py-1 text-xs font-medium rounded-md capitalize transition",
                      keywordView === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Keyword pills */}
              <div className="flex flex-wrap gap-2">
                {filteredKeywords.slice(0, 30).map(row => (
                  <KeywordPill
                    key={row.keyword}
                    keyword={row.keyword}
                    matched={row.matched}
                    resumeCount={row.resumeCount}
                    jobCount={row.jobCount}
                  />
                ))}
              </div>

              {/* Top missing */}
              {result.topMissingKeywords.length > 0 && keywordView !== "matched" && (
                <div className="mt-1 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs font-semibold text-red-700 mb-1.5">
                    🎯 Top missing — add these to your resume:
                  </p>
                  <p className="text-xs text-red-600 leading-relaxed">
                    {result.topMissingKeywords.slice(0, 10).join(" · ")}
                  </p>
                </div>
              )}
            </div>
          </Collapsible>

          {/* Issues by group */}
          {(criticalCount + minorCount > 0) && (
            <Collapsible
              title="Issues Found"
              badge={criticalCount + minorCount}
              badgeColor={criticalCount > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}
            >
              <div className="flex flex-col gap-2">
                {[...result.criticalIssues, ...result.minorIssues].map(issue => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </Collapsible>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <Collapsible title="Recommendations" badge={result.recommendations.length} badgeColor="bg-blue-100 text-blue-700">
              <div className="flex flex-col gap-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-2.5 py-2 border-b border-slate-100 last:border-0">
                    <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* Keyword matrix table */}
          <Collapsible
            title="Keyword Matrix"
            defaultOpen={false}
            badge={result.keywordMatrix.length}
            badgeColor="bg-slate-200 text-slate-600"
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-semibold text-slate-500">Keyword</th>
                    <th className="text-center py-2 px-2 font-semibold text-slate-500">In Job</th>
                    <th className="text-center py-2 px-2 font-semibold text-slate-500">In Resume</th>
                    <th className="text-center py-2 px-2 font-semibold text-slate-500">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {result.keywordMatrix.map(row => (
                    <tr key={row.keyword} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-1.5 px-2 font-medium text-slate-700">{row.keyword}</td>
                      <td className="py-1.5 px-2 text-center text-slate-500">{row.jobCount}</td>
                      <td className="py-1.5 px-2 text-center text-slate-500">{row.resumeCount}</td>
                      <td className="py-1.5 px-2 text-center">
                        {row.matched
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mx-auto" />
                          : <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Collapsible>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Target className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Paste a job description above and click <strong>Run ATS Check</strong> to see how well your resume matches.
          </p>
        </div>
      )}
    </div>
  );
}
