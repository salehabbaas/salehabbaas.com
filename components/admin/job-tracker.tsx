"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CirclePlus, Download, ExternalLink, PencilLine, Settings2, Trash2, X } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AdminFieldLabel } from "@/components/admin/admin-field-label";
import { db } from "@/lib/firebase/client";
import { JobApplication, JobResponse, InterviewStage, JOB_EXPORT_HEADERS, JobTrackerSettings } from "@/types/job";

const defaultResponses: JobResponse[] = [
  "No response",
  "Rejected",
  "Screening call",
  "Interview requested",
  "On hold",
  "Offer",
  "Withdrawn"
];

const defaultInterviewStages: InterviewStage[] = [
  "None",
  "Recruiter screen",
  "Hiring manager",
  "Technical test",
  "Technical interview",
  "Panel interview",
  "Final interview"
];

const defaultSettings: JobTrackerSettings = {
  responses: defaultResponses,
  interviewStages: defaultInterviewStages
};

const defaultForm: Omit<JobApplication, "id"> = {
  company: "",
  roleTitle: "",
  salaryRate: "",
  jobAdvertUrl: "",
  applicationDate: "",
  contact: "",
  response: "No response",
  interviewStage: "None",
  interviewDate: "",
  interviewTime: "",
  interviewerName: "",
  offer: "",
  notes: ""
};

function timestampToIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

function normalizeDate(input: string) {
  if (!input) return "";
  const match = input.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!match) return input;
  const [, dd, mm, yy] = match;
  const year = yy.length === 2 ? `20${yy}` : yy;
  return `${dd}/${mm}/${year}`;
}

function toDdMmYyyy(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseApplicationDate(value?: string) {
  const normalized = normalizeDate(value ?? "");
  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm) - 1;
  const year = Number(yyyy);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

function pickJobDate(job: JobApplication) {
  const fromApplication = parseApplicationDate(job.applicationDate);
  if (fromApplication) return fromApplication;
  if (job.createdAt) {
    const created = new Date(job.createdAt);
    if (!Number.isNaN(created.getTime())) return created;
  }
  if (job.updatedAt) {
    const updated = new Date(job.updatedAt);
    if (!Number.isNaN(updated.getTime())) return updated;
  }
  return null;
}

function toSpreadsheetColumn(columnNumber: number) {
  let current = columnNumber;
  let label = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }

  return label;
}

type QuickFilter = "all" | "newlyApplied" | "followUp" | "interviews" | "offers";

export function JobTracker() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [settings, setSettings] = useState<JobTrackerSettings>(defaultSettings);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [message, setMessage] = useState("");

  const [filterResponse, setFilterResponse] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [queryText, setQueryText] = useState("");
  const [sortBy, setSortBy] = useState<"updatedAt" | "company" | "response" | "applicationDate">("updatedAt");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  useEffect(() => {
    const jobsQuery = query(collection(db, "jobApplications"), orderBy("updatedAt", "desc"));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snap) => {
      setJobs(
        snap.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            company: data.company ?? "",
            roleTitle: data.roleTitle ?? "",
            salaryRate: data.salaryRate ?? "",
            jobAdvertUrl: data.jobAdvertUrl ?? "",
            applicationDate: data.applicationDate ?? "",
            contact: data.contact ?? "",
            response: data.response ?? "No response",
            interviewStage: data.interviewStage ?? "None",
            interviewDate: data.interviewDate ?? "",
            interviewTime: data.interviewTime ?? "",
            interviewerName: data.interviewerName ?? "",
            offer: data.offer ?? "",
            notes: data.notes ?? "",
            createdAt: timestampToIso(data.createdAt),
            updatedAt: timestampToIso(data.updatedAt)
          } satisfies JobApplication;
        })
      );
    });

    const unsubscribeSettings = onSnapshot(doc(db, "jobTrackerSettings", "default"), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setSettings({
        responses: data.responses ?? defaultResponses,
        interviewStages: data.interviewStages ?? defaultInterviewStages
      });
    });

    return () => {
      unsubscribeJobs();
      unsubscribeSettings();
    };
  }, []);

  const nowTime = Date.now();
  const recentWindow = nowTime - 14 * 24 * 60 * 60 * 1000;
  const followUpWindow = nowTime - 7 * 24 * 60 * 60 * 1000;

  const filtered = useMemo(() => {
    const filteredRows = jobs.filter((job) => {
      if (quickFilter === "newlyApplied") {
        const stamp = pickJobDate(job)?.getTime();
        if (!stamp || stamp < recentWindow) return false;
      }
      if (quickFilter === "followUp") {
        const stamp = pickJobDate(job)?.getTime();
        if (job.response !== "No response" || !stamp || stamp > followUpWindow) return false;
      }
      if (quickFilter === "interviews") {
        const inPipeline = job.interviewStage !== "None" || job.response === "Interview requested" || job.response === "Screening call";
        if (!inPipeline) return false;
      }
      if (quickFilter === "offers" && job.response !== "Offer") return false;

      if (filterResponse && job.response !== filterResponse) return false;
      if (filterStage && job.interviewStage !== filterStage) return false;

      const search = queryText.trim().toLowerCase();
      if (!search) return true;
      return (
        job.company.toLowerCase().includes(search) ||
        job.roleTitle.toLowerCase().includes(search) ||
        (job.contact ?? "").toLowerCase().includes(search)
      );
    });

    const sortedRows = [...filteredRows];
    sortedRows.sort((a, b) => {
      if (sortBy === "company") return a.company.localeCompare(b.company);
      if (sortBy === "response") return a.response.localeCompare(b.response);
      if (sortBy === "applicationDate") {
        const aTime = pickJobDate(a)?.getTime() ?? 0;
        const bTime = pickJobDate(b)?.getTime() ?? 0;
        return bTime - aTime;
      }
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });

    return sortedRows;
  }, [jobs, filterResponse, filterStage, queryText, sortBy, quickFilter, recentWindow, followUpWindow]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const offers = jobs.filter((job) => job.response === "Offer").length;
    const interviews = jobs.filter((job) => job.interviewStage !== "None").length;
    const noResponse = jobs.filter((job) => job.response === "No response").length;
    const recentlyApplied = jobs.filter((job) => {
      const stamp = pickJobDate(job)?.getTime();
      return Boolean(stamp && stamp >= recentWindow);
    }).length;
    return { total, offers, interviews, noResponse, recentlyApplied };
  }, [jobs, recentWindow]);

  const companySuggestions = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.company.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );

  const roleSuggestions = useMemo(() => {
    const fromSameCompany = form.company.trim()
      ? jobs
          .filter((job) => job.company.toLowerCase() === form.company.trim().toLowerCase())
          .map((job) => job.roleTitle.trim())
      : jobs.map((job) => job.roleTitle.trim());
    return Array.from(new Set(fromSameCompany.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [jobs, form.company]);

  const latestByCompany = useMemo(() => {
    const companyMap = new Map<string, JobApplication>();

    for (const job of jobs) {
      const key = job.company.trim().toLowerCase();
      if (!key) continue;
      const existing = companyMap.get(key);
      if (!existing) {
        companyMap.set(key, job);
        continue;
      }

      const currentTime = pickJobDate(job)?.getTime() ?? 0;
      const existingTime = pickJobDate(existing)?.getTime() ?? 0;
      if (currentTime >= existingTime) {
        companyMap.set(key, job);
      }
    }

    return companyMap;
  }, [jobs]);

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
  }

  function openCreateDialog() {
    const defaultResponse = settings.responses.includes("No response")
      ? ("No response" as JobResponse)
      : settings.responses[0] ?? ("No response" as JobResponse);
    const defaultStage = settings.interviewStages.includes("None")
      ? ("None" as InterviewStage)
      : settings.interviewStages[0] ?? ("None" as InterviewStage);

    setEditingId(null);
    setForm({
      ...defaultForm,
      applicationDate: toDdMmYyyy(new Date()),
      response: defaultResponse,
      interviewStage: defaultStage
    });
    setJobDialogOpen(true);
  }

  function applyCompanyDefaults(companyInput: string) {
    const normalized = companyInput.trim();
    const companyTemplate = latestByCompany.get(normalized.toLowerCase());

    if (!companyTemplate || editingId) {
      setForm((prev) => ({ ...prev, company: companyInput }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      company: companyInput,
      roleTitle: prev.roleTitle || companyTemplate.roleTitle || "",
      salaryRate: prev.salaryRate || companyTemplate.salaryRate || "",
      contact: prev.contact || companyTemplate.contact || ""
    }));
  }

  function openEditDialog(job: JobApplication) {
    setEditingId(job.id);
    setForm({
      company: job.company,
      roleTitle: job.roleTitle,
      salaryRate: job.salaryRate,
      jobAdvertUrl: job.jobAdvertUrl,
      applicationDate: job.applicationDate,
      contact: job.contact,
      response: job.response,
      interviewStage: job.interviewStage,
      interviewDate: job.interviewDate,
      interviewTime: job.interviewTime,
      interviewerName: job.interviewerName,
      offer: job.offer,
      notes: job.notes
    });
    setJobDialogOpen(true);
  }

  function closeJobDialog() {
    setJobDialogOpen(false);
    resetForm();
  }

  function clearFilters() {
    setQueryText("");
    setFilterResponse("");
    setFilterStage("");
    setSortBy("updatedAt");
    setQuickFilter("all");
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      ...form,
      applicationDate: normalizeDate(form.applicationDate || ""),
      updatedAt: serverTimestamp()
    };

    if (editingId) {
      await updateDoc(doc(db, "jobApplications", editingId), payload);
      setMessage("Application updated.");
    } else {
      await addDoc(collection(db, "jobApplications"), {
        ...payload,
        createdAt: serverTimestamp()
      });
      setMessage("Application created.");
    }

    closeJobDialog();
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await setDoc(
      doc(db, "jobTrackerSettings", "default"),
      {
        ...settings,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    setMessage("Dropdown settings saved.");
    setSettingsDialogOpen(false);
  }

  async function removeJob(id: string) {
    if (!window.confirm("Delete this application?")) return;
    await deleteDoc(doc(db, "jobApplications", id));
    if (editingId === id) {
      setEditingId(null);
      setForm(defaultForm);
    }
    setMessage("Application deleted.");
  }

  async function quickUpdateJob(id: string, patch: Partial<Omit<JobApplication, "id">>, successMessage: string) {
    await updateDoc(doc(db, "jobApplications", id), {
      ...patch,
      updatedAt: serverTimestamp()
    });
    setMessage(successMessage);
  }

  async function exportToExcel() {
    const { default: XlsxPopulate } = await import("xlsx-populate/browser/xlsx-populate");
    const workbook = await XlsxPopulate.fromBlankAsync();
    const sheet = workbook.sheet(0);
    const rows = filtered.map((job) => [
      job.company,
      job.roleTitle,
      job.salaryRate || "",
      job.jobAdvertUrl || "",
      job.applicationDate || "",
      job.contact || "",
      job.response,
      job.interviewStage,
      job.interviewDate || "",
      job.interviewTime || "",
      job.interviewerName || "",
      job.offer || "",
      job.notes || "",
      job.createdAt || "",
      job.updatedAt || ""
    ]);
    const columnWidths = [20, 22, 14, 28, 16, 20, 18, 20, 16, 14, 18, 18, 28, 20, 20];
    const lastColumn = toSpreadsheetColumn(JOB_EXPORT_HEADERS.length);
    const lastRow = Math.max(rows.length + 1, 1);

    sheet.name("Job Tracker");
    sheet.cell("A1").value([Array.from(JOB_EXPORT_HEADERS), ...rows]);

    columnWidths.forEach((width, index) => {
      sheet.column(index + 1).width(width);
    });

    sheet.freezePanes(0, 1);
    sheet.row(1).style({
      bold: true,
      horizontalAlignment: "left",
      verticalAlignment: "center"
    });
    sheet.range(`A1:${lastColumn}${lastRow}`).autoFilter();

    const blob = await workbook.outputAsync({ type: "blob" }) as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "saleh-job-tracker.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const quickFilters: Array<{ id: QuickFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "newlyApplied", label: "New (14d)" },
    { id: "followUp", label: "Needs Follow-up" },
    { id: "interviews", label: "Interviewing" },
    { id: "offers", label: "Offers" }
  ];

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Application Tracker</CardTitle>
          <CardDescription>Add, follow, and update applications quickly with action-based popups and focused filters.</CardDescription>
          <p className="admin-hint">
            Use quick filters to review new applications and follow-ups, then use row actions for fast pipeline updates.
          </p>
          {message ? <p className="text-sm text-primary">{message}</p> : null}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          <Button onClick={openCreateDialog}>
            <CirclePlus className="h-4 w-4" />
            Add Application
          </Button>
          <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Manage Dropdowns
          </Button>
          <Button variant="secondary" onClick={() => void exportToExcel()}>
            <Download className="h-4 w-4" />
            Export XLSX
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Applications</p>
            <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Offers</p>
            <p className="mt-2 text-2xl font-semibold">{stats.offers}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Interview Pipeline</p>
            <p className="mt-2 text-2xl font-semibold">{stats.interviews}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">No Response</p>
            <p className="mt-2 text-2xl font-semibold">{stats.noResponse}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">New in Last 14 Days</p>
            <p className="mt-2 text-2xl font-semibold">{stats.recentlyApplied}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Queue</CardTitle>
          <CardDescription>Filter your pipeline and take action directly from the table.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={quickFilter === item.id ? "default" : "outline"}
                onClick={() => setQuickFilter(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-6">
            <Input placeholder="Search company/role/contact" value={queryText} onChange={(event) => setQueryText(event.target.value)} />
            <Select value={filterResponse} onChange={(event) => setFilterResponse(event.target.value)}>
              <option value="">All responses</option>
              {settings.responses.map((response) => (
                <option key={response} value={response}>
                  {response}
                </option>
              ))}
            </Select>
            <Select value={filterStage} onChange={(event) => setFilterStage(event.target.value)}>
              <option value="">All interview stages</option>
              {settings.interviewStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </Select>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="updatedAt">Sort: Updated</option>
              <option value="applicationDate">Sort: Application Date</option>
              <option value="company">Sort: Company</option>
              <option value="response">Sort: Response</option>
            </Select>
            <Button variant="outline" type="button" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
            <Button variant="secondary" type="button" onClick={() => void exportToExcel()}>
              <Download className="h-4 w-4" />
              Export XLSX
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {jobs.length} applications.
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interview Stage</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Offer</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length ? (
                filtered.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      <p>{job.company}</p>
                      {job.jobAdvertUrl ? (
                        <a
                          href={job.jobAdvertUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                        >
                          View advert
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </TableCell>
                    <TableCell>{job.roleTitle}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{job.response}</Badge>
                    </TableCell>
                    <TableCell>{job.interviewStage}</TableCell>
                    <TableCell>{job.applicationDate || "-"}</TableCell>
                    <TableCell>{job.offer || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" type="button" onClick={() => openEditDialog(job)}>
                          <PencilLine className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() =>
                            void quickUpdateJob(
                              job.id,
                              {
                                response: "Interview requested",
                                interviewStage: job.interviewStage === "None" ? "Recruiter screen" : job.interviewStage
                              },
                              "Moved to interview pipeline."
                            )
                          }
                        >
                          Interview
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          onClick={() => void quickUpdateJob(job.id, { response: "Offer" }, "Marked as offer.")}
                        >
                          Offer
                        </Button>
                        <Button size="sm" variant="outline" type="button" onClick={() => void removeJob(job.id)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No applications match the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={jobDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeJobDialog();
            return;
          }
          setJobDialogOpen(true);
        }}
      >
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl">
          <form onSubmit={saveJob} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Application" : "New Application"}</DialogTitle>
              <DialogDescription>All job details are managed in this popup to keep the tracker clean and easy to navigate.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel
                  htmlFor="job-company"
                  label="Company"
                  required
                  helper="Existing companies suggest previous role and salary defaults."
                />
                <Input
                  id="job-company"
                  list="job-company-list"
                  value={form.company}
                  onChange={(event) => applyCompanyDefaults(event.target.value)}
                  required
                />
                <datalist id="job-company-list">
                  {companySuggestions.map((company) => (
                    <option key={company} value={company} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="job-role" label="Role Title" required />
                <Input
                  id="job-role"
                  list="job-role-list"
                  value={form.roleTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, roleTitle: event.target.value }))}
                  required
                />
                <datalist id="job-role-list">
                  {roleSuggestions.map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="job-salary" label="Salary/Rate" helper="Optional. Auto-filled from previous entries for existing companies." />
                <Input id="job-salary" value={form.salaryRate} onChange={(event) => setForm((prev) => ({ ...prev, salaryRate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="job-url" label="Job Advert URL" />
                <Input
                  id="job-url"
                  value={form.jobAdvertUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, jobAdvertUrl: event.target.value }))}
                  placeholder="https://..."
                />
                <p className="admin-field-hint">Saved links open in a new tab from the table.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel
                  htmlFor="job-application-date"
                  label="Application Date (dd/mm/yy)"
                  required
                  helper="Defaults to today for new applications."
                />
                <Input
                  id="job-application-date"
                  value={form.applicationDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, applicationDate: event.target.value }))}
                  placeholder="dd/mm/yy"
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="job-contact" label="Contact" helper="Recruiter or hiring manager details." />
                <Input id="job-contact" value={form.contact} onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="job-response" label="Response" required />
                <Select id="job-response" value={form.response} onChange={(event) => setForm((prev) => ({ ...prev, response: event.target.value as JobResponse }))}>
                  {settings.responses.map((response) => (
                    <option key={response} value={response}>
                      {response}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="job-stage" label="Interview Stage" required />
                <Select
                  id="job-stage"
                  value={form.interviewStage}
                  onChange={(event) => setForm((prev) => ({ ...prev, interviewStage: event.target.value as InterviewStage }))}
                >
                  {settings.interviewStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="job-interview-date" label="Interview Date" />
                <Input
                  id="job-interview-date"
                  value={form.interviewDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, interviewDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="job-interview-time" label="Interview Time" />
                <Input
                  id="job-interview-time"
                  value={form.interviewTime}
                  onChange={(event) => setForm((prev) => ({ ...prev, interviewTime: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="job-interviewer" label="Interviewer Name" />
                <Input
                  id="job-interviewer"
                  value={form.interviewerName}
                  onChange={(event) => setForm((prev) => ({ ...prev, interviewerName: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <AdminFieldLabel htmlFor="job-offer" label="Offer" />
              <Input id="job-offer" value={form.offer} onChange={(event) => setForm((prev) => ({ ...prev, offer: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <AdminFieldLabel htmlFor="job-notes" label="Notes" helper="Follow-ups, recruiter comments, and salary constraints." />
              <Textarea id="job-notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeJobDialog}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Update Application" : "Save Application"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={saveSettings} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Dropdown Defaults</DialogTitle>
              <DialogDescription>Manage response and interview stage options used in filters and forms.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="settings-responses" label="Response Options" required />
              <Input
                id="settings-responses"
                value={settings.responses.join(", ")}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    responses: event.target.value
                      .split(",")
                      .map((value) => value.trim() as JobResponse)
                      .filter(Boolean)
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="settings-stages" label="Interview Stage Options" required />
              <Input
                id="settings-stages"
                value={settings.interviewStages.join(", ")}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    interviewStages: event.target.value
                      .split(",")
                      .map((value) => value.trim() as InterviewStage)
                      .filter(Boolean)
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Defaults</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
