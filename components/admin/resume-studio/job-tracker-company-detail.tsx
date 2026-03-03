"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CalendarClock, ExternalLink } from "lucide-react";
import { doc, onSnapshot, orderBy, query, updateDoc, where, collection, serverTimestamp } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_COMPANY_TYPE_OPTIONS, normalizeCompanyNameKey } from "@/lib/company-directory/utils";
import { db } from "@/lib/firebase/client";
import { markCompanyChecked } from "@/lib/company-directory/client";
import type { JobTrackerCompanyRecord, JobTrackerJobRecord } from "@/types/resume-studio";

function asIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const statusOptions: Array<JobTrackerJobRecord["status"]> = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];

export function JobTrackerCompanyDetail({ ownerId, companyId }: { ownerId: string; companyId: string }) {
  const router = useRouter();
  const [company, setCompany] = useState<JobTrackerCompanyRecord | null>(null);
  const [jobs, setJobs] = useState<JobTrackerJobRecord[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsubCompany = onSnapshot(
      doc(db, "trackedCompanies", companyId),
      (snap) => {
        if (!snap.exists()) {
          setCompany(null);
          setStatus("Company not found");
          return;
        }

        const data = snap.data();
        setCompany({
          id: snap.id,
          ownerId: String(data.ownerId ?? ""),
          name: String(data.name ?? ""),
          normalizedName: String(data.normalizedName ?? ""),
          city: typeof data.city === "string" ? data.city : "",
          companyType: typeof data.companyType === "string" ? data.companyType : "other",
          careersUrl: typeof data.careersUrl === "string" ? data.careersUrl : "",
          websiteUrl: typeof data.websiteUrl === "string" ? data.websiteUrl : "",
          notes: typeof data.notes === "string" ? data.notes : "",
          lastCheckedAt: asIso(data.lastCheckedAt),
          lastCheckNote: typeof data.lastCheckNote === "string" ? data.lastCheckNote : "",
          createdAt: asIso(data.createdAt),
          updatedAt: asIso(data.updatedAt)
        } satisfies JobTrackerCompanyRecord);
      },
      (error) => {
        setStatus(error.code === "permission-denied" ? "Missing Firestore permissions for trackedCompanies." : error.message);
      }
    );

    const jobsQuery = query(
      collection(db, "jobTrackerJobs"),
      where("ownerId", "==", ownerId),
      where("companyId", "==", companyId),
      orderBy("updatedAt", "desc")
    );

    const unsubJobs = onSnapshot(
      jobsQuery,
      (snap) => {
        setJobs(
          snap.docs.map((entry) => {
            const data = entry.data();
            return {
              id: entry.id,
              ownerId: String(data.ownerId ?? ""),
              companyId: typeof data.companyId === "string" ? data.companyId : "",
              company: String(data.company ?? ""),
              title: String(data.title ?? ""),
              location: typeof data.location === "string" ? data.location : "",
              jobUrl: typeof data.jobUrl === "string" ? data.jobUrl : "",
              status: statusOptions.includes(data.status) ? data.status : "saved",
              appliedAt: asIso(data.appliedAt),
              nextFollowUpAt: asIso(data.nextFollowUpAt),
              descriptionText: String(data.descriptionText ?? ""),
              descriptionSource: ["paste", "url", "import"].includes(String(data.descriptionSource))
                ? (data.descriptionSource as JobTrackerJobRecord["descriptionSource"])
                : "paste",
              tags: Array.isArray(data.tags) ? data.tags.filter((item: unknown): item is string => typeof item === "string") : [],
              createdAt: asIso(data.createdAt),
              updatedAt: asIso(data.updatedAt)
            } satisfies JobTrackerJobRecord;
          })
        );
      },
      (error) => {
        setStatus(error.code === "permission-denied" ? "Missing Firestore permissions for job tracker jobs." : error.message);
      }
    );

    return () => {
      unsubCompany();
      unsubJobs();
    };
  }, [companyId, ownerId]);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      applied: jobs.filter((job) => ["applied", "interviewing", "offer", "rejected", "archived"].includes(job.status)).length,
      interviewing: jobs.filter((job) => job.status === "interviewing").length,
      offers: jobs.filter((job) => job.status === "offer").length
    };
  }, [jobs]);

  async function saveCompanyPatch(patch: Partial<JobTrackerCompanyRecord>) {
    if (!company) return;
    setStatus("");

    try {
      await updateDoc(doc(db, "trackedCompanies", company.id), {
        ...patch,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save changes");
    }
  }

  async function openAndMarkChecked() {
    if (!company) return;
    const targetUrl = company.careersUrl || company.websiteUrl;
    if (!targetUrl) {
      setStatus("No careers URL or website configured for this company.");
      return;
    }

    const note = window.prompt("Optional check note", company.lastCheckNote || "") || "";
    try {
      await markCompanyChecked(company.id, note);
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update check timestamp");
    }
  }

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Detail</CardTitle>
          <CardDescription>Loading company...</CardDescription>
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
              <CardTitle>{company.name}</CardTitle>
              <CardDescription>Company watchlist profile and linked jobs.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/admin/job-tracker")}>Back</Button>
              <Button variant="outline" onClick={() => void openAndMarkChecked()}>
                <ExternalLink className="h-4 w-4" />
                Open URL + Mark Checked
              </Button>
            </div>
          </div>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Overview</CardTitle>
            <CardDescription>Edit metadata used across Job Tracker and linked systems.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={company.name}
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                onBlur={() => saveCompanyPatch({ name: company.name, normalizedName: normalizeCompanyNameKey(company.name) })}
              />
              <Input
                value={company.city || ""}
                placeholder="City"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, city: event.target.value } : prev))}
                onBlur={() => saveCompanyPatch({ city: company.city || "" })}
              />
              <Select
                value={company.companyType || "other"}
                onChange={(event) => {
                  const value = event.target.value || "other";
                  setCompany((prev) => (prev ? { ...prev, companyType: value } : prev));
                  void saveCompanyPatch({ companyType: value });
                }}
              >
                {DEFAULT_COMPANY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              <Input
                value={company.careersUrl || ""}
                placeholder="Careers URL"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, careersUrl: event.target.value } : prev))}
                onBlur={() => saveCompanyPatch({ careersUrl: company.careersUrl || "" })}
              />
              <Input
                value={company.websiteUrl || ""}
                placeholder="Website URL"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, websiteUrl: event.target.value } : prev))}
                onBlur={() => saveCompanyPatch({ websiteUrl: company.websiteUrl || "" })}
              />
              <Input value={formatDate(company.lastCheckedAt)} readOnly />
            </div>

            <Textarea
              rows={4}
              value={company.lastCheckNote || ""}
              onChange={(event) => setCompany((prev) => (prev ? { ...prev, lastCheckNote: event.target.value } : prev))}
              onBlur={() => saveCompanyPatch({ lastCheckNote: company.lastCheckNote || "" })}
              placeholder="Last check note"
            />

            <Textarea
              rows={8}
              value={company.notes || ""}
              onChange={(event) => setCompany((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
              onBlur={() => saveCompanyPatch({ notes: company.notes || "" })}
              placeholder="General notes"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Summary</CardTitle>
              <CardDescription>All jobs tracked under this company.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Total {stats.total}</Badge>
                <Badge variant="secondary">Applied {stats.applied}</Badge>
                <Badge variant="secondary">Interviews {stats.interviewing}</Badge>
                <Badge variant="secondary">Offers {stats.offers}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jobs</CardTitle>
              <CardDescription>Recent jobs linked to this company.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {jobs.map((job) => (
                <article key={job.id} className="rounded-xl border border-border/70 bg-card/75 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{job.title}</p>
                    <Badge variant="outline">{job.status}</Badge>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                    <p className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5" /> {job.location || "Location not set"}</p>
                    <p className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Applied: {formatDate(job.appliedAt)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/job-tracker/${job.id}`}>Open Job</Link>
                    </Button>
                    {job.jobUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={job.jobUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" /> Job URL
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
              {!jobs.length ? <p className="text-sm text-muted-foreground">No jobs linked to this company yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
