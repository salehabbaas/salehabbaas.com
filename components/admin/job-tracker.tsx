"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
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
import * as XLSX from "xlsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase/client";
import { formatDate } from "@/lib/utils";
import { JobApplication, JobStatus, JOB_EXPORT_HEADERS, JobTrackerSettings } from "@/types/job";

function timestampToIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

const defaultSettings: JobTrackerSettings = {
  statuses: ["saved", "applied", "screening", "assessment", "interview", "offer", "rejected", "withdrawn"],
  sources: ["LinkedIn", "Indeed", "Referral", "Company Site"],
  workModels: ["remote", "hybrid", "onsite"]
};

const defaultForm: Omit<JobApplication, "id"> = {
  company: "",
  role: "",
  status: "saved",
  location: "",
  workModel: "remote",
  source: "LinkedIn",
  jobUrl: "",
  salaryRange: "",
  contactName: "",
  contactEmail: "",
  appliedDate: "",
  nextStepDate: "",
  notes: ""
};

export function JobTracker() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [settings, setSettings] = useState<JobTrackerSettings>(defaultSettings);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const jobsQuery = query(collection(db, "jobApplications"), orderBy("updatedAt", "desc"));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snap) => {
      setJobs(
        snap.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            company: data.company ?? "",
            role: data.role ?? "",
            status: data.status ?? "saved",
            location: data.location ?? "",
            workModel: data.workModel ?? "remote",
            source: data.source ?? "LinkedIn",
            jobUrl: data.jobUrl ?? "",
            salaryRange: data.salaryRange ?? "",
            contactName: data.contactName ?? "",
            contactEmail: data.contactEmail ?? "",
            appliedDate: timestampToIso(data.appliedDate),
            nextStepDate: timestampToIso(data.nextStepDate),
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
        statuses: data.statuses ?? defaultSettings.statuses,
        sources: data.sources ?? defaultSettings.sources,
        workModels: data.workModels ?? defaultSettings.workModels
      });
    });

    return () => {
      unsubscribeJobs();
      unsubscribeSettings();
    };
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filterStatus && job.status !== filterStatus) return false;
      if (filterSource && job.source !== filterSource) return false;
      const keyword = searchText.trim().toLowerCase();
      if (!keyword) return true;
      return (
        job.company.toLowerCase().includes(keyword) ||
        job.role.toLowerCase().includes(keyword) ||
        job.notes?.toLowerCase().includes(keyword)
      );
    });
  }, [jobs, filterStatus, filterSource, searchText]);

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      ...form,
      appliedDate: form.appliedDate ? new Date(form.appliedDate) : null,
      nextStepDate: form.nextStepDate ? new Date(form.nextStepDate) : null,
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

  function exportToExcel() {
    const rows = filteredJobs.map((job) => ({
      Company: job.company,
      Role: job.role,
      Status: job.status,
      Location: job.location,
      "Work Model": job.workModel,
      Source: job.source,
      "Job URL": job.jobUrl || "",
      "Salary Range": job.salaryRange || "",
      "Contact Name": job.contactName || "",
      "Contact Email": job.contactEmail || "",
      "Applied Date": formatDate(job.appliedDate),
      "Next Step Date": formatDate(job.nextStepDate),
      Notes: job.notes || "",
      "Created At": formatDate(job.createdAt),
      "Updated At": formatDate(job.updatedAt)
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...JOB_EXPORT_HEADERS] as string[] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Job Applications");
    XLSX.writeFile(workbook, "saleh-job-tracker.xlsx");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Application Tracker</CardTitle>
          <CardDescription>Track applications, pipeline progress, and export reports to Excel.</CardDescription>
          {message ? <p className="text-sm text-primary">{message}</p> : null}
        </CardHeader>
      </Card>

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
                  <Label>Role</Label>
                  <Input value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))} required />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as JobStatus }))}
                  >
                    {settings.statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Work Model</Label>
                  <Select
                    value={form.workModel}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, workModel: event.target.value as JobApplication["workModel"] }))
                    }
                  >
                    {settings.workModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={form.source} onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}>
                    {settings.sources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Salary Range</Label>
                  <Input
                    value={form.salaryRange}
                    onChange={(event) => setForm((prev) => ({ ...prev, salaryRange: event.target.value }))}
                    placeholder="$120k - $150k"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Job URL</Label>
                  <Input value={form.jobUrl} onChange={(event) => setForm((prev) => ({ ...prev, jobUrl: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Applied Date</Label>
                  <Input
                    type="date"
                    value={form.appliedDate ? form.appliedDate.slice(0, 10) : ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, appliedDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Step Date</Label>
                  <Input
                    type="date"
                    value={form.nextStepDate ? form.nextStepDate.slice(0, 10) : ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, nextStepDate: event.target.value }))}
                  />
                </div>
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
            <CardTitle>Dropdown Settings</CardTitle>
            <CardDescription>Configure admin dropdown options from Firestore.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveSettings} className="space-y-3">
              <div className="space-y-2">
                <Label>Statuses</Label>
                <Input
                  value={settings.statuses.join(", ")}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      statuses: event.target.value
                        .split(",")
                        .map((value) => value.trim() as JobStatus)
                        .filter(Boolean)
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sources</Label>
                <Input
                  value={settings.sources.join(", ")}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      sources: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean)
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Work Models</Label>
                <Input
                  value={settings.workModels.join(", ")}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      workModels: event.target.value
                        .split(",")
                        .map((value) => value.trim() as JobApplication["workModel"])
                        .filter(Boolean)
                    }))
                  }
                />
              </div>
              <Button type="submit">Save Dropdowns</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Filter, inspect, and export your pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Search company/role/notes"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <Select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
              <option value="">All statuses</option>
              {settings.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Select value={filterSource} onChange={(event) => setFilterSource(event.target.value)}>
              <option value="">All sources</option>
              {settings.sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={exportToExcel}>
              Export XLSX
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Step</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <p className="font-medium">{job.company}</p>
                    <p className="text-xs text-muted-foreground">{job.location}</p>
                  </TableCell>
                  <TableCell>{job.role}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{job.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(job.nextStepDate)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(job.id);
                        setForm({
                          company: job.company,
                          role: job.role,
                          status: job.status,
                          location: job.location,
                          workModel: job.workModel,
                          source: job.source,
                          jobUrl: job.jobUrl,
                          salaryRange: job.salaryRange,
                          contactName: job.contactName,
                          contactEmail: job.contactEmail,
                          appliedDate: job.appliedDate,
                          nextStepDate: job.nextStepDate,
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
