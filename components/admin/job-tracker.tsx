"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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

export function JobTracker() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [settings, setSettings] = useState<JobTrackerSettings>(defaultSettings);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [filterResponse, setFilterResponse] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [queryText, setQueryText] = useState("");
  const [sortBy, setSortBy] = useState<"updatedAt" | "company" | "response">("updatedAt");

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

  const filtered = useMemo(() => {
    const filteredRows = jobs.filter((job) => {
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
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });

    return sortedRows;
  }, [jobs, filterResponse, filterStage, queryText, sortBy]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const offers = jobs.filter((job) => job.response === "Offer").length;
    const interviews = jobs.filter((job) => job.interviewStage !== "None").length;
    const noResponse = jobs.filter((job) => job.response === "No response").length;
    return { total, offers, interviews, noResponse };
  }, [jobs]);

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

    setEditingId(null);
    setForm(defaultForm);
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
  }

  async function exportToExcel() {
    const ExcelJs = await import("exceljs");
    const workbook = new ExcelJs.Workbook();
    const worksheet = workbook.addWorksheet("Job Tracker");

    worksheet.columns = [
      { header: JOB_EXPORT_HEADERS[0], key: "company", width: 20 },
      { header: JOB_EXPORT_HEADERS[1], key: "roleTitle", width: 22 },
      { header: JOB_EXPORT_HEADERS[2], key: "salaryRate", width: 14 },
      { header: JOB_EXPORT_HEADERS[3], key: "jobAdvertUrl", width: 28 },
      { header: JOB_EXPORT_HEADERS[4], key: "applicationDate", width: 16 },
      { header: JOB_EXPORT_HEADERS[5], key: "contact", width: 20 },
      { header: JOB_EXPORT_HEADERS[6], key: "response", width: 18 },
      { header: JOB_EXPORT_HEADERS[7], key: "interviewStage", width: 20 },
      { header: JOB_EXPORT_HEADERS[8], key: "interviewDate", width: 16 },
      { header: JOB_EXPORT_HEADERS[9], key: "interviewTime", width: 14 },
      { header: JOB_EXPORT_HEADERS[10], key: "interviewerName", width: 18 },
      { header: JOB_EXPORT_HEADERS[11], key: "offer", width: 18 },
      { header: JOB_EXPORT_HEADERS[12], key: "notes", width: 28 },
      { header: JOB_EXPORT_HEADERS[13], key: "createdAt", width: 20 },
      { header: JOB_EXPORT_HEADERS[14], key: "updatedAt", width: 20 }
    ];

    // Keep header row visible while scrolling long exports.
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const rows = filtered.map((job) => ({
      company: job.company,
      roleTitle: job.roleTitle,
      salaryRate: job.salaryRate || "",
      jobAdvertUrl: job.jobAdvertUrl || "",
      applicationDate: job.applicationDate || "",
      contact: job.contact || "",
      response: job.response,
      interviewStage: job.interviewStage,
      interviewDate: job.interviewDate || "",
      interviewTime: job.interviewTime || "",
      interviewerName: job.interviewerName || "",
      offer: job.offer || "",
      notes: job.notes || "",
      createdAt: job.createdAt || "",
      updatedAt: job.updatedAt || ""
    }));

    rows.forEach((row) => worksheet.addRow(row));

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "left" };

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: JOB_EXPORT_HEADERS.length }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "saleh-job-tracker.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Application Tracker</CardTitle>
          <CardDescription>Track applications, interviews, and offers with sortable reporting.</CardDescription>
          {message ? <p className="text-sm text-primary">{message}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
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
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add / Update Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveJob} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={form.company} onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Role Title</Label>
                  <Input value={form.roleTitle} onChange={(event) => setForm((prev) => ({ ...prev, roleTitle: event.target.value }))} required />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Salary/Rate</Label>
                  <Input value={form.salaryRate} onChange={(event) => setForm((prev) => ({ ...prev, salaryRate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Link to Job Advert</Label>
                  <Input value={form.jobAdvertUrl} onChange={(event) => setForm((prev) => ({ ...prev, jobAdvertUrl: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Application Date (dd/mm/yy)</Label>
                  <Input
                    value={form.applicationDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, applicationDate: event.target.value }))}
                    placeholder="dd/mm/yy"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input value={form.contact} onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Response</Label>
                  <Select
                    value={form.response}
                    onChange={(event) => setForm((prev) => ({ ...prev, response: event.target.value as JobResponse }))}
                  >
                    {settings.responses.map((response) => (
                      <option key={response} value={response}>
                        {response}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Interview Stage</Label>
                  <Select
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
                  <Label>Interview Date</Label>
                  <Input value={form.interviewDate} onChange={(event) => setForm((prev) => ({ ...prev, interviewDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Interview Time</Label>
                  <Input value={form.interviewTime} onChange={(event) => setForm((prev) => ({ ...prev, interviewTime: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Interviewer Name</Label>
                  <Input
                    value={form.interviewerName}
                    onChange={(event) => setForm((prev) => ({ ...prev, interviewerName: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Offer</Label>
                <Input value={form.offer} onChange={(event) => setForm((prev) => ({ ...prev, offer: event.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>

              <Button type="submit">{editingId ? "Update" : "Save"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dropdown Defaults</CardTitle>
            <CardDescription>Manage Response and Interview Stage options.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveSettings} className="space-y-3">
              <div className="space-y-2">
                <Label>Response Options</Label>
                <Input
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
                <Label>Interview Stage Options</Label>
                <Input
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
              <Button type="submit">Save Defaults</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications Table</CardTitle>
          <CardDescription>Filter, sort, and export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
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
              <option value="company">Sort: Company</option>
              <option value="response">Sort: Response</option>
            </Select>
            <Button variant="secondary" onClick={exportToExcel}>
              Export XLSX
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role Title</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Interview Stage</TableHead>
                <TableHead>Offer</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.company}</TableCell>
                  <TableCell>{job.roleTitle}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{job.response}</Badge>
                  </TableCell>
                  <TableCell>{job.interviewStage}</TableCell>
                  <TableCell>{job.offer || "-"}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
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
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
