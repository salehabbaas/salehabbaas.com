"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePlus, Copy, Download, FileUp, Grid2X2, List, Loader2, Pencil, Search, ShieldCheck, Star, Trash2 } from "lucide-react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createDefaultResumeDocument } from "@/lib/resume-studio/defaults";
import { db, storage } from "@/lib/firebase/client";
import { mapResumeDocumentSnapshot } from "@/lib/resume-studio/client-mappers";
import type { JobTrackerJobRecord, ResumeDocumentRecord } from "@/types/resume-studio";

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

type ViewMode = "table" | "grid";

type FilterType = "all" | "resume" | "cover_letter";

const defaultCreateState = {
  type: "resume" as "resume" | "cover_letter",
  title: ""
};

export function ResumeStudioDocuments({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [docs, setDocs] = useState<ResumeDocumentRecord[]>([]);
  const [jobs, setJobs] = useState<JobTrackerJobRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [view, setView] = useState<ViewMode>("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDocId, setRenameDocId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importTitle, setImportTitle] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTemplate, setImportTemplate] = useState(true);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [createState, setCreateState] = useState(defaultCreateState);

  useEffect(() => {
    const docsQuery = query(collection(db, "resumeDocuments"), where("ownerId", "==", ownerId), orderBy("updatedAt", "desc"));
    const jobsQuery = query(collection(db, "jobTrackerJobs"), where("ownerId", "==", ownerId), orderBy("updatedAt", "desc"));

    const unsubs = [
      onSnapshot(docsQuery, (snap) => {
        setDocs(
          snap.docs.map((entry) => mapResumeDocumentSnapshot(entry.id, entry.data()))
        );
      }),
      onSnapshot(jobsQuery, (snap) => {
        setJobs(
          snap.docs.map((entry) => {
            const data = entry.data();
            return {
              id: entry.id,
              ownerId: String(data.ownerId ?? ""),
              company: String(data.company ?? ""),
              title: String(data.title ?? ""),
              location: typeof data.location === "string" ? data.location : "",
              jobUrl: typeof data.jobUrl === "string" ? data.jobUrl : "",
              status: data.status ?? "saved",
              appliedAt: asIso(data.appliedAt),
              nextFollowUpAt: asIso(data.nextFollowUpAt),
              descriptionText: String(data.descriptionText ?? ""),
              descriptionSource: data.descriptionSource ?? "paste",
              tags: Array.isArray(data.tags) ? data.tags.filter((item: unknown): item is string => typeof item === "string") : [],
              createdAt: asIso(data.createdAt),
              updatedAt: asIso(data.updatedAt)
            } satisfies JobTrackerJobRecord;
          })
        );
      })
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [ownerId]);

  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);

  const filteredDocs = useMemo(() => {
    return docs.filter((item) => {
      if (filter !== "all" && item.type !== filter) return false;

      const queryText = search.trim().toLowerCase();
      if (!queryText) return true;

      const linkedJob = item.linkedJobId ? jobsById.get(item.linkedJobId) : undefined;
      return (
        item.title.toLowerCase().includes(queryText) ||
        item.type.toLowerCase().includes(queryText) ||
        (linkedJob?.company ?? "").toLowerCase().includes(queryText) ||
        (linkedJob?.title ?? "").toLowerCase().includes(queryText)
      );
    });
  }, [docs, filter, search, jobsById]);

  async function createDocument() {
    setStatus("");

    try {
      const payload = createDefaultResumeDocument({
        ownerId,
        type: createState.type,
        title: createState.title.trim() || undefined
      });
      const ref = doc(collection(db, "resumeDocuments"));
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setCreateOpen(false);
      setCreateState(defaultCreateState);
      router.push(`/admin/resume-studio/${ref.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create document");
    }
  }

  async function duplicateDocument(documentId: string) {
    setStatus("");
    try {
      const source = docs.find((item) => item.id === documentId);
      if (!source) return;

      const ref = doc(collection(db, "resumeDocuments"));
      await setDoc(ref, {
        ...JSON.parse(JSON.stringify(source)),
        title: `${source.title} (Copy)`,
        pinned: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to duplicate document");
    }
  }

  async function removeDocument(documentId: string) {
    const confirmed = window.confirm("Delete this document? This cannot be undone.");
    if (!confirmed) return;

    setStatus("");
    try {
      await deleteDoc(doc(db, "resumeDocuments", documentId));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete document");
    }
  }

  function openRename(documentId: string, currentTitle: string) {
    setRenameDocId(documentId);
    setRenameValue(currentTitle);
    setRenameOpen(true);
  }

  async function renameDocument() {
    if (!renameDocId || !renameValue.trim()) return;
    setStatus("");
    try {
      await updateDoc(doc(db, "resumeDocuments", renameDocId), {
        title: renameValue.trim(),
        updatedAt: serverTimestamp()
      });
      setRenameOpen(false);
      setRenameDocId("");
      setRenameValue("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to rename document");
    }
  }

  async function togglePin(documentId: string, nextValue: boolean) {
    try {
      await updateDoc(doc(db, "resumeDocuments", documentId), {
        pinned: nextValue,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update pin state");
    }
  }

  async function importResumeDocument() {
    if (!importFile) {
      setStatus("Select a PDF or TXT file to import.");
      return;
    }

    const extension = importFile.name.toLowerCase().split(".").pop() || "";
    if (!["pdf", "txt", "md"].includes(extension)) {
      setStatus("Unsupported format. Use PDF or TXT.");
      return;
    }

    setImporting(true);
    setStatus("");
    try {
      const importId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const storagePath = `resume-imports/${ownerId}/${importId}.${extension}`;
      await uploadBytes(ref(storage, storagePath), importFile, {
        contentType: importFile.type || undefined
      });

      const response = await fetch("/api/resume-studio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath,
          title: importTitle.trim() || undefined,
          importTemplate,
          originalFileName: importFile.name
        })
      });
      const payload = (await response.json()) as { error?: string; docId?: string };
      if (!response.ok || !payload.docId) throw new Error(payload.error || "Resume import failed");

      setImportOpen(false);
      setImportFile(null);
      setImportTitle("");
      setImportTemplate(true);
      router.push(`/admin/resume-studio/${payload.docId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to import resume");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Resume Studio</CardTitle>
              <CardDescription>Manage resumes and cover letters with ATS-aware workflows.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => router.push("/admin/resume-studio/templates")}>
                Templates
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <FileUp className="h-4 w-4" />
                Import Resume
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <CirclePlus className="h-4 w-4" />
                Create New
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["all", "resume", "cover_letter"] as const).map((value) => (
                <Button key={value} variant={filter === value ? "default" : "outline"} size="sm" onClick={() => setFilter(value)}>
                  {value === "all" ? "All documents" : value === "resume" ? "Resumes" : "Cover letters"}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant={view === "table" ? "default" : "outline"} size="icon" onClick={() => setView("table")} aria-label="Table view">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={view === "grid" ? "default" : "outline"} size="icon" onClick={() => setView("grid")} aria-label="Grid view">
                <Grid2X2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents or linked jobs" className="pl-9" />
          </div>

          {status ? <p className="text-sm text-destructive">{status}</p> : null}
        </CardHeader>
      </Card>

      {view === "table" ? (
        <Card>
          <CardContent className="pt-6">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Linked Job</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((item) => {
                    const linkedJob = item.linkedJobId ? jobsById.get(item.linkedJobId) : undefined;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => togglePin(item.id, !item.pinned)}
                              className="rounded-md border border-border/70 p-1 text-muted-foreground hover:text-foreground"
                              aria-label={item.pinned ? "Unpin" : "Pin"}
                            >
                              <Star className={`h-3.5 w-3.5 ${item.pinned ? "fill-current text-warning" : ""}`} />
                            </button>
                            <button className="text-left font-medium hover:underline" onClick={() => router.push(`/admin/resume-studio/${item.id}`)}>
                              {item.title}
                            </button>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            {typeof item.ats.lastScore === "number" ? <Badge variant="secondary">ATS {item.ats.lastScore}%</Badge> : null}
                            <Badge variant="outline">Owner: Saleh</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {linkedJob ? (
                            <Badge variant="outline">{linkedJob.company} · {linkedJob.title}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Not linked</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.type === "resume" ? "default" : "secondary"}>{item.type === "resume" ? "Resume" : "Cover letter"}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>{formatDate(item.updatedAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => router.push(`/admin/resume-studio/${item.id}`)}>
                              Open
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => duplicateDocument(item.id)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openRename(item.id, item.title)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/admin/resume-studio/${item.id}/export`)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/admin/resume-studio/${item.id}/ats`)}>
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => removeDocument(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {filteredDocs.map((item) => {
                const linkedJob = item.linkedJobId ? jobsById.get(item.linkedJobId) : undefined;
                return (
                  <article key={item.id} className="rounded-2xl border border-border/70 bg-card/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <button className="text-left font-semibold hover:underline" onClick={() => router.push(`/admin/resume-studio/${item.id}`)}>
                          {item.title}
                        </button>
                        <p className="mt-1 text-xs text-muted-foreground">Updated {formatDate(item.updatedAt)}</p>
                      </div>
                      <button type="button" onClick={() => togglePin(item.id, !item.pinned)} aria-label={item.pinned ? "Unpin" : "Pin"}>
                        <Star className={`h-4 w-4 ${item.pinned ? "fill-current text-warning" : "text-muted-foreground"}`} />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge>{item.type === "resume" ? "Resume" : "Cover Letter"}</Badge>
                      {typeof item.ats.lastScore === "number" ? <Badge variant="secondary">ATS {item.ats.lastScore}%</Badge> : null}
                      {linkedJob ? <Badge variant="outline">{linkedJob.company}</Badge> : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/admin/resume-studio/${item.id}`)}>Open</Button>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/admin/resume-studio/${item.id}/ats`)}>ATS</Button>
                      <Button size="sm" variant="outline" onClick={() => openRename(item.id, item.title)}>Rename</Button>
                      <Button size="sm" variant="destructive" onClick={() => removeDocument(item.id)}>Delete</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDocs.map((item) => {
            const linkedJob = item.linkedJobId ? jobsById.get(item.linkedJobId) : undefined;
            return (
              <Card key={item.id} className="border-border/70 bg-card/85">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <button className="text-left font-semibold hover:underline" onClick={() => router.push(`/admin/resume-studio/${item.id}`)}>
                      {item.title}
                    </button>
                    <button type="button" onClick={() => togglePin(item.id, !item.pinned)} aria-label={item.pinned ? "Unpin" : "Pin"}>
                      <Star className={`h-4 w-4 ${item.pinned ? "fill-current text-warning" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                  <CardDescription>{linkedJob ? `${linkedJob.company} · ${linkedJob.title}` : "No linked job"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge>{item.type === "resume" ? "Resume" : "Cover Letter"}</Badge>
                    {typeof item.ats.lastScore === "number" ? <Badge variant="secondary">ATS {item.ats.lastScore}%</Badge> : null}
                    <Badge variant="outline">Updated {formatDate(item.updatedAt)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/admin/resume-studio/${item.id}`)}>Open</Button>
                    <Button size="sm" variant="outline" onClick={() => duplicateDocument(item.id)}>Duplicate</Button>
                    <Button size="sm" variant="outline" onClick={() => openRename(item.id, item.title)}>Rename</Button>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/admin/resume-studio/${item.id}/ats`)}>ATS Check</Button>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/admin/resume-studio/${item.id}/export`)}>Export</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>Start from a structured template and edit inline.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={createState.type}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    type: event.target.value === "cover_letter" ? "cover_letter" : "resume"
                  }))
                }
              >
                <option value="resume">Resume</option>
                <option value="cover_letter">Cover letter</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={createState.title}
                onChange={(event) => setCreateState((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={createState.type === "resume" ? "Senior Software Engineer Resume" : "Cover Letter - Product Engineer"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createDocument}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="Document title" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={renameDocument}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Resume</DialogTitle>
            <DialogDescription>Upload a PDF or TXT file and convert it into an editable Resume Studio document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Document Title (optional)</label>
              <Input value={importTitle} onChange={(event) => setImportTitle(event.target.value)} placeholder="Senior Software Engineer Resume" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Resume File</label>
              <Input
                type="file"
                accept="application/pdf,text/plain,.txt,.md"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Supported formats: PDF, TXT.</p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm">
              <input type="checkbox" checked={importTemplate} onChange={(event) => setImportTemplate(event.target.checked)} />
              Auto-create matching template from the imported PDF layout when possible.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancel</Button>
            <Button onClick={importResumeDocument} disabled={importing || !importFile}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {importing ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
