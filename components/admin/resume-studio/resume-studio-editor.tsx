"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  FileText,
  History,
  LayoutTemplate,
  ListPlus,
  Loader2,
  Pencil,
  ScanSearch,
  Sparkles,
  SwatchBook,
  Undo2,
  Redo2,
  Rows3,
  Wand2,
  X
} from "lucide-react";

import { ResumeCanvasEditor } from "@/components/admin/resume-studio/resume-canvas-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BUILT_IN_RESUME_TEMPLATES, SECTION_CATALOG, createSection } from "@/lib/resume-studio/defaults";
import { db } from "@/lib/firebase/client";
import { mapResumeDocumentSnapshot, mapResumeTemplateSnapshot } from "@/lib/resume-studio/client-mappers";
import { resolveMarginBox, toPersistedResumeDocument } from "@/lib/resume-studio/normalize";
import { cn } from "@/lib/utils";
import type {
  AtsResult,
  ResumeDocumentRecord,
  ResumeQualityResult,
  ResumeTemplateRecord
} from "@/types/resume-studio";

function asIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

type VersionRecord = {
  id: string;
  note: string;
  createdAt?: string;
  snapshot: Omit<ResumeDocumentRecord, "id">;
};

const FONT_OPTIONS = [
  "Arial",
  "Calibri",
  "Inter",
  "Arimo",
  "Helvetica",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "Merriweather",
  "Source Sans Pro",
  "Poppins",
  "Lato",
  "Roboto",
  "Cambria"
];
const COLOR_SWATCHES = [
  "#0f172a",
  "#1d4ed8",
  "#0f766e",
  "#b45309",
  "#9333ea",
  "#be123c",
  "#111827",
  "#334155"
];

const railItems = [
  { id: "add", label: "Add Section", icon: ListPlus },
  { id: "rearrange", label: "Rearrange", icon: Rows3 },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "design", label: "Design & Font", icon: SwatchBook },
  { id: "improve", label: "Improve Text", icon: Wand2 },
  { id: "ats", label: "ATS", icon: ScanSearch },
  { id: "preview", label: "Preview / Export", icon: FileText },
  { id: "history", label: "History", icon: History }
] as const;
type RailPanelId = (typeof railItems)[number]["id"] | null;

export function ResumeStudioEditor({ ownerId, docId, actorEmail }: { ownerId: string; docId: string; actorEmail: string }) {
  const router = useRouter();
  const [docState, setDocState] = useState<ResumeDocumentRecord | null>(null);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [customTemplates, setCustomTemplates] = useState<ResumeTemplateRecord[]>([]);
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(1.5);

  const [activeRailPanel, setActiveRailPanel] = useState<RailPanelId>(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");

  const [aiMode, setAiMode] = useState("improve_summary");
  const [aiSectionId, setAiSectionId] = useState("");
  const [aiJobText, setAiJobText] = useState("");
  const [aiJobUrl, setAiJobUrl] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParsingJobUrl, setAiParsingJobUrl] = useState(false);
  const [aiModelOverride, setAiModelOverride] = useState<"" | "gpt-5.3" | "gpt-5.2">("");
  const [aiStrictTruthfulness, setAiStrictTruthfulness] = useState(true);
  const [customInstruction, setCustomInstruction] = useState("");

  const [history, setHistory] = useState<ResumeDocumentRecord[]>([]);
  const [future, setFuture] = useState<ResumeDocumentRecord[]>([]);

  const [quality, setQuality] = useState<ResumeQualityResult | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const [atsJobDescription, setAtsJobDescription] = useState("");
  const [atsJobUrl, setAtsJobUrl] = useState("");
  const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsParsingUrl, setAtsParsingUrl] = useState(false);

  const dirtyTimerRef = useRef<number | null>(null);
  const qualityLocalTimerRef = useRef<number | null>(null);
  const qualityAiTimerRef = useRef<number | null>(null);
  const lastAiQualityRunRef = useRef<number>(0);
  const localAbortRef = useRef<AbortController | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsubDoc = onSnapshot(doc(db, "resumeDocuments", docId), (snap) => {
      if (!snap.exists()) {
        setStatus("Document not found.");
        return;
      }

      const mapped = mapResumeDocumentSnapshot(snap.id, snap.data());
      setDocState((current) => current ?? mapped);
      setActiveSectionId((current) => current || mapped.sections[0]?.id || "");
      setAiSectionId((current) => current || mapped.sections[0]?.id || "");
      setRenameTitle((current) => current || mapped.title);
    });

    const unsubTemplates = onSnapshot(
      query(collection(db, "resumeTemplates"), where("ownerId", "==", ownerId), orderBy("updatedAt", "desc")),
      (snap) => {
        setCustomTemplates(
          snap.docs.map((entry) => {
            return mapResumeTemplateSnapshot(entry.id, entry.data());
          })
        );
      }
    );

    const unsubVersions = onSnapshot(
      query(collection(db, "resumeVersions"), where("ownerId", "==", ownerId), where("docId", "==", docId), orderBy("createdAt", "desc")),
      (snap) => {
        setVersions(
          snap.docs.map((entry) => {
            const data = entry.data();
            return {
              id: entry.id,
              note: String(data.note ?? ""),
              createdAt: asIso(data.createdAt),
              snapshot: data.snapshot as VersionRecord["snapshot"]
            };
          })
        );
      }
    );

    return () => {
      unsubDoc();
      unsubTemplates();
      unsubVersions();
    };
  }, [docId, ownerId]);

  useEffect(() => {
    if (!dirty || !docState) return;

    if (dirtyTimerRef.current) {
      window.clearTimeout(dirtyTimerRef.current);
    }

    dirtyTimerRef.current = window.setTimeout(async () => {
      try {
        const persisted = toPersistedResumeDoc(docState);
        await updateDoc(doc(db, "resumeDocuments", docState.id), {
          ...persisted,
          updatedAt: serverTimestamp()
        });
        setStatus("Saved");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to save changes");
      } finally {
        setDirty(false);
      }
    }, 650);

    return () => {
      if (dirtyTimerRef.current) {
        window.clearTimeout(dirtyTimerRef.current);
      }
    };
  }, [dirty, docState]);

  useEffect(() => {
    if (!docState) return;

    if (qualityLocalTimerRef.current) window.clearTimeout(qualityLocalTimerRef.current);
    if (qualityAiTimerRef.current) window.clearTimeout(qualityAiTimerRef.current);

    qualityLocalTimerRef.current = window.setTimeout(() => {
      localAbortRef.current?.abort();
      const controller = new AbortController();
      localAbortRef.current = controller;
      setQualityLoading(true);

      void fetch("/api/resume-studio/quality-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ docId: docState.id, includeAi: false })
      })
        .then(async (response) => {
          const payload = (await response.json()) as ResumeQualityResult & { error?: string };
          if (!response.ok) throw new Error(payload.error || "Quality scan failed");
          setQuality(payload);
        })
        .catch(() => {
          // Ignore in-editor scan noise.
        })
        .finally(() => setQualityLoading(false));
    }, 260);

    qualityAiTimerRef.current = window.setTimeout(() => {
      const now = Date.now();
      if (now - lastAiQualityRunRef.current < 3500) return;
      lastAiQualityRunRef.current = now;

      aiAbortRef.current?.abort();
      const controller = new AbortController();
      aiAbortRef.current = controller;

      void fetch("/api/resume-studio/quality-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ docId: docState.id, includeAi: true })
      })
        .then(async (response) => {
          const payload = (await response.json()) as ResumeQualityResult & { error?: string };
          if (!response.ok) throw new Error(payload.error || "Quality scan failed");
          setQuality(payload);
        })
        .catch(() => {
          // Ignore in-editor scan noise.
        });
    }, 1450);

    return () => {
      if (qualityLocalTimerRef.current) window.clearTimeout(qualityLocalTimerRef.current);
      if (qualityAiTimerRef.current) window.clearTimeout(qualityAiTimerRef.current);
      localAbortRef.current?.abort();
      aiAbortRef.current?.abort();
    };
  }, [docState]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const templateMap = useMemo(() => {
    const map = new Map<string, ResumeTemplateRecord>();
    BUILT_IN_RESUME_TEMPLATES.forEach((template) => map.set(template.id, template));
    customTemplates.forEach((template) => map.set(template.id, template));
    return map;
  }, [customTemplates]);

  const selectedTemplate = useMemo(() => {
    if (!docState) return BUILT_IN_RESUME_TEMPLATES[0];
    return templateMap.get(docState.templateId) ?? BUILT_IN_RESUME_TEMPLATES[0];
  }, [docState, templateMap]);

  const availableTemplates = useMemo(() => {
    const ids = new Set<string>();
    const output: ResumeTemplateRecord[] = [];
    for (const template of [...BUILT_IN_RESUME_TEMPLATES, ...customTemplates]) {
      if (ids.has(template.id)) continue;
      ids.add(template.id);
      output.push(template);
    }
    return output;
  }, [customTemplates]);

  function toPersistedResumeDoc(docInput: ResumeDocumentRecord) {
    return toPersistedResumeDocument({
      ...docInput,
      page: {
        ...docInput.page,
        size: "A4",
        marginBox: resolveMarginBox({
          marginBox: docInput.page.marginBox,
          margins: docInput.page.margins,
          fallback: 22
        })
      }
    });
  }

  function commitLocalChange(next: ResumeDocumentRecord, options?: { saveVersionNote?: string; recordHistory?: boolean }) {
    if (!docState) {
      setDocState(next);
      return;
    }

    if (options?.recordHistory !== false) {
      setHistory((current) => [...current.slice(-80), docState]);
      setFuture([]);
    }

    setDocState(next);
    setRenameTitle(next.title);
    setDirty(true);
    setStatus("Saving...");

    if (options?.saveVersionNote) {
      void addDoc(collection(db, "resumeVersions"), {
        docId: docState.id,
        ownerId,
        note: options.saveVersionNote,
        createdAt: serverTimestamp(),
        snapshot: toPersistedResumeDoc(next)
      });
    }
  }

  function undo() {
    if (!docState || !history.length) return;
    const previous = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [...current, docState]);
    setDocState(previous);
    setDirty(true);
    setStatus("Undo applied");
  }

  function redo() {
    if (!docState || !future.length) return;
    const next = future[future.length - 1];
    setFuture((current) => current.slice(0, -1));
    setHistory((current) => [...current, docState]);
    setDocState(next);
    setDirty(true);
    setStatus("Redo applied");
  }

  async function runAiImprove() {
    if (!docState || !aiSectionId) return;

    setAiLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/resume-studio/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: docState.id,
          sectionId: aiSectionId,
          mode: aiMode,
          customInstruction: aiMode === "custom_prompt" ? customInstruction : undefined,
          jobId: docState.linkedJobId || undefined,
          pastedJobDescription: aiJobText || undefined,
          language: docState.language.mode === "manual" ? docState.language.value : undefined,
          modelOverride: aiModelOverride || undefined,
          strictTruthfulness: aiStrictTruthfulness
        })
      });
      const payload = (await response.json()) as { error?: string; suggestion?: string };
      if (!response.ok) throw new Error(payload.error || "AI improve failed");
      setAiSuggestion(payload.suggestion ?? "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI improve failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function parseAiJobUrl() {
    if (!aiJobUrl.trim()) return;
    setAiParsingJobUrl(true);
    setStatus("");
    try {
      const response = await fetch("/api/resume-studio/job/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: aiJobUrl.trim() })
      });
      const payload = (await response.json()) as { error?: string; normalizedJobDescription?: string; confidence?: number };
      if (!response.ok || !payload.normalizedJobDescription) {
        throw new Error(payload.error || "Unable to parse job URL");
      }
      setAiJobText(payload.normalizedJobDescription);
      setStatus(`Parsed job URL (${Math.round((payload.confidence ?? 0) * 100)}% confidence).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to parse job URL");
    } finally {
      setAiParsingJobUrl(false);
    }
  }

  function applyAiSuggestion() {
    if (!docState || !aiSectionId || !aiSuggestion.trim()) return;

    const nextSections = docState.sections.map((section) => {
      if (section.id !== aiSectionId) return section;
      const data = { ...(section.data as Record<string, unknown>) };
      if (typeof data.text === "string") {
        data.text = aiSuggestion.trim();
      } else if (Array.isArray(data.items) && data.items.length > 0) {
        const first = { ...(data.items[0] as Record<string, unknown>) };
        first.bullets = aiSuggestion
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        data.items = [first, ...(data.items.slice(1) as Array<Record<string, unknown>>)];
      } else {
        data.text = aiSuggestion.trim();
      }

      return {
        ...section,
        data
      };
    });

    commitLocalChange(
      {
        ...docState,
        sections: nextSections
      },
      { saveVersionNote: "Applied AI rewrite", recordHistory: true }
    );
    setStatus("AI suggestion applied");
  }

  async function renameDocument() {
    if (!docState || !renameTitle.trim()) return;
    commitLocalChange({ ...docState, title: renameTitle.trim() }, { recordHistory: false });
    setRenameOpen(false);
  }

  async function duplicateDocument() {
    if (!docState) return;

    try {
      const ref = doc(collection(db, "resumeDocuments"));
      const persisted = toPersistedResumeDoc({ ...docState, title: `${docState.title} (Copy)` });
      await setDoc(ref, {
        ...persisted,
        pinned: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      router.push(`/admin/resume-studio/${ref.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to duplicate document");
    }
  }

  async function createCoverLetter() {
    if (!docState) return;
    setStatus("Generating cover letter...");
    try {
      const response = await fetch("/api/resume-studio/cover-letter/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: docState.id,
          jobId: docState.linkedJobId || undefined,
          pastedJobDescription: aiJobText || undefined,
          customInstruction: customInstruction || undefined,
          modelOverride: aiModelOverride || undefined,
          strictTruthfulness: aiStrictTruthfulness
        })
      });
      const payload = (await response.json()) as { error?: string; docId?: string };
      if (!response.ok || !payload.docId) throw new Error(payload.error || "Unable to create cover letter");
      router.push(`/admin/resume-studio/${payload.docId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create cover letter");
    }
  }

  function sanitizeFileName(input: string) {
    return input
      .trim()
      .replace(/[^a-zA-Z0-9-_\s]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 90);
  }

  async function loadInlinePreview() {
    if (!docState) return;
    setPreviewLoading(true);
    setStatus("");
    try {
      const fileName = sanitizeFileName(docState.title) || "resume";
      const response = await fetch("/api/resume-studio/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: docState.id,
          fileName,
          delivery: "inline"
        })
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Unable to render PDF preview");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to render PDF preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function downloadPdf() {
    if (!docState) return;
    setPreviewLoading(true);
    setStatus("");
    try {
      const fileName = sanitizeFileName(docState.title) || "resume";
      const response = await fetch("/api/resume-studio/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: docState.id,
          fileName,
          delivery: "download"
        })
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Unable to download PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileName}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus("PDF downloaded");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to download PDF");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveManualVersion() {
    if (!docState) return;

    await addDoc(collection(db, "resumeVersions"), {
      docId: docState.id,
      ownerId,
      note: "Manual version",
      createdAt: serverTimestamp(),
      snapshot: toPersistedResumeDoc(docState)
    });

    setStatus("Version snapshot saved");
  }

  if (!docState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resume Studio Editor</CardTitle>
          <CardDescription>Loading document...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const documentMarginBox = resolveMarginBox({
    marginBox: docState.page.marginBox,
    margins: docState.page.margins,
    fallback: selectedTemplate.paper.defaultMargins ?? 22
  });

  function patchMarginUniform(value: number) {
    if (!docState) return;
    const clamped = Math.max(6, Math.min(40, value));
    const nextDoc = {
      ...docState,
      page: {
        ...docState.page,
        margins: clamped,
        marginBox: {
          top: clamped,
          right: clamped,
          bottom: clamped,
          left: clamped
        }
      }
    };
    commitLocalChange(nextDoc, { recordHistory: false });
  }

  function moveSection(index: number, direction: -1 | 1) {
    if (!docState) return;
    const target = index + direction;
    if (target < 0 || target >= docState.sections.length) return;
    const sections = [...docState.sections];
    const [current] = sections.splice(index, 1);
    sections.splice(target, 0, current);
    commitLocalChange({ ...docState, sections }, { recordHistory: true });
  }

  function toggleRailPanel(panelId: Exclude<RailPanelId, null>) {
    setActiveRailPanel((current) => (current === panelId ? null : panelId));
  }

  async function applyFileMenuAction(value: string) {
    if (!value) return;
    if (value === "rename") setRenameOpen(true);
    if (value === "duplicate") await duplicateDocument();
    if (value === "cover_letter") await createCoverLetter();
    if (value === "back") router.push("/admin/resume-studio");
  }

  async function runAtsCheckPanel() {
    if (!docState) return;
    setAtsLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/resume-studio/ats-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: docState.id,
          jobId: docState.linkedJobId || undefined,
          pastedJobDescription: atsJobDescription || undefined
        })
      });
      const payload = (await response.json()) as AtsResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "ATS check failed");
      setAtsResult(payload);
      setStatus(`ATS score: ${payload.score}%`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ATS check failed");
    } finally {
      setAtsLoading(false);
    }
  }

  async function parseAtsJobUrlPanel() {
    if (!atsJobUrl.trim()) return;
    setAtsParsingUrl(true);
    setStatus("");
    try {
      const response = await fetch("/api/resume-studio/job/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: atsJobUrl.trim() })
      });
      const payload = (await response.json()) as { error?: string; normalizedJobDescription?: string; confidence?: number };
      if (!response.ok || !payload.normalizedJobDescription) {
        throw new Error(payload.error || "Unable to parse job URL");
      }
      setAtsJobDescription(payload.normalizedJobDescription);
      setStatus(`Job URL parsed (${Math.round((payload.confidence ?? 0) * 100)}%).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to parse job URL");
    } finally {
      setAtsParsingUrl(false);
    }
  }

  return (
    <div className="admin-workspace space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card/80 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">A4</Badge>
          <Badge variant="secondary">Template: {selectedTemplate.name}</Badge>
          {typeof docState.ats.lastScore === "number" ? <Badge>ATS {docState.ats.lastScore}%</Badge> : null}
          {quality ? <Badge variant="outline">Quality {quality.score}%</Badge> : null}
          {qualityLoading ? <Badge variant="secondary">Scanning...</Badge> : null}
          <p className="text-sm font-medium">{docState.title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={!history.length}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={!future.length}>
            <Redo2 className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={() => setZoom((current) => Math.max(0.5, Math.round((current - 0.1) * 100) / 100))}>-</Button>
          <Badge variant="outline">{Math.round(zoom * 100)}%</Badge>
          <Button variant="outline" size="sm" onClick={() => setZoom((current) => Math.min(2, Math.round((current + 0.1) * 100) / 100))}>+</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveRailPanel("preview");
              void loadInlinePreview();
            }}
            title="Preview PDF"
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Select value="" onChange={(event) => void applyFileMenuAction(event.target.value)} className="w-[170px]">
            <option value="">File Actions</option>
            <option value="rename">Rename</option>
            <option value="duplicate">Duplicate</option>
            <option value="cover_letter">Create Cover Letter</option>
            <option value="back">Back to Documents</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[86px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border/70 bg-card/85 p-2">
          <div className="space-y-2">
            {railItems.map((entry) => {
              const Icon = entry.icon;

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => toggleRailPanel(entry.id)}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-border/70 px-1 py-2 text-[10px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground",
                    activeRailPanel === entry.id ? "border-primary/50 bg-primary/10 text-foreground" : ""
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-center leading-tight">{entry.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="grid gap-3 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside
            className={cn(
              "hidden h-[calc(100vh-9.5rem)] overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-elev2 backdrop-blur transition-all duration-300 lg:block",
              activeRailPanel ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0 pointer-events-none"
            )}
          >
            {activeRailPanel ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
                  <p className="text-sm font-semibold">
                    {railItems.find((item) => item.id === activeRailPanel)?.label ?? "Tools"}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setActiveRailPanel(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {activeRailPanel === "templates" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Switch template without losing resume data.</p>
                      <div className="space-y-2">
                        {availableTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            className={`w-full rounded-xl border p-2 text-left ${docState.templateId === template.id ? "border-primary/50 bg-primary/10" : "border-border/70"}`}
                            onClick={() => {
                              commitLocalChange(
                                {
                                  ...docState,
                                  templateId: template.id,
                                  page: {
                                    ...docState.page,
                                    size: template.paper.size,
                                    margins: template.paper.defaultMargins,
                                    marginBox: resolveMarginBox({
                                      marginBox: template.paper.defaultMarginBox,
                                      margins: template.paper.defaultMargins,
                                      fallback: 22
                                    }),
                                    sectionSpacing: template.styleTokens.spacing.section
                                  }
                                },
                                { saveVersionNote: `Switched template to ${template.name}`, recordHistory: true }
                              );
                            }}
                          >
                            <p className="font-medium">{template.name}</p>
                            <p className="text-xs text-muted-foreground">{template.category.replace(/_/g, " ")}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeRailPanel === "add" ? (
                    <div className="space-y-2">
                      {SECTION_CATALOG.map((entry) => (
                        <button
                          key={entry.kind}
                          type="button"
                          className="w-full rounded-xl border border-border/70 p-2 text-left"
                          onClick={() => {
                            const section = createSection(entry.kind);
                            commitLocalChange(
                              {
                                ...docState,
                                sections: [...docState.sections, section]
                              },
                              { recordHistory: true }
                            );
                            setActiveSectionId(section.id);
                          }}
                        >
                          <p className="font-medium">{entry.label}</p>
                          <p className="text-xs text-muted-foreground">{entry.description}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {activeRailPanel === "rearrange" ? (
                    <div className="space-y-2">
                      {docState.sections.map((section, index) => (
                        <article key={section.id} className="flex items-center justify-between rounded-xl border border-border/70 p-2">
                          <div>
                            <p className="text-sm font-medium">{section.kind}</p>
                            {section.locked ? <p className="text-xs text-muted-foreground">Locked</p> : null}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => moveSection(index, 1)} disabled={index === docState.sections.length - 1}>
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {activeRailPanel === "design" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>Page Margins</span>
                          <span>{Math.round(docState.page.margins ?? documentMarginBox.top)}</span>
                        </div>
                        <input
                          type="range"
                          min={6}
                          max={40}
                          step={1}
                          value={Math.round(docState.page.margins ?? documentMarginBox.top)}
                          onChange={(event) => patchMarginUniform(Number(event.target.value || 22))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground"><span>Narrow</span><span>Wide</span></div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>Section Spacing</span>
                          <span>{docState.page.sectionSpacing}</span>
                        </div>
                        <input
                          type="range"
                          min={6}
                          max={28}
                          step={1}
                          value={docState.page.sectionSpacing}
                          onChange={(event) =>
                            commitLocalChange(
                              {
                                ...docState,
                                page: {
                                  ...docState.page,
                                  sectionSpacing: Number(event.target.value || 12)
                                }
                              },
                              { recordHistory: false }
                            )
                          }
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>Font Size Scale</span>
                          <span>{docState.style.fontScale.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min={0.75}
                          max={1.35}
                          step={0.01}
                          value={docState.style.fontScale}
                          onChange={(event) =>
                            commitLocalChange(
                              {
                                ...docState,
                                style: {
                                  ...docState.style,
                                  fontScale: Number(event.target.value || 1)
                                }
                              },
                              { recordHistory: false }
                            )
                          }
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>Line Height</span>
                          <span>{docState.style.lineHeight.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={1.1}
                          max={2}
                          step={0.05}
                          value={docState.style.lineHeight}
                          onChange={(event) =>
                            commitLocalChange(
                              {
                                ...docState,
                                style: {
                                  ...docState.style,
                                  lineHeight: Number(event.target.value || 1.4)
                                }
                              },
                              { recordHistory: false }
                            )
                          }
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Font Family</p>
                        <Select
                          value={docState.style.fontFamily}
                          onChange={(event) =>
                            commitLocalChange(
                              {
                                ...docState,
                                style: {
                                  ...docState.style,
                                  fontFamily: event.target.value
                                }
                              },
                              { recordHistory: false }
                            )
                          }
                        >
                          {FONT_OPTIONS.map((font) => (
                            <option key={font} value={font}>
                              {font}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Color Palette</p>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_SWATCHES.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className="relative h-8 w-8 rounded-full border border-border/70"
                              style={{ backgroundColor: color }}
                              onClick={() =>
                                commitLocalChange(
                                  {
                                    ...docState,
                                    style: {
                                      ...docState.style,
                                      primaryColor: color,
                                      accentColor: color,
                                      inheritTemplateColors: false
                                    }
                                  },
                                  { recordHistory: false }
                                )
                              }
                            >
                              {docState.style.primaryColor === color ? <Check className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-white" /> : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeRailPanel === "improve" ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <Select value={aiMode} onChange={(event) => setAiMode(event.target.value)}>
                          <option value="improve_summary">Improve summary</option>
                          <option value="rewrite_bullets">Rewrite bullets</option>
                          <option value="fix_grammar">Fix grammar</option>
                          <option value="tailor_to_job">Tailor to job</option>
                          <option value="generate_cover_letter">Generate cover letter</option>
                          <option value="custom_prompt">Custom prompt</option>
                        </Select>
                        <Select value={aiSectionId} onChange={(event) => setAiSectionId(event.target.value)}>
                          {docState.sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.kind}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {aiMode === "custom_prompt" ? (
                        <Textarea
                          rows={3}
                          value={customInstruction}
                          onChange={(event) => setCustomInstruction(event.target.value)}
                          placeholder="Write your custom instruction"
                        />
                      ) : null}
                      <Select value={aiModelOverride} onChange={(event) => setAiModelOverride((event.target.value as typeof aiModelOverride) || "")}>
                        <option value="">Model: Default (gpt-5.3 with fallback)</option>
                        <option value="gpt-5.3">Force gpt-5.3</option>
                        <option value="gpt-5.2">Force gpt-5.2</option>
                      </Select>
                      <label className="inline-flex h-10 items-center gap-2 rounded-2xl border border-input/80 bg-card/75 px-3 text-sm">
                        <input type="checkbox" checked={aiStrictTruthfulness} onChange={(event) => setAiStrictTruthfulness(event.target.checked)} />
                        Strict truthfulness
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <input
                          className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                          value={aiJobUrl}
                          onChange={(event) => setAiJobUrl(event.target.value)}
                          placeholder="Parse JD from URL"
                        />
                        <Button variant="outline" onClick={parseAiJobUrl} disabled={aiParsingJobUrl}>
                          {aiParsingJobUrl ? "Parsing..." : "Parse URL"}
                        </Button>
                      </div>
                      <Textarea rows={4} value={aiJobText} onChange={(event) => setAiJobText(event.target.value)} placeholder="Paste job description (optional)" />
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={runAiImprove} disabled={aiLoading}>
                          <Sparkles className="h-4 w-4" />
                          {aiLoading ? "Generating..." : "Improve"}
                        </Button>
                        <Button variant="outline" onClick={createCoverLetter}>
                          Create Cover Letter
                        </Button>
                      </div>
                      {aiSuggestion ? (
                        <>
                          <Textarea rows={8} value={aiSuggestion} onChange={(event) => setAiSuggestion(event.target.value)} />
                          <Button onClick={applyAiSuggestion}>Apply Suggestion</Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  {activeRailPanel === "ats" ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-border/70 bg-card/80 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Score</p>
                            <p className="text-2xl font-semibold">{atsResult?.score ?? docState.ats.lastScore ?? "-"}%</p>
                          </div>
                          <Button onClick={runAtsCheckPanel} disabled={atsLoading}>
                            {atsLoading ? "Checking..." : "Analyze"}
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input
                          className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                          value={atsJobUrl}
                          onChange={(event) => setAtsJobUrl(event.target.value)}
                          placeholder="Parse JD from URL"
                        />
                        <Button variant="outline" onClick={parseAtsJobUrlPanel} disabled={atsParsingUrl}>
                          {atsParsingUrl ? "Parsing..." : "Parse URL"}
                        </Button>
                      </div>
                      <Textarea
                        rows={5}
                        value={atsJobDescription}
                        onChange={(event) => setAtsJobDescription(event.target.value)}
                        placeholder="Paste target job description"
                      />
                      {atsResult ? (
                        <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                          <p className="mb-2 text-sm font-medium">Keyword Matrix</p>
                          <div className="max-h-64 overflow-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="pb-1">Keyword</th>
                                  <th className="pb-1">Resume</th>
                                  <th className="pb-1">Job</th>
                                  <th className="pb-1">Match</th>
                                </tr>
                              </thead>
                              <tbody>
                                {atsResult.keywordMatrix.map((row) => (
                                  <tr key={row.keyword} className="border-t border-border/60">
                                    <td className="py-1.5 font-medium">{row.keyword}</td>
                                    <td className="py-1.5">{row.resumeCount}</td>
                                    <td className="py-1.5">{row.jobCount}</td>
                                    <td className="py-1.5">{row.matched ? "Yes" : "No"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {activeRailPanel === "preview" ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={loadInlinePreview} disabled={previewLoading}>
                          {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {previewUrl ? "Refresh Preview" : "Load Preview"}
                        </Button>
                        <Button variant="outline" onClick={downloadPdf} disabled={previewLoading}>
                          Download PDF
                        </Button>
                      </div>
                      <div className="h-[52vh] overflow-hidden rounded-xl border border-border/70 bg-muted/25">
                        {previewUrl ? (
                          <iframe title="PDF Preview" src={previewUrl} className="h-full w-full" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Load preview to render PDF.</div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {activeRailPanel === "history" ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <Button variant="outline" onClick={undo} disabled={!history.length}>
                          <Undo2 className="h-4 w-4" /> Undo
                        </Button>
                        <Button variant="outline" onClick={redo} disabled={!future.length}>
                          <Redo2 className="h-4 w-4" /> Redo
                        </Button>
                      </div>
                      <Button variant="outline" onClick={saveManualVersion}>Save Version</Button>
                      <div className="space-y-2">
                        {versions.map((version) => (
                          <button
                            key={version.id}
                            type="button"
                            className="w-full rounded-xl border border-border/70 px-3 py-2 text-left"
                            onClick={() => {
                              commitLocalChange(
                                {
                                  ...docState,
                                  ...version.snapshot,
                                  id: docState.id,
                                  ownerId: docState.ownerId,
                                  createdAt: docState.createdAt,
                                  updatedAt: docState.updatedAt
                                },
                                { recordHistory: true }
                              );
                            }}
                          >
                            <p className="font-medium">{version.note || "Snapshot"}</p>
                            <p className="text-xs text-muted-foreground">{version.createdAt ? new Date(version.createdAt).toLocaleString() : "-"}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </aside>

          <div>
            <ResumeCanvasEditor
              doc={docState}
              template={selectedTemplate}
              activeSectionId={activeSectionId}
              onActiveSectionIdChange={setActiveSectionId}
              zoom={zoom}
              onRequestAi={(sectionId) => {
                setAiSectionId(sectionId);
                setActiveRailPanel("improve");
              }}
              onChange={(next) => commitLocalChange(next, { recordHistory: true })}
            />
          </div>
        </section>
      </div>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <Input value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} placeholder="Document title" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={renameDocument}>
              <Pencil className="h-4 w-4" /> Save Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {quality ? (
        <div className="rounded-2xl border border-border/70 bg-card/65 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">Spelling: {quality.spellingIssues.length}</Badge>
            <Badge variant="secondary">Grammar: {quality.grammarIssues.length}</Badge>
            <Badge variant="secondary">Readability: {quality.readabilityIssues.length}</Badge>
            <span className="text-muted-foreground">Live hybrid scan active</span>
          </div>
        </div>
      ) : null}

      <div className="text-xs text-muted-foreground">{actorEmail || "admin"} · Resume Studio v3</div>
    </div>
  );
}
