"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { BriefcaseBusiness, CalendarClock, CirclePlus, ExternalLink, Filter, Search } from "lucide-react";

import { CompanyPicker } from "@/components/admin/company/company-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ensureCompanyByName, markCompanyChecked, subscribeTrackedCompanies } from "@/lib/company-directory/client";
import { toCompanySuggestions } from "@/lib/company-directory/utils";
import { db } from "@/lib/firebase/client";
import type { JobResumeLinkRecord, JobTrackerCompanyRecord, JobTrackerJobRecord } from "@/types/resume-studio";

const statusOptions: Array<JobTrackerJobRecord["status"]> = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];

type DashboardView = "jobs" | "companies";
type CompanyGroupBy = "city" | "type";

const defaultJob: Omit<JobTrackerJobRecord, "id" | "ownerId"> = {
  companyId: "",
  company: "",
  title: "",
  location: "",
  jobUrl: "",
  status: "saved",
  appliedAt: "",
  nextFollowUpAt: "",
  descriptionText: "",
  descriptionSource: "paste",
  tags: [],
  createdAt: "",
  updatedAt: ""
};

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

function normalizeCompanyName(value: string) {
  return value.trim().toLowerCase();
}

export function JobTrackerDashboard({ ownerId }: { ownerId: string }) {
  const [jobs, setJobs] = useState<JobTrackerJobRecord[]>([]);
  const [links, setLinks] = useState<JobResumeLinkRecord[]>([]);
  const [companies, setCompanies] = useState<JobTrackerCompanyRecord[]>([]);

  const [view, setView] = useState<DashboardView>("jobs");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JobTrackerJobRecord["status"]>("all");

  const [companySearch, setCompanySearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<CompanyGroupBy>("city");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(defaultJob);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const jobsQuery = query(collection(db, "jobTrackerJobs"), where("ownerId", "==", ownerId), orderBy("updatedAt", "desc"));
    const linksQuery = query(collection(db, "jobResumeLinks"), where("ownerId", "==", ownerId), orderBy("createdAt", "desc"));

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
        setStatusMessage(error.code === "permission-denied" ? "Missing Firestore permissions for job tracker jobs." : error.message);
      }
    );

    const unsubLinks = onSnapshot(
      linksQuery,
      (snap) => {
        setLinks(
          snap.docs.map((entry) => {
            const data = entry.data();
            return {
              id: entry.id,
              ownerId: String(data.ownerId ?? ""),
              jobId: String(data.jobId ?? ""),
              docId: String(data.docId ?? ""),
              createdAt: asIso(data.createdAt),
              atsScore: typeof data.atsScore === "number" ? data.atsScore : undefined,
              notes: typeof data.notes === "string" ? data.notes : ""
            } satisfies JobResumeLinkRecord;
          })
        );
      },
      (error) => {
        setStatusMessage(error.code === "permission-denied" ? "Missing Firestore permissions for linked resumes." : error.message);
      }
    );

    const unsubCompanies = subscribeTrackedCompanies(
      ownerId,
      setCompanies,
      (error) => setStatusMessage(error.code === "permission-denied" ? "Missing Firestore permissions for trackedCompanies." : error.message)
    );

    return () => {
      unsubJobs();
      unsubLinks();
      unsubCompanies();
    };
  }, [ownerId]);

  const summaryByJob = useMemo(() => {
    const map = new Map<string, { linkedCount: number; bestAts: number | null }>();

    links.forEach((link) => {
      const current = map.get(link.jobId) ?? { linkedCount: 0, bestAts: null };
      const nextBest = typeof link.atsScore === "number" ? Math.max(current.bestAts ?? 0, link.atsScore) : current.bestAts;
      map.set(link.jobId, {
        linkedCount: current.linkedCount + 1,
        bestAts: nextBest
      });
    });

    return map;
  }, [links]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;

      const queryText = search.trim().toLowerCase();
      if (!queryText) return true;

      return (
        job.company.toLowerCase().includes(queryText) ||
        job.title.toLowerCase().includes(queryText) ||
        (job.location ?? "").toLowerCase().includes(queryText)
      );
    });
  }, [jobs, search, statusFilter]);

  const companyStats = useMemo(() => {
    const map = new Map<string, { total: number; applied: number; interviewing: number; offers: number }>();
    const byName = new Map<string, string>();
    companies.forEach((company) => {
      byName.set(normalizeCompanyName(company.name), company.id);
    });

    jobs.forEach((job) => {
      const key = job.companyId || byName.get(normalizeCompanyName(job.company)) || "";
      if (!key) return;
      const current = map.get(key) ?? { total: 0, applied: 0, interviewing: 0, offers: 0 };
      current.total += 1;
      if (["applied", "interviewing", "offer", "rejected", "archived"].includes(job.status)) current.applied += 1;
      if (job.status === "interviewing") current.interviewing += 1;
      if (job.status === "offer") current.offers += 1;
      map.set(key, current);
    });

    return map;
  }, [jobs, companies]);

  const companyFilters = useMemo(() => toCompanySuggestions(companies), [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      if (cityFilter !== "all" && (company.city || "") !== cityFilter) return false;
      if (typeFilter !== "all" && (company.companyType || "other") !== typeFilter) return false;

      const queryText = companySearch.trim().toLowerCase();
      if (!queryText) return true;

      return (
        company.name.toLowerCase().includes(queryText) ||
        (company.city || "").toLowerCase().includes(queryText) ||
        (company.companyType || "").toLowerCase().includes(queryText) ||
        (company.notes || "").toLowerCase().includes(queryText)
      );
    });
  }, [companies, cityFilter, typeFilter, companySearch]);

  const groupedCompanies = useMemo(() => {
    const map = new Map<string, JobTrackerCompanyRecord[]>();
    filteredCompanies.forEach((company) => {
      const key = groupBy === "city"
        ? company.city?.trim() || "Unspecified city"
        : company.companyType?.trim() || "Unspecified type";
      const current = map.get(key) ?? [];
      current.push(company);
      map.set(key, current);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, rows]) => ({
        key,
        rows: [...rows].sort((a, b) => a.name.localeCompare(b.name))
      }));
  }, [filteredCompanies, groupBy]);

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage("");

    try {
      const name = form.company.trim();
      if (!name) {
        throw new Error("Company name is required");
      }

      const linkedCompany = form.companyId
        ? companies.find((company) => company.id === form.companyId) ?? (await ensureCompanyByName(ownerId, { name }))
        : await ensureCompanyByName(ownerId, { name });

      await addDoc(collection(db, "jobTrackerJobs"), {
        ownerId,
        companyId: linkedCompany.id,
        company: linkedCompany.name,
        title: form.title.trim(),
        location: form.location?.trim() || "",
        jobUrl: form.jobUrl?.trim() || "",
        status: form.status,
        appliedAt: form.appliedAt ? new Date(form.appliedAt) : null,
        nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt) : null,
        descriptionText: form.descriptionText.trim(),
        descriptionSource: form.descriptionSource || "paste",
        tags: form.tags ?? [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setCreateOpen(false);
      setForm(defaultJob);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create job");
    } finally {
      setSaving(false);
    }
  }

  async function openCompanyTarget(company: JobTrackerCompanyRecord) {
    const targetUrl = company.careersUrl || company.websiteUrl;
    if (!targetUrl) {
      setStatusMessage("No careers or website URL configured for this company.");
      return;
    }

    const note = window.prompt("Optional check note", company.lastCheckNote || "") || "";

    try {
      await markCompanyChecked(company.id, note);
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update last checked status.");
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Job Tracker</CardTitle>
              <CardDescription>Track opportunities and link tailored resumes to every target role.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={view === "jobs" ? "default" : "outline"} onClick={() => setView("jobs")}>Jobs</Button>
              <Button variant={view === "companies" ? "default" : "outline"} onClick={() => setView("companies")}>Companies</Button>
              <Button asChild variant="outline">
                <Link href="/admin/job-tracker/import">Import Job</Link>
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <CirclePlus className="h-4 w-4" />
                Create Job
              </Button>
            </div>
          </div>

          {view === "jobs" ? (
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search company, role, location" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onChange={(event) => setStatusFilter((event.target.value as typeof statusFilter) || "all")}>
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-4">
              <Input value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Search company, city, type" />
              <Select value={cityFilter} onChange={(event) => setCityFilter(event.target.value || "all")}>
                <option value="all">All cities</option>
                {companyFilters.cityOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </Select>
              <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value || "all")}>
                <option value="all">All company types</option>
                {companyFilters.typeOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </Select>
              <Select value={groupBy} onChange={(event) => setGroupBy((event.target.value as CompanyGroupBy) || "city")}>
                <option value="city">Group by city</option>
                <option value="type">Group by company type</option>
              </Select>
            </div>
          )}

          {statusMessage ? <p className="text-sm text-destructive">{statusMessage}</p> : null}
        </CardHeader>
      </Card>

      {view === "jobs" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => {
            const summary = summaryByJob.get(job.id);
            return (
              <Card key={job.id} className="border-border/70 bg-card/85">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{job.company}</CardTitle>
                      <CardDescription>{job.title}</CardDescription>
                    </div>
                    <Badge variant="outline">{job.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{job.location || "Location not set"}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Linked resumes: {summary?.linkedCount ?? 0}</Badge>
                    <Badge variant="secondary">Best ATS: {typeof summary?.bestAts === "number" ? `${summary.bestAts}%` : "-"}</Badge>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <p className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Applied: {formatDate(job.appliedAt)}</p>
                    <p className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5" /> Follow-up: {formatDate(job.nextFollowUpAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link href={`/admin/job-tracker/${job.id}`}>Open Job</Link>
                    </Button>
                    {job.jobUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={job.jobUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Job URL
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!filteredJobs.length ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No jobs found. Create a job to start linking resumes and ATS scores.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedCompanies.map((group) => (
            <Card key={group.key}>
              <CardHeader>
                <CardTitle className="text-base">{group.key}</CardTitle>
                <CardDescription>{group.rows.length} companies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.rows.map((company) => {
                  const stats = companyStats.get(company.id) ?? { total: 0, applied: 0, interviewing: 0, offers: 0 };
                  const targetUrl = company.careersUrl || company.websiteUrl;

                  return (
                    <article key={company.id} className="rounded-xl border border-border/70 bg-card/75 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.city || "No city"} · {company.companyType || "other"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">Jobs {stats.total}</Badge>
                          <Badge variant="secondary">Applied {stats.applied}</Badge>
                          <Badge variant="secondary">Interviews {stats.interviewing}</Badge>
                          <Badge variant="secondary">Offers {stats.offers}</Badge>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Last checked: {formatDate(company.lastCheckedAt)}</span>
                        {company.lastCheckNote ? <span>· Note: {company.lastCheckNote}</span> : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/job-tracker/company/${company.id}`}>Open Company</Link>
                        </Button>
                        <Button size="sm" variant="outline" disabled={!targetUrl} onClick={() => void openCompanyTarget(company)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open URL + Mark Checked
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {!groupedCompanies.length ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No companies found for the current filters.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Job</DialogTitle>
            <DialogDescription>Save a target role and link tailored documents.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={createJob}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <CompanyPicker
                  ownerId={ownerId}
                  companyId={form.companyId}
                  companyName={form.company}
                  required
                  onSelect={(company) => setForm((current) => ({ ...current, companyId: company.id, company: company.name }))}
                  onNameChange={(name) => setForm((current) => ({ ...current, companyId: "", company: name }))}
                />
              </div>
              <Input required placeholder="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              <Input placeholder="Location" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
              <Input placeholder="Job URL" value={form.jobUrl} onChange={(event) => setForm((current) => ({ ...current, jobUrl: event.target.value }))} />
              <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: (event.target.value as JobTrackerJobRecord["status"]) || "saved" }))}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <Input type="date" value={form.appliedAt || ""} onChange={(event) => setForm((current) => ({ ...current, appliedAt: event.target.value }))} />
              <Input type="date" value={form.nextFollowUpAt || ""} onChange={(event) => setForm((current) => ({ ...current, nextFollowUpAt: event.target.value }))} />
            </div>
            <Textarea
              rows={7}
              required
              value={form.descriptionText}
              onChange={(event) => setForm((current) => ({ ...current, descriptionText: event.target.value }))}
              placeholder="Paste full job description"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Job"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
