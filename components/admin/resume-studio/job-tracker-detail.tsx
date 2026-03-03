"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { ArrowLeft, CirclePlus, Link2, Sparkles } from "lucide-react";

import { CompanyPicker } from "@/components/admin/company/company-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase/client";
import { mapResumeDocumentSnapshot } from "@/lib/resume-studio/client-mappers";
import type { JobResumeLinkRecord, JobTrackerJobRecord, ResumeActivityRecord, ResumeDocumentRecord } from "@/types/resume-studio";

const statusOptions: Array<JobTrackerJobRecord["status"]> = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];

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
  return date.toLocaleString();
}

export function JobTrackerDetail({ ownerId, jobId }: { ownerId: string; jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobTrackerJobRecord | null>(null);
  const [allResumes, setAllResumes] = useState<ResumeDocumentRecord[]>([]);
  const [links, setLinks] = useState<JobResumeLinkRecord[]>([]);
  const [activity, setActivity] = useState<ResumeActivityRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [tailorBaseDocId, setTailorBaseDocId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubJob = onSnapshot(
      doc(db, "jobTrackerJobs", jobId),
      (snap) => {
        if (!snap.exists()) {
          setStatusMessage("Job not found");
          return;
        }

        const data = snap.data();
        const mapped = {
          id: snap.id,
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

        setJob(mapped);
      },
      (error) => {
        setStatusMessage(error.code === "permission-denied" ? "Missing Firestore permissions for this job." : error.message);
      }
    );

    const unsubLinks = onSnapshot(
      query(collection(db, "jobResumeLinks"), where("ownerId", "==", ownerId), where("jobId", "==", jobId), orderBy("createdAt", "desc")),
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
        setStatusMessage(error.code === "permission-denied" ? "Missing Firestore permissions for job links." : error.message);
      }
    );

    const unsubResumes = onSnapshot(
      query(collection(db, "resumeDocuments"), where("ownerId", "==", ownerId), orderBy("updatedAt", "desc")),
      (snap) => {
        const mapped = snap.docs.map((entry) => mapResumeDocumentSnapshot(entry.id, entry.data()));

        setAllResumes(mapped);
        if (!tailorBaseDocId && mapped.length) {
          setTailorBaseDocId(mapped[0].id);
        }
        if (!selectedResumeId && mapped.length) {
          setSelectedResumeId(mapped[0].id);
        }
      },
      (error) => {
        setStatusMessage(error.code === "permission-denied" ? "Missing Firestore permissions for resumes." : error.message);
      }
    );

    const unsubActivity = onSnapshot(
      query(
        collection(db, "activity"),
        where("ownerId", "==", ownerId),
        where("entityType", "==", "job"),
        where("entityId", "==", jobId),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        setActivity(
          snap.docs.map((entry) => {
            const data = entry.data();
            return {
              id: entry.id,
              ownerId: String(data.ownerId ?? ""),
              entityType: data.entityType === "job" ? "job" : "resumeDocument",
              entityId: String(data.entityId ?? ""),
              action: String(data.action ?? ""),
              from: typeof data.from === "string" ? data.from : "",
              to: typeof data.to === "string" ? data.to : "",
              createdAt: asIso(data.createdAt)
            } satisfies ResumeActivityRecord;
          })
        );
      },
      (error) => {
        setStatusMessage(error.code === "permission-denied" ? "Missing Firestore permissions for activity." : error.message);
      }
    );

    return () => {
      unsubJob();
      unsubLinks();
      unsubResumes();
      unsubActivity();
    };
  }, [jobId, ownerId, selectedResumeId, tailorBaseDocId]);

  const linkedResumeIds = useMemo(() => new Set(links.map((link) => link.docId)), [links]);

  const linkedResumeRecords = useMemo(() => {
    const byId = new Map(allResumes.map((resume) => [resume.id, resume]));
    return links
      .map((link) => ({
        link,
        resume: byId.get(link.docId)
      }))
      .filter((entry) => entry.resume);
  }, [links, allResumes]);

  async function saveJobField(patch: Partial<JobTrackerJobRecord>, activityAction?: { action: string; from?: string; to?: string }) {
    if (!job) return;

    try {
      await updateDoc(doc(db, "jobTrackerJobs", job.id), {
        ...patch,
        updatedAt: serverTimestamp()
      });

      if (activityAction) {
        await addDoc(collection(db, "activity"), {
          ownerId,
          entityType: "job",
          entityId: job.id,
          action: activityAction.action,
          from: activityAction.from ?? "",
          to: activityAction.to ?? "",
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update job");
    }
  }

  async function linkExistingResume() {
    if (!job || !selectedResumeId) return;

    try {
      if (linkedResumeIds.has(selectedResumeId)) {
        setStatusMessage("This resume is already linked.");
        return;
      }

      await addDoc(collection(db, "jobResumeLinks"), {
        ownerId,
        jobId: job.id,
        docId: selectedResumeId,
        createdAt: serverTimestamp(),
        atsScore: null,
        notes: ""
      });

      await updateDoc(doc(db, "resumeDocuments", selectedResumeId), {
        linkedJobId: job.id,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "activity"), {
        ownerId,
        entityType: "job",
        entityId: job.id,
        action: "resume_linked",
        from: "",
        to: selectedResumeId,
        createdAt: serverTimestamp()
      });

      setLinkDialogOpen(false);
      setStatusMessage("Resume linked");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to link resume");
    }
  }

  async function createTailoredResume() {
    if (!job || !tailorBaseDocId) return;

    setLoading(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/resume-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseDocId: tailorBaseDocId,
          jobId: job.id
        })
      });

      const payload = (await response.json()) as { error?: string; docId?: string };
      if (!response.ok || !payload.docId) throw new Error(payload.error || "Unable to create tailored resume");

      router.push(`/admin/resume-studio/${payload.docId}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create tailored resume");
    } finally {
      setLoading(false);
    }
  }

  if (!job) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Detail</CardTitle>
          <CardDescription>Loading job...</CardDescription>
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
              <CardTitle>{job.company} · {job.title}</CardTitle>
              <CardDescription>Job detail and linked resumes.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push("/admin/job-tracker")}> 
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Overview</CardTitle>
            <CardDescription>Update status and details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <CompanyPicker
                ownerId={ownerId}
                companyId={job.companyId}
                companyName={job.company}
                onSelect={(company) => {
                  setJob((current) => (current ? { ...current, companyId: company.id, company: company.name } : current));
                  void saveJobField({ companyId: company.id, company: company.name }, { action: "company_linked", to: company.id });
                }}
                onNameChange={(name) => setJob((current) => (current ? { ...current, companyId: "", company: name } : current))}
              />
              <Input value={job.title} onChange={(event) => setJob((current) => (current ? { ...current, title: event.target.value } : current))} onBlur={() => saveJobField({ title: job.title })} />
              <Input value={job.location ?? ""} placeholder="Location" onChange={(event) => setJob((current) => (current ? { ...current, location: event.target.value } : current))} onBlur={() => saveJobField({ location: job.location || "" })} />
              <Input value={job.jobUrl ?? ""} placeholder="Job URL" onChange={(event) => setJob((current) => (current ? { ...current, jobUrl: event.target.value } : current))} onBlur={() => saveJobField({ jobUrl: job.jobUrl || "" })} />
              <Select
                value={job.status}
                onChange={(event) => {
                  const nextStatus = (event.target.value as JobTrackerJobRecord["status"]) || "saved";
                  const prevStatus = job.status;
                  setJob((current) => (current ? { ...current, status: nextStatus } : current));
                  void saveJobField({ status: nextStatus }, { action: "status_changed", from: prevStatus, to: nextStatus });
                }}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
              <Input
                type="date"
                value={job.appliedAt ? job.appliedAt.slice(0, 10) : ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setJob((current) => (current ? { ...current, appliedAt: value } : current));
                  void saveJobField({ appliedAt: value ? new Date(value).toISOString() : "" }, { action: "applied_date_updated" });
                }}
              />
              <Input
                type="date"
                value={job.nextFollowUpAt ? job.nextFollowUpAt.slice(0, 10) : ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setJob((current) => (current ? { ...current, nextFollowUpAt: value } : current));
                  void saveJobField({ nextFollowUpAt: value ? new Date(value).toISOString() : "" }, { action: "followup_updated" });
                }}
              />
            </div>
            <Textarea
              rows={12}
              value={job.descriptionText}
              onChange={(event) => setJob((current) => (current ? { ...current, descriptionText: event.target.value } : current))}
              onBlur={() => saveJobField({ descriptionText: job.descriptionText })}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked Documents</CardTitle>
              <CardDescription>Tailored and linked resumes for this job.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={tailorBaseDocId} onChange={(event) => setTailorBaseDocId(event.target.value)}>
                  {allResumes.map((resume) => (
                    <option key={resume.id} value={resume.id}>{resume.title}</option>
                  ))}
                </Select>
                <Button onClick={createTailoredResume} disabled={loading || !tailorBaseDocId}>
                  <Sparkles className="h-4 w-4" />
                  {loading ? "Generating..." : "Create Tailored Resume"}
                </Button>
              </div>

              <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
                <Link2 className="h-4 w-4" />
                Link Existing Resume
              </Button>

              <div className="space-y-2">
                {linkedResumeRecords.map(({ link, resume }) => (
                  <article key={link.id} className="rounded-xl border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{resume?.title ?? "Resume"}</p>
                      <Badge variant="secondary">ATS {typeof link.atsScore === "number" ? `${link.atsScore}%` : "-"}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/resume-studio/${resume?.id}`}>Open</Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/resume-studio/${resume?.id}/ats`}>ATS</Link>
                      </Button>
                    </div>
                  </article>
                ))}
                {!linkedResumeRecords.length ? <p className="text-sm text-muted-foreground">No linked resumes yet.</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
              <CardDescription>Status changes, generated docs, and actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {activity.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border/70 bg-card/75 p-3 text-sm">
                  <p className="font-medium">{entry.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                  {(entry.from || entry.to) ? <p className="text-xs text-muted-foreground">{entry.from || "-"} → {entry.to || "-"}</p> : null}
                </div>
              ))}
              {!activity.length ? <p className="text-sm text-muted-foreground">No activity recorded yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Existing Resume</DialogTitle>
            <DialogDescription>Attach an existing resume to this job.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedResumeId} onChange={(event) => setSelectedResumeId(event.target.value)}>
              {allResumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">Linked resumes will appear in this job timeline and ATS summary.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={linkExistingResume}>
              <CirclePlus className="h-4 w-4" />
              Link Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
