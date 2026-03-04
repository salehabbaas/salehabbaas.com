"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlarmClock,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileUp,
  Link2,
  Loader2,
  MapPin,
  NotebookPen,
  Paperclip,
  Plus,
  Save,
  SlidersHorizontal,
  TimerReset,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react";

import { JobTrackerNav } from "@/components/admin/job-tracker-v2/job-tracker-nav";
import {
  formatDate,
  formatDateTime,
  fromDateTimeLocalInput,
  jobStatusColors,
  jobStatusLabels,
  toDateTimeLocalInput
} from "@/components/admin/job-tracker-v2/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  createInterview,
  createJob,
  createTask,
  deleteJob,
  getResumeDocumentIds,
  subscribeCompanies,
  subscribeDocumentsForJob,
  subscribeInterviewsForJob,
  subscribeJobs,
  subscribeTasksForJob,
  toggleTaskCompletion,
  updateJob,
  updateJobStatusWithHistory,
  uploadJobDocument
} from "@/lib/job-tracker/client";
import { cn } from "@/lib/utils";
import type {
  CompanyRecord,
  DocumentRecord,
  InterviewRecord,
  JobRecord,
  JobStatus,
  TaskRecord
} from "@/types/job-tracker-system";

const statusColumns: JobStatus[] = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"];

const emptyCreateForm = {
  companyId: "",
  roleTitle: "",
  jobUrl: "",
  location: "",
  salaryRateText: "",
  status: "SAVED" as JobStatus,
  applicationDate: "",
  deadline: "",
  notes: ""
};

const emptyInterviewForm = {
  stage: "Screen" as InterviewRecord["stage"],
  interviewDateTime: "",
  mode: "Zoom" as InterviewRecord["mode"],
  interviewerName: "",
  meetingLink: "",
  notes: ""
};

const emptyTaskForm = {
  title: "",
  dueDateTime: "",
  reminderAt: ""
};

export function JobTrackerJobsPage({ ownerId }: { ownerId: string }) {
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [resumeDocs, setResumeDocs] = useState<Array<{ id: string; title: string }>>([]);

  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");

  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [savingCreate, setSavingCreate] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [jobDraft, setJobDraft] = useState<JobRecord | null>(null);
  const [savingJobPatch, setSavingJobPatch] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);

  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  const [interviewForm, setInterviewForm] = useState(emptyInterviewForm);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [documentType, setDocumentType] = useState<DocumentRecord["type"]>("other");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const unsubJobs = subscribeJobs(ownerId, setJobs, (error) => setStatusMessage(error.message));
    const unsubCompanies = subscribeCompanies(ownerId, setCompanies, (error) => setStatusMessage(error.message));

    getResumeDocumentIds(ownerId)
      .then(setResumeDocs)
      .catch((error) => setStatusMessage(error instanceof Error ? error.message : "Unable to load resume docs."));

    return () => {
      unsubJobs();
      unsubCompanies();
    };
  }, [ownerId]);

  useEffect(() => {
    const jobIdFromQuery = searchParams.get("jobId")?.trim() ?? "";
    if (jobIdFromQuery) {
      setSelectedJobId(jobIdFromQuery);
    }
  }, [searchParams]);

  const companyById = useMemo(() => {
    const map = new Map<string, CompanyRecord>();
    companies.forEach((company) => map.set(company.id, company));
    return map;
  }, [companies]);

  useEffect(() => {
    if (!createForm.companyId && companies.length) {
      setCreateForm((current) => ({ ...current, companyId: companies[0].id }));
    }
  }, [companies, createForm.companyId]);

  const filteredJobs = useMemo(() => {
    const queryText = searchFilter.trim().toLowerCase();

    return jobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (companyFilter !== "all" && job.companyId !== companyFilter) return false;

      if (!queryText) return true;
      const companyName = companyById.get(job.companyId)?.name ?? "";
      return (
        companyName.toLowerCase().includes(queryText) ||
        job.roleTitle.toLowerCase().includes(queryText) ||
        job.location.toLowerCase().includes(queryText)
      );
    });
  }, [jobs, statusFilter, companyFilter, searchFilter, companyById]);

  const jobsByStatus = useMemo(() => {
    const map = new Map<JobStatus, JobRecord[]>();
    statusColumns.forEach((status) => map.set(status, []));

    filteredJobs.forEach((job) => {
      const rows = map.get(job.status) ?? [];
      rows.push(job);
      map.set(job.status, rows);
    });

    return map;
  }, [filteredJobs]);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  useEffect(() => {
    if (!selectedJob) {
      setJobDraft(null);
      return;
    }

    setJobDraft(selectedJob);
  }, [selectedJob]);

  useEffect(() => {
    if (!selectedJobId) {
      setInterviews([]);
      setTasks([]);
      setDocuments([]);
      return;
    }

    const unsubInterviews = subscribeInterviewsForJob(ownerId, selectedJobId, setInterviews, (error) => setStatusMessage(error.message));
    const unsubTasks = subscribeTasksForJob(ownerId, selectedJobId, setTasks, (error) => setStatusMessage(error.message));
    const unsubDocuments = subscribeDocumentsForJob(ownerId, selectedJobId, setDocuments, (error) => setStatusMessage(error.message));

    return () => {
      unsubInterviews();
      unsubTasks();
      unsubDocuments();
    };
  }, [ownerId, selectedJobId]);

  async function handleCreateJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCreate(true);
    setStatusMessage("");

    try {
      await createJob({
        userId: ownerId,
        companyId: createForm.companyId,
        roleTitle: createForm.roleTitle,
        jobUrl: createForm.jobUrl,
        location: createForm.location,
        salaryRateText: createForm.salaryRateText,
        status: createForm.status,
        applicationDate: createForm.applicationDate,
        deadline: createForm.deadline,
        sourceType: "manual",
        resumeStudioDocId: null,
        notes: createForm.notes
      });

      setCreateForm((current) => ({ ...emptyCreateForm, companyId: current.companyId || companies[0]?.id || "" }));
      setStatusMessage("Job created.");
      setCreateDialogOpen(false);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create job.");
    } finally {
      setSavingCreate(false);
    }
  }

  async function handleSaveJobDraft() {
    if (!jobDraft || !selectedJob) return;

    setSavingJobPatch(true);
    setStatusMessage("");

    try {
      if (selectedJob.status !== jobDraft.status) {
        await updateJobStatusWithHistory({
          userId: ownerId,
          jobId: selectedJob.id,
          fromStatus: selectedJob.status,
          toStatus: jobDraft.status,
          reason: "Status updated from Job Tracker edit dialog"
        });
      }

      await updateJob(jobDraft.id, {
        roleTitle: jobDraft.roleTitle,
        jobUrl: jobDraft.jobUrl,
        location: jobDraft.location,
        salaryRateText: jobDraft.salaryRateText,
        applicationDate: jobDraft.applicationDate,
        deadline: jobDraft.deadline,
        notes: jobDraft.notes,
        resumeStudioDocId: jobDraft.resumeStudioDocId,
        companyId: jobDraft.companyId
      });

      setStatusMessage("Job details updated.");
      setEditDialogOpen(false);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update job details.");
    } finally {
      setSavingJobPatch(false);
    }
  }

  async function handleDeleteJob(jobId: string) {
    if (!confirm("Delete this job?")) return;

    setStatusMessage("");
    try {
      await deleteJob(jobId);
      if (selectedJobId === jobId) setSelectedJobId("");
      setStatusMessage("Job deleted.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete job.");
    }
  }

  async function handleCreateInterview() {
    if (!selectedJobId) return;

    setStatusMessage("");
    try {
      await createInterview({
        userId: ownerId,
        jobId: selectedJobId,
        stage: interviewForm.stage,
        interviewDateTime: interviewForm.interviewDateTime,
        mode: interviewForm.mode,
        interviewerName: interviewForm.interviewerName,
        meetingLink: interviewForm.meetingLink,
        notes: interviewForm.notes
      });

      setInterviewForm(emptyInterviewForm);
      setStatusMessage("Interview added.");
      setInterviewDialogOpen(false);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create interview.");
    }
  }

  async function handleCreateTask() {
    if (!selectedJobId) return;

    setStatusMessage("");
    try {
      await createTask({
        userId: ownerId,
        jobId: selectedJobId,
        title: taskForm.title,
        dueDateTime: taskForm.dueDateTime,
        reminderAt: taskForm.reminderAt,
        isCompleted: false
      });
      setTaskForm(emptyTaskForm);
      setStatusMessage("Task created.");
      setTaskDialogOpen(false);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create task.");
    }
  }

  async function handleUploadDocument() {
    if (!selectedJobId || !documentFile) return;

    setStatusMessage("");
    try {
      await uploadJobDocument({
        userId: ownerId,
        jobId: selectedJobId,
        file: documentFile,
        type: documentType
      });
      setDocumentFile(null);
      setStatusMessage("Document uploaded.");
      setAttachmentDialogOpen(false);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to upload document.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Track manual and AI-imported jobs, update status history, and manage interview/tasks/documents in one drawer.
        </p>
      </div>

      <JobTrackerNav />

      <Card className="overflow-hidden border-border/60 bg-card/70">
        <CardContent className="relative p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsla(var(--warning),0.15),transparent_56%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Jobs actions</p>
              <p className="text-xs text-muted-foreground">
                Open create/edit forms from action buttons to keep the pipeline board focused.
              </p>
            </div>
            <Button
              type="button"
              variant="cta"
              className="transition-all duration-300 hover:-translate-y-0.5"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Job
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Pipeline Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Status: {statusFilter === "all" ? "All" : jobStatusLabels[statusFilter]}</Badge>
            <Badge variant="outline">
              Company: {companyFilter === "all" ? "All" : companyById.get(companyFilter)?.name || "Selected"}
            </Badge>
            {searchFilter ? <Badge variant="outline">Search: {searchFilter}</Badge> : null}
            <Badge variant="outline">Showing {filteredJobs.length}</Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            className="transition-all duration-300 hover:-translate-y-0.5"
            onClick={() => setFiltersDialogOpen(true)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Open Filters
          </Button>
        </CardContent>
      </Card>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-w-2xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(7,12,23,0.95)_35%)]">
          <DialogHeader className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
            <DialogTitle>Pipeline Filters</DialogTitle>
            <DialogDescription>Filter by status, company, and search text.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <ClipboardList className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
              <Select className="pl-10" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="all">All Statuses</option>
                {statusColumns.map((status) => (
                  <option key={status} value={status}>
                    {jobStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="relative">
              <Building2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
              <Select className="pl-10" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
                <option value="all">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="relative">
              <BriefcaseBusiness className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
              <Input
                className="pl-10"
                placeholder="Search role/company/location"
                value={searchFilter}
                onChange={(event) => setSearchFilter(event.target.value)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-5">
        {statusColumns.map((status) => {
          const rows = jobsByStatus.get(status) ?? [];
          return (
            <Card key={status} className="border-border/60 bg-card/70">
              <CardHeader className="space-y-2 pb-3">
                <CardTitle className="text-base">{jobStatusLabels[status]}</CardTitle>
                <Badge variant="outline" className="w-fit">
                  {rows.length} jobs
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {rows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No jobs in this stage.</p>
                ) : (
                  rows.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      className="w-full rounded-xl border border-border/60 bg-background/35 p-3 text-left transition hover:border-warning/35"
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <p className="text-sm font-medium text-foreground">{job.roleTitle}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{companyById.get(job.companyId)?.name ?? "Unknown Company"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{job.location || "No location"}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">Applied: {formatDate(job.applicationDate)}</p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(7,12,23,0.95)_35%)]">
          <DialogHeader className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <DialogTitle>Add Job</DialogTitle>
            <DialogDescription>Create a job record without showing the full form directly on the page.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreateJob}>
            <div className="relative">
              <Building2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Select
                className="pl-10"
                value={createForm.companyId}
                onChange={(event) => setCreateForm((current) => ({ ...current, companyId: event.target.value }))}
                required
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="relative">
              <BriefcaseBusiness className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                className="pl-10"
                value={createForm.roleTitle}
                onChange={(event) => setCreateForm((current) => ({ ...current, roleTitle: event.target.value }))}
                placeholder="Role title"
                required
              />
            </div>
            <div className="relative">
              <Link2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                className="pl-10"
                value={createForm.jobUrl}
                onChange={(event) => setCreateForm((current) => ({ ...current, jobUrl: event.target.value }))}
                placeholder="Job URL"
              />
            </div>
            <div className="relative">
              <MapPin className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                className="pl-10"
                value={createForm.location}
                onChange={(event) => setCreateForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="Location"
              />
            </div>
            <div className="relative">
              <Wallet className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                className="pl-10"
                value={createForm.salaryRateText}
                onChange={(event) => setCreateForm((current) => ({ ...current, salaryRateText: event.target.value }))}
                placeholder="Salary/Rate"
              />
            </div>
            <div className="relative">
              <ClipboardList className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Select
                className="pl-10"
                value={createForm.status}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    status: event.target.value as JobStatus
                  }))
                }
              >
                {statusColumns.map((status) => (
                  <option key={status} value={status}>
                    {jobStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                className="pl-10"
                type="datetime-local"
                value={toDateTimeLocalInput(createForm.applicationDate)}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, applicationDate: fromDateTimeLocalInput(event.target.value) }))
                }
              />
            </div>
            <div className="relative">
              <TimerReset className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                className="pl-10"
                type="datetime-local"
                value={toDateTimeLocalInput(createForm.deadline)}
                onChange={(event) => setCreateForm((current) => ({ ...current, deadline: fromDateTimeLocalInput(event.target.value) }))}
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                rows={3}
                className="border-border/70 bg-background/45"
                value={createForm.notes}
                onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Notes"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" variant="cta" className="transition-all duration-300 hover:-translate-y-0.5" disabled={savingCreate}>
                {savingCreate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Job
              </Button>
              <Button
                type="button"
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(selectedJobId)}
        onOpenChange={(open) => {
          if (open) return;
          setSelectedJobId("");
          setEditDialogOpen(false);
          setInterviewDialogOpen(false);
          setTaskDialogOpen(false);
          setAttachmentDialogOpen(false);
        }}
      >
        <SheetContent side="right" className="max-w-[760px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedJob?.roleTitle || "Job Detail"}</SheetTitle>
            <SheetDescription>{selectedJob ? companyById.get(selectedJob.companyId)?.name || "Unknown Company" : ""}</SheetDescription>
          </SheetHeader>

          {jobDraft ? (
            <div className="space-y-6 px-6 pb-6">
              <Card className="border-border/60 bg-background/30">
                <CardHeader>
                  <CardTitle className="text-base">Job Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn("border", jobStatusColors[jobDraft.status])}>{jobStatusLabels[jobDraft.status]}</Badge>
                    <span className="text-xs text-muted-foreground">Created: {formatDateTime(jobDraft.createdAt)}</span>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    <p>Role: {jobDraft.roleTitle}</p>
                    <p>Company: {companyById.get(jobDraft.companyId)?.name || "Unknown Company"}</p>
                    <p>Location: {jobDraft.location || "-"}</p>
                    <p>Salary/Rate: {jobDraft.salaryRateText || "-"}</p>
                    <p>Applied: {formatDateTime(jobDraft.applicationDate)}</p>
                    <p>Deadline: {formatDateTime(jobDraft.deadline)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="cta"
                      className="transition-all duration-300 hover:-translate-y-0.5"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      <NotebookPen className="mr-2 h-4 w-4" />
                      Edit Details
                    </Button>
                    {jobDraft.jobUrl ? (
                      <Link
                        href={jobDraft.jobUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-3 py-1 text-xs text-muted-foreground"
                      >
                        Open Job Link
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => void handleDeleteJob(jobDraft.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Job
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-background/30">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle className="text-base">Interviews</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setInterviewDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Interview
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {interviews.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No interviews yet.</p>
                  ) : (
                    interviews.map((interview) => (
                      <div key={interview.id} className="rounded-lg border border-border/60 p-3 text-xs">
                        <p className="font-medium text-foreground">
                          {interview.stage} • {interview.mode}
                        </p>
                        <p className="text-muted-foreground">{formatDateTime(interview.interviewDateTime)}</p>
                        <p className="text-muted-foreground">{interview.interviewerName || "No interviewer name"}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-background/30">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle className="text-base">Tasks & Reminders</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No tasks yet.</p>
                  ) : (
                    tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => void toggleTaskCompletion(task.id, !task.isCompleted)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs",
                          task.isCompleted ? "border-emerald-400/40 bg-emerald-500/10" : "border-border/60"
                        )}
                      >
                        <div>
                          <p className="font-medium text-foreground">{task.title}</p>
                          <p className="text-muted-foreground">
                            <CalendarClock className="mr-1 inline h-3 w-3" />
                            Due {formatDateTime(task.dueDateTime)} • Reminder {formatDateTime(task.reminderAt)}
                          </p>
                        </div>
                        <Badge variant="outline">{task.isCompleted ? "Completed" : "Open"}</Badge>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-background/30">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle className="text-base">Attachments</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setAttachmentDialogOpen(true)}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload File
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No attachments yet.</p>
                  ) : (
                    documents.map((item) => (
                      <Link
                        key={item.id}
                        href={item.fileUrl}
                        target="_blank"
                        className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs hover:border-warning/40"
                      >
                        <span>
                          {item.type} • {formatDate(item.uploadedAt)}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-3xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(7,12,23,0.95)_35%)]">
                  <DialogHeader className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
                    <DialogTitle>Edit Job Details</DialogTitle>
                    <DialogDescription>Update status, metadata, notes, and resume linkage.</DialogDescription>
                  </DialogHeader>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSaveJobDraft();
                    }}
                  >
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                      <Select
                        className="pl-10"
                        value={jobDraft.companyId}
                        onChange={(event) => setJobDraft((current) => (current ? { ...current, companyId: event.target.value } : current))}
                      >
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="relative">
                      <ClipboardList className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                      <Select
                        className="pl-10"
                        value={jobDraft.status}
                        onChange={(event) =>
                          setJobDraft((current) => (current ? { ...current, status: event.target.value as JobStatus } : current))
                        }
                      >
                        {statusColumns.map((status) => (
                          <option key={status} value={status}>
                            {jobStatusLabels[status]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="relative">
                      <BriefcaseBusiness className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                      <Input
                        className="pl-10"
                        value={jobDraft.roleTitle}
                        onChange={(event) => setJobDraft((current) => (current ? { ...current, roleTitle: event.target.value } : current))}
                        placeholder="Role title"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                      <Input
                        className="pl-10"
                        value={jobDraft.location}
                        onChange={(event) => setJobDraft((current) => (current ? { ...current, location: event.target.value } : current))}
                        placeholder="Location"
                      />
                    </div>
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                      <Input
                        className="pl-10"
                        value={jobDraft.jobUrl}
                        onChange={(event) => setJobDraft((current) => (current ? { ...current, jobUrl: event.target.value } : current))}
                        placeholder="Job URL"
                      />
                    </div>
                    <div className="relative">
                      <Wallet className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                      <Input
                        className="pl-10"
                        value={jobDraft.salaryRateText}
                        onChange={(event) =>
                          setJobDraft((current) => (current ? { ...current, salaryRateText: event.target.value } : current))
                        }
                        placeholder="Salary/Rate"
                      />
                    </div>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                      <Input
                        className="pl-10"
                        type="datetime-local"
                        value={toDateTimeLocalInput(jobDraft.applicationDate)}
                        onChange={(event) =>
                          setJobDraft((current) =>
                            current ? { ...current, applicationDate: fromDateTimeLocalInput(event.target.value) } : current
                          )
                        }
                      />
                    </div>
                    <div className="relative">
                      <TimerReset className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                      <Input
                        className="pl-10"
                        type="datetime-local"
                        value={toDateTimeLocalInput(jobDraft.deadline)}
                        onChange={(event) =>
                          setJobDraft((current) =>
                            current ? { ...current, deadline: fromDateTimeLocalInput(event.target.value) } : current
                          )
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Textarea
                        rows={3}
                        className="border-border/70 bg-background/45"
                        value={jobDraft.notes || ""}
                        onChange={(event) => setJobDraft((current) => (current ? { ...current, notes: event.target.value } : current))}
                        placeholder="Notes"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Select
                        value={jobDraft.resumeStudioDocId || ""}
                        onChange={(event) =>
                          setJobDraft((current) => (current ? { ...current, resumeStudioDocId: event.target.value || null } : current))
                        }
                      >
                        <option value="">No linked resume</option>
                        {resumeDocs.map((resume) => (
                          <option key={resume.id} value={resume.id}>
                            {resume.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      <Button type="submit" variant="cta" className="transition-all duration-300 hover:-translate-y-0.5" disabled={savingJobPatch}>
                        {savingJobPatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
                <DialogContent className="max-w-2xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(7,12,23,0.95)_35%)]">
                  <DialogHeader className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
                    <DialogTitle>Add Interview</DialogTitle>
                    <DialogDescription>Capture interview stage, datetime, mode, and notes.</DialogDescription>
                  </DialogHeader>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleCreateInterview();
                    }}
                  >
                    <Select
                      value={interviewForm.stage}
                      onChange={(event) =>
                        setInterviewForm((current) => ({ ...current, stage: event.target.value as InterviewRecord["stage"] }))
                      }
                    >
                      {["Screen", "Technical", "HR", "Onsite", "Final", "Other"].map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={interviewForm.mode}
                      onChange={(event) =>
                        setInterviewForm((current) => ({ ...current, mode: event.target.value as InterviewRecord["mode"] }))
                      }
                    >
                      {["Zoom", "Phone", "Onsite", "Other"].map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </Select>
                    <div className="relative">
                      <CalendarClock className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
                      <Input
                        className="pl-10"
                        type="datetime-local"
                        value={toDateTimeLocalInput(interviewForm.interviewDateTime)}
                        onChange={(event) =>
                          setInterviewForm((current) => ({ ...current, interviewDateTime: fromDateTimeLocalInput(event.target.value) }))
                        }
                      />
                    </div>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
                      <Input
                        className="pl-10"
                        value={interviewForm.interviewerName}
                        onChange={(event) => setInterviewForm((current) => ({ ...current, interviewerName: event.target.value }))}
                        placeholder="Interviewer name"
                      />
                    </div>
                    <div className="relative md:col-span-2">
                      <Link2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
                      <Input
                        className="pl-10"
                        value={interviewForm.meetingLink}
                        onChange={(event) => setInterviewForm((current) => ({ ...current, meetingLink: event.target.value }))}
                        placeholder="Meeting link"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Textarea
                        rows={2}
                        value={interviewForm.notes}
                        onChange={(event) => setInterviewForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Interview notes"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      <Button type="submit" variant="cta" className="transition-all duration-300 hover:-translate-y-0.5">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Interview
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setInterviewDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogContent className="max-w-xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(7,12,23,0.95)_35%)]">
                  <DialogHeader className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <DialogTitle>Add Task Reminder</DialogTitle>
                    <DialogDescription>Create a follow-up and reminder for this job.</DialogDescription>
                  </DialogHeader>
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleCreateTask();
                    }}
                  >
                    <div className="relative">
                      <ClipboardList className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300" />
                      <Input
                        className="pl-10"
                        value={taskForm.title}
                        onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Task title"
                      />
                    </div>
                    <div className="relative">
                      <AlarmClock className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300" />
                      <Input
                        className="pl-10"
                        type="datetime-local"
                        value={toDateTimeLocalInput(taskForm.dueDateTime)}
                        onChange={(event) => setTaskForm((current) => ({ ...current, dueDateTime: fromDateTimeLocalInput(event.target.value) }))}
                      />
                    </div>
                    <div className="relative">
                      <TimerReset className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300" />
                      <Input
                        className="pl-10"
                        type="datetime-local"
                        value={toDateTimeLocalInput(taskForm.reminderAt)}
                        onChange={(event) => setTaskForm((current) => ({ ...current, reminderAt: fromDateTimeLocalInput(event.target.value) }))}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" variant="cta" className="transition-all duration-300 hover:-translate-y-0.5">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
                <DialogContent className="max-w-xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(167,139,250,0.12),rgba(7,12,23,0.95)_35%)]">
                  <DialogHeader className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
                    <DialogTitle>Upload Attachment</DialogTitle>
                    <DialogDescription>Attach resume, cover letter, export, or supporting file to this job.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="relative">
                      <Paperclip className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300" />
                      <Select
                        className="pl-10"
                        value={documentType}
                        onChange={(event) => setDocumentType(event.target.value as DocumentRecord["type"])}
                      >
                        <option value="resume">Resume</option>
                        <option value="cover_letter">Cover Letter</option>
                        <option value="other">Other</option>
                        <option value="export">Export</option>
                      </Select>
                    </div>
                    <Input type="file" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="cta"
                        className="transition-all duration-300 hover:-translate-y-0.5"
                        onClick={() => void handleUploadDocument()}
                        disabled={!documentFile}
                      >
                        <FileUp className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setAttachmentDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="px-6 pb-6 text-sm text-muted-foreground">Select a job from the board.</div>
          )}
        </SheetContent>
      </Sheet>

      {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
    </div>
  );
}
