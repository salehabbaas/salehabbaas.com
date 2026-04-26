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
  ChevronLeft,
  Download,
  Eye,
  FilePlus,
  GripVertical,
  History,
  LayoutTemplate,
  ListPlus,
  Loader2,
  Pencil,
  RotateCcw,
  RotateCw,
  Rows3,
  ScanSearch,
  Sparkles,
  SwatchBook,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

import { SectionEditor } from "@/components/admin/resume-studio/section-editors";
import { AtsPanel } from "@/components/admin/resume-studio/ats-panel";
import { ResumeLivePreview } from "@/components/admin/resume-studio/resume-live-preview";
import { TemplatePicker } from "@/components/admin/resume-studio/template-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BUILT_IN_RESUME_TEMPLATES, SECTION_CATALOG, createSection } from "@/lib/resume-studio/defaults";
import { db } from "@/lib/firebase/client";
import { mapResumeDocumentSnapshot, mapResumeTemplateSnapshot } from "@/lib/resume-studio/client-mappers";
import { resolveMarginBox, toPersistedResumeDocument } from "@/lib/resume-studio/normalize";
import { cn } from "@/lib/utils";
import type {
  AtsResult,
  ResumeDocumentRecord,
  ResumeQualityResult,
  ResumeSectionBlock,
  ResumeTemplateRecord
} from "@/types/resume-studio";

// ─── Utilities ────────────────────────────────────────────────────────────────

function asIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}

function sanitizeFileName(input: string) {
  return input.trim().replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "-").toLowerCase().slice(0, 90);
}

// ─── Rail button component ────────────────────────────────────────────────────

function RailButton({
  id,
  icon: Icon,
  label,
  activeRailPanel,
  onClick,
}: {
  id: RailPanelId;
  icon: React.FC<{ className?: string }>;
  label: string;
  activeRailPanel: RailPanelId;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex flex-col items-center justify-center gap-1 w-full py-2.5 px-1 rounded-xl text-[10px] font-medium transition border",
        activeRailPanel === id
          ? "bg-blue-50 border-blue-300 text-blue-700"
          : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  "Arimo", "Arial", "Calibri", "Inter", "Helvetica", "Verdana",
  "Georgia", "Times New Roman", "Merriweather", "Source Sans Pro",
  "Poppins", "Lato", "Roboto", "Cambria"
];

const COLOR_SWATCHES = [
  "#0f172a", "#1d4ed8", "#0f766e", "#b45309",
  "#9333ea", "#be123c", "#111827", "#334155", "#374151"
];

type VersionRecord = {
  id: string;
  note: string;
  createdAt?: string;
  snapshot: Omit<ResumeDocumentRecord, "id">;
};

type RailPanelId = "sections" | "add" | "rearrange" | "templates" | "design" | "improve" | "ats" | null;

const SECTION_KIND_LABELS: Record<ResumeSectionBlock["kind"], string> = {
  header: "Header",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  languages: "Languages",
  volunteering: "Volunteering",
  interests: "Interests",
  publications: "Publications",
  research: "Research",
  awards: "Awards",
  custom: "Custom",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResumeStudioEditor({ ownerId, docId, actorEmail }: { ownerId: string; docId: string; actorEmail: string }) {
  const router = useRouter();

  const [docState, setDocState] = useState<ResumeDocumentRecord | null>(null);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [customTemplates, setCustomTemplates] = useState<ResumeTemplateRecord[]>([]);
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);

  // Left panel
  const [activeRailPanel, setActiveRailPanel] = useState<RailPanelId>("sections");

  // Rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");

  // AI improve
  const [aiMode, setAiMode] = useState("improve_summary");
  const [aiSectionId, setAiSectionId] = useState("");
  const [aiJobText, setAiJobText] = useState("");
  const [aiJobUrl, setAiJobUrl] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParsingJobUrl, setAiParsingJobUrl] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");

  // History
  const [history, setHistory] = useState<ResumeDocumentRecord[]>([]);
  const [future, setFuture] = useState<ResumeDocumentRecord[]>([]);

  // Quality
  const [quality, setQuality] = useState<ResumeQualityResult | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);

  // ATS
  const [atsJobDescription, setAtsJobDescription] = useState("");
  const [atsJobUrl, setAtsJobUrl] = useState("");
  const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsParsingUrl, setAtsParsingUrl] = useState(false);

  // Preview
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Refs
  const dirtyTimerRef = useRef<number | null>(null);
  const qualityLocalTimerRef = useRef<number | null>(null);
  const qualityAiTimerRef = useRef<number | null>(null);
  const lastAiQualityRunRef = useRef<number>(0);
  const localAbortRef = useRef<AbortController | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  // ─── Firebase subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    const unsubDoc = onSnapshot(doc(db, "resumeDocuments", docId), (snap) => {
      if (!snap.exists()) { setStatus("Document not found."); return; }
      const mapped = mapResumeDocumentSnapshot(snap.id, snap.data());
      setDocState((current) => current ?? mapped);
      setActiveSectionId((current) => current || mapped.sections[0]?.id || "");
      setAiSectionId((current) => current || mapped.sections[0]?.id || "");
      setRenameTitle((current) => current || mapped.title);
    });

    const unsubTemplates = onSnapshot(
      query(collection(db, "resumeTemplates"), where("ownerId", "==", ownerId), orderBy("updatedAt", "desc")),
      (snap) => setCustomTemplates(snap.docs.map(e => mapResumeTemplateSnapshot(e.id, e.data())))
    );

    const unsubVersions = onSnapshot(
      query(collection(db, "resumeVersions"), where("ownerId", "==", ownerId), where("docId", "==", docId), orderBy("createdAt", "desc")),
      (snap) => setVersions(snap.docs.map(e => ({
        id: e.id,
        note: String(e.data().note ?? ""),
        createdAt: asIso(e.data().createdAt),
        snapshot: e.data().snapshot as VersionRecord["snapshot"],
      })))
    );

    return () => { unsubDoc(); unsubTemplates(); unsubVersions(); };
  }, [docId, ownerId]);

  // ─── Auto-save ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dirty || !docState) return;
    if (dirtyTimerRef.current) window.clearTimeout(dirtyTimerRef.current);

    dirtyTimerRef.current = window.setTimeout(async () => {
      try {
        const persisted = toPersistedResumeDoc(docState);
        await updateDoc(doc(db, "resumeDocuments", docState.id), { ...persisted, updatedAt: serverTimestamp() });
        setStatus("Saved");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to save changes");
      } finally {
        setDirty(false);
      }
    }, 650);

    return () => { if (dirtyTimerRef.current) window.clearTimeout(dirtyTimerRef.current); };
  }, [dirty, docState]);

  // ─── Quality scan ──────────────────────────────────────────────────────────

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
        .then(async (r) => {
          const payload = (await r.json()) as ResumeQualityResult & { error?: string };
          if (!r.ok) throw new Error(payload.error || "Quality scan failed");
          setQuality(payload);
        })
        .catch(() => {})
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
        .then(async (r) => {
          const payload = (await r.json()) as ResumeQualityResult & { error?: string };
          if (!r.ok) throw new Error(payload.error || "Quality scan failed");
          setQuality(payload);
        })
        .catch(() => {});
    }, 1450);

    return () => {
      if (qualityLocalTimerRef.current) window.clearTimeout(qualityLocalTimerRef.current);
      if (qualityAiTimerRef.current) window.clearTimeout(qualityAiTimerRef.current);
      localAbortRef.current?.abort();
      aiAbortRef.current?.abort();
    };
  }, [docState]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const templateMap = useMemo(() => {
    const map = new Map<string, ResumeTemplateRecord>();
    BUILT_IN_RESUME_TEMPLATES.forEach(t => map.set(t.id, t));
    customTemplates.forEach(t => map.set(t.id, t));
    return map;
  }, [customTemplates]);

  const selectedTemplate = useMemo(() => {
    if (!docState) return BUILT_IN_RESUME_TEMPLATES[0];
    return templateMap.get(docState.templateId) ?? BUILT_IN_RESUME_TEMPLATES[0];
  }, [docState, templateMap]);

  function toPersistedResumeDoc(docInput: ResumeDocumentRecord) {
    return toPersistedResumeDocument({
      ...docInput,
      page: {
        ...docInput.page,
        size: "A4",
        marginBox: resolveMarginBox({ marginBox: docInput.page.marginBox, margins: docInput.page.margins, fallback: 22 })
      }
    });
  }

  function commitLocalChange(next: ResumeDocumentRecord, options?: { saveVersionNote?: string; recordHistory?: boolean }) {
    if (!docState) { setDocState(next); return; }
    if (options?.recordHistory !== false) {
      setHistory(cur => [...cur.slice(-80), docState]);
      setFuture([]);
    }
    setDocState(next);
    setRenameTitle(next.title);
    setDirty(true);
    setStatus("Saving...");
    if (options?.saveVersionNote) {
      void addDoc(collection(db, "resumeVersions"), {
        docId: docState.id, ownerId, note: options.saveVersionNote,
        createdAt: serverTimestamp(), snapshot: toPersistedResumeDoc(next)
      });
    }
  }

  function undo() {
    if (!docState || !history.length) return;
    const previous = history[history.length - 1];
    setHistory(cur => cur.slice(0, -1));
    setFuture(cur => [...cur, docState]);
    setDocState(previous);
    setDirty(true);
    setStatus("Undo applied");
  }

  function redo() {
    if (!docState || !future.length) return;
    const next = future[future.length - 1];
    setFuture(cur => cur.slice(0, -1));
    setHistory(cur => [...cur, docState]);
    setDocState(next);
    setDirty(true);
    setStatus("Redo applied");
  }

  function patchMarginUniform(value: number) {
    if (!docState) return;
    const clamped = Math.max(6, Math.min(40, value));
    commitLocalChange({
      ...docState,
      page: { ...docState.page, margins: clamped, marginBox: { top: clamped, right: clamped, bottom: clamped, left: clamped } }
    }, { recordHistory: false });
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

  function deleteSection(sectionId: string) {
    if (!docState) return;
    const section = docState.sections.find(s => s.id === sectionId);
    if (section?.locked) return;
    const next = docState.sections.filter(s => s.id !== sectionId);
    commitLocalChange({ ...docState, sections: next }, { recordHistory: true });
    const remaining = next[0]?.id ?? "";
    if (activeSectionId === sectionId) setActiveSectionId(remaining);
  }

  // ─── ATS check ─────────────────────────────────────────────────────────────

  async function runAtsCheck() {
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

  async function parseAtsJobUrl() {
    if (!atsJobUrl.trim()) return;
    setAtsParsingUrl(true);
    try {
      const r = await fetch("/api/resume-studio/job/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: atsJobUrl.trim() })
      });
      const payload = (await r.json()) as { error?: string; normalizedJobDescription?: string; confidence?: number };
      if (!r.ok || !payload.normalizedJobDescription) throw new Error(payload.error || "Unable to parse job URL");
      setAtsJobDescription(payload.normalizedJobDescription);
      setStatus(`Job URL parsed (${Math.round((payload.confidence ?? 0) * 100)}%).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to parse job URL");
    } finally {
      setAtsParsingUrl(false);
    }
  }

  // ─── AI improve ─────────────────────────────────────────────────────────────

  async function runAiImprove() {
    if (!docState || !aiSectionId) return;
    setAiLoading(true);
    try {
      const r = await fetch("/api/resume-studio/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: docState.id, sectionId: aiSectionId, mode: aiMode,
          customInstruction: aiMode === "custom_prompt" ? customInstruction : undefined,
          jobId: docState.linkedJobId || undefined, pastedJobDescription: aiJobText || undefined,
          language: docState.language.mode === "manual" ? docState.language.value : undefined,
        })
      });
      const payload = (await r.json()) as { error?: string; suggestion?: string };
      if (!r.ok) throw new Error(payload.error || "AI improve failed");
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
    try {
      const r = await fetch("/api/resume-studio/job/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: aiJobUrl.trim() })
      });
      const payload = (await r.json()) as { error?: string; normalizedJobDescription?: string; confidence?: number };
      if (!r.ok || !payload.normalizedJobDescription) throw new Error(payload.error || "Unable to parse job URL");
      setAiJobText(payload.normalizedJobDescription);
      setStatus(`Job parsed (${Math.round((payload.confidence ?? 0) * 100)}% confidence).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to parse job URL");
    } finally {
      setAiParsingJobUrl(false);
    }
  }

  function applyAiSuggestion() {
    if (!docState || !aiSectionId || !aiSuggestion.trim()) return;
    const nextSections = docState.sections.map(section => {
      if (section.id !== aiSectionId) return section;
      const data = { ...(section.data as Record<string, unknown>) };
      if (typeof data.text === "string") {
        data.text = aiSuggestion.trim();
      } else if (Array.isArray(data.items) && (data.items as unknown[]).length > 0) {
        const first = { ...((data.items as Array<Record<string, unknown>>)[0]) };
        first.bullets = aiSuggestion.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        data.items = [first, ...(data.items as Array<Record<string, unknown>>).slice(1)];
      } else {
        data.text = aiSuggestion.trim();
      }
      return { ...section, data };
    });
    commitLocalChange({ ...docState, sections: nextSections }, { saveVersionNote: "Applied AI rewrite", recordHistory: true });
    setAiSuggestion("");
    setStatus("AI suggestion applied");
  }

  // ─── Template apply ────────────────────────────────────────────────────────

  function applyTemplate(templateId: string) {
    if (!docState) return;
    const template = templateMap.get(templateId);
    if (!template) return;
    commitLocalChange({
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
        sectionSpacing: template.styleTokens.spacing.section,
      }
    }, { saveVersionNote: `Switched template to ${template.name}`, recordHistory: true });
  }

  // ─── PDF download ──────────────────────────────────────────────────────────

  async function downloadPdf() {
    if (!docState) return;
    setDownloadingPdf(true);
    setStatus("");
    try {
      const fileName = sanitizeFileName(docState.title) || "resume";
      const r = await fetch("/api/resume-studio/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: docState.id, fileName, delivery: "download" })
      });
      if (!r.ok) throw new Error("Unable to download PDF");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${fileName}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setStatus("PDF downloaded");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  }

  // ─── Rename ────────────────────────────────────────────────────────────────

  async function renameDocument() {
    if (!docState || !renameTitle.trim()) return;
    commitLocalChange({ ...docState, title: renameTitle.trim() }, { recordHistory: false });
    setRenameOpen(false);
  }

  // ─── Duplicate ─────────────────────────────────────────────────────────────

  async function duplicateDocument() {
    if (!docState) return;
    try {
      const ref = doc(collection(db, "resumeDocuments"));
      const persisted = toPersistedResumeDoc({ ...docState, title: `${docState.title} (Copy)` });
      await setDoc(ref, { ...persisted, pinned: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      router.push(`/admin/resume-studio/${ref.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to duplicate");
    }
  }

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (!docState) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading resume…
      </div>
    );
  }

  const documentMarginBox = resolveMarginBox({
    marginBox: docState.page.marginBox,
    margins: docState.page.margins,
    fallback: selectedTemplate.paper.defaultMargins ?? 22
  });

  const activeSection = docState.sections.find(s => s.id === activeSectionId);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4.5rem)] bg-slate-50 overflow-hidden">

      {/* ── Rail (icon nav) ─────────────────────────────── */}
      <div className="w-16 flex-shrink-0 flex flex-col gap-1 p-2 bg-white border-r border-slate-200">
        <button
          onClick={() => router.push("/admin/resume-studio")}
          className="flex items-center justify-center w-full h-8 mb-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <RailButton id="sections" icon={Pencil} label="Edit" activeRailPanel={activeRailPanel} onClick={() => setActiveRailPanel(cur => cur === "sections" ? null : "sections")} />
        <RailButton id="add" icon={ListPlus} label="Add" activeRailPanel={activeRailPanel} onClick={() => setActiveRailPanel(cur => cur === "add" ? null : "add")} />
        <RailButton id="rearrange" icon={Rows3} label="Order" activeRailPanel={activeRailPanel} onClick={() => setActiveRailPanel(cur => cur === "rearrange" ? null : "rearrange")} />
        <RailButton id="templates" icon={LayoutTemplate} label="Templates" activeRailPanel={activeRailPanel} onClick={() => setActiveRailPanel(cur => cur === "templates" ? null : "templates")} />
        <RailButton id="design" icon={SwatchBook} label="Design" activeRailPanel={activeRailPanel} onClick={() => setActiveRailPanel(cur => cur === "design" ? null : "design")} />
        <RailButton id="improve" icon={Wand2} label="AI" activeRailPanel={activeRailPanel} onClick={() => setActiveRailPanel(cur => cur === "improve" ? null : "improve")} />
        <RailButton id="ats" icon={ScanSearch} label="ATS" activeRailPanel={activeRailPanel} onClick={() => setActiveRailPanel(cur => cur === "ats" ? null : "ats")} />

        {/* ATS score badge */}
        {docState.ats.lastScore !== undefined && (
          <div className="mt-1 flex flex-col items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white",
              (docState.ats.lastScore ?? 0) >= 80 ? "bg-green-500" :
              (docState.ats.lastScore ?? 0) >= 60 ? "bg-yellow-500" : "bg-red-500"
            )}>
              {docState.ats.lastScore}
            </div>
            <span className="text-[9px] text-slate-400 mt-0.5">ATS</span>
          </div>
        )}
      </div>

      {/* ── Left panel ──────────────────────────────────── */}
      {activeRailPanel && (
        <div className="w-[320px] flex-shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">
              {activeRailPanel === "sections" ? "Edit Sections" :
               activeRailPanel === "add" ? "Add Section" :
               activeRailPanel === "rearrange" ? "Reorder Sections" :
               activeRailPanel === "templates" ? "Templates" :
               activeRailPanel === "design" ? "Design & Style" :
               activeRailPanel === "improve" ? "AI Improve" :
               "ATS Analysis"}
            </h2>
            <div className="flex items-center gap-1">
              {/* Undo/Redo */}
              {(activeRailPanel === "sections" || activeRailPanel === "improve") && (
                <>
                  <button onClick={undo} disabled={!history.length} title="Undo" className="p-1.5 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 transition">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={redo} disabled={!future.length} title="Redo" className="p-1.5 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 transition">
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button onClick={() => setActiveRailPanel(null)} className="p-1.5 rounded text-slate-400 hover:text-slate-600 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto">

            {/* ── SECTIONS panel ──────────────────────────── */}
            {activeRailPanel === "sections" && (
              <div className="flex flex-col h-full">
                {/* Section tabs */}
                <div className="flex flex-col gap-0.5 p-2 border-b border-slate-100 max-h-48 overflow-y-auto">
                  {docState.sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSectionId(section.id)}
                      className={cn(
                        "flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition",
                        activeSectionId === section.id
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="flex-1 truncate">{SECTION_KIND_LABELS[section.kind]}</span>
                      {!section.locked && activeSectionId === section.id && (
                        <button
                          onClick={e => { e.stopPropagation(); deleteSection(section.id); }}
                          className="p-0.5 rounded text-slate-300 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>

                {/* Active section editor */}
                <div className="flex-1 overflow-y-auto p-4">
                  {activeSection ? (
                    <SectionEditor
                      key={activeSection.id}
                      section={activeSection}
                      onChange={(newData) => {
                        if (!docState) return;
                        commitLocalChange({
                          ...docState,
                          sections: docState.sections.map(s =>
                            s.id === activeSection.id ? { ...s, data: newData } : s
                          )
                        }, { recordHistory: false });
                      }}
                    />
                  ) : (
                    <p className="text-sm text-slate-400 text-center mt-8">Select a section to edit</p>
                  )}
                </div>
              </div>
            )}

            {/* ── ADD SECTION panel ─────────────────────── */}
            {activeRailPanel === "add" && (
              <div className="p-3 flex flex-col gap-2">
                <p className="text-xs text-slate-400 mb-1">Click a section type to add it to your resume.</p>
                {SECTION_CATALOG.map(entry => (
                  <button
                    key={entry.kind}
                    onClick={() => {
                      const section = createSection(entry.kind);
                      commitLocalChange({ ...docState, sections: [...docState.sections, section] }, { recordHistory: true });
                      setActiveSectionId(section.id);
                      setActiveRailPanel("sections");
                    }}
                    className="flex flex-col text-left px-3 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition"
                  >
                    <span className="text-sm font-medium text-slate-700">{entry.label}</span>
                    <span className="text-xs text-slate-400">{entry.description}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ── REARRANGE panel ───────────────────────── */}
            {activeRailPanel === "rearrange" && (
              <div className="p-3 flex flex-col gap-2">
                <p className="text-xs text-slate-400 mb-1">Use arrows to reorder sections.</p>
                {docState.sections.map((section, index) => (
                  <div key={section.id} className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl">
                    <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-slate-700">
                      {SECTION_KIND_LABELS[section.kind]}
                    </span>
                    {section.locked && <span className="text-xs text-slate-400">Locked</span>}
                    {!section.locked && (
                      <div className="flex gap-0.5">
                        <button onClick={() => moveSection(index, -1)} disabled={index === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 transition">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveSection(index, 1)} disabled={index === docState.sections.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 transition">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── TEMPLATES panel ───────────────────────── */}
            {activeRailPanel === "templates" && (
              <div className="p-3">
                <TemplatePicker doc={docState} customTemplates={customTemplates} onApply={applyTemplate} />
              </div>
            )}

            {/* ── DESIGN panel ──────────────────────────── */}
            {activeRailPanel === "design" && (
              <div className="p-4 flex flex-col gap-5">

                {/* Primary color */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Accent Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_SWATCHES.map(color => (
                      <button
                        key={color}
                        onClick={() => commitLocalChange({ ...docState, style: { ...docState.style, primaryColor: color } }, { recordHistory: false })}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition",
                          docState.style.primaryColor === color ? "border-slate-700 scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={docState.style.primaryColor || "#0f172a"}
                    onChange={e => commitLocalChange({ ...docState, style: { ...docState.style, primaryColor: e.target.value } }, { recordHistory: false })}
                    className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                  />
                </div>

                {/* Font family */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Font</label>
                  <select
                    value={docState.style.fontFamily}
                    onChange={e => commitLocalChange({ ...docState, style: { ...docState.style, fontFamily: e.target.value } }, { recordHistory: false })}
                    className="h-8 px-2 rounded-md border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {/* Margins */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span>Page Margins</span>
                    <span className="font-normal text-slate-700">{Math.round(docState.page.margins ?? documentMarginBox.top)}mm</span>
                  </div>
                  <input type="range" min={6} max={40} step={1}
                    value={Math.round(docState.page.margins ?? documentMarginBox.top)}
                    onChange={e => patchMarginUniform(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400"><span>Narrow</span><span>Wide</span></div>
                </div>

                {/* Section spacing */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span>Section Spacing</span>
                    <span className="font-normal text-slate-700">{docState.page.sectionSpacing}pt</span>
                  </div>
                  <input type="range" min={6} max={28} step={1}
                    value={docState.page.sectionSpacing}
                    onChange={e => commitLocalChange({ ...docState, page: { ...docState.page, sectionSpacing: Number(e.target.value) } }, { recordHistory: false })}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* Font scale */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span>Font Scale</span>
                    <span className="font-normal text-slate-700">{Math.round((docState.style.fontScale ?? 1) * 100)}%</span>
                  </div>
                  <input type="range" min={80} max={120} step={1}
                    value={Math.round((docState.style.fontScale ?? 1) * 100)}
                    onChange={e => commitLocalChange({ ...docState, style: { ...docState.style, fontScale: Number(e.target.value) / 100 } }, { recordHistory: false })}
                    className="w-full accent-blue-600"
                  />
                </div>

              </div>
            )}

            {/* ── AI IMPROVE panel ──────────────────────── */}
            {activeRailPanel === "improve" && (
              <div className="p-4 flex flex-col gap-4">

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Section to improve</label>
                  <select
                    value={aiSectionId}
                    onChange={e => { setAiSectionId(e.target.value); setAiSuggestion(""); }}
                    className="h-8 px-2 rounded-md border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    {docState.sections.map(s => (
                      <option key={s.id} value={s.id}>{SECTION_KIND_LABELS[s.kind]}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mode</label>
                  <select
                    value={aiMode}
                    onChange={e => { setAiMode(e.target.value); setAiSuggestion(""); }}
                    className="h-8 px-2 rounded-md border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="improve_summary">Improve Summary</option>
                    <option value="rewrite_bullets">Rewrite Bullets</option>
                    <option value="fix_grammar">Fix Grammar</option>
                    <option value="tailor_to_job">Tailor to Job</option>
                    <option value="custom_prompt">Custom Prompt</option>
                  </select>
                </div>

                {aiMode === "custom_prompt" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Your instruction</label>
                    <textarea
                      value={customInstruction}
                      onChange={e => setCustomInstruction(e.target.value)}
                      rows={3}
                      placeholder="e.g. Make it sound more technical and leadership-focused..."
                      className="px-2.5 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                )}

                {(aiMode === "tailor_to_job") && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        value={aiJobUrl}
                        onChange={e => setAiJobUrl(e.target.value)}
                        placeholder="Job URL..."
                        className="flex-1 h-8 px-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                      <button onClick={parseAiJobUrl} disabled={aiParsingJobUrl || !aiJobUrl.trim()}
                        className="px-2.5 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-sm text-slate-600 disabled:opacity-50 transition">
                        {aiParsingJobUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Parse"}
                      </button>
                    </div>
                    <textarea
                      value={aiJobText}
                      onChange={e => setAiJobText(e.target.value)}
                      rows={4}
                      placeholder="Or paste job description..."
                      className="px-2.5 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                )}

                <button
                  onClick={runAiImprove}
                  disabled={aiLoading}
                  className="flex items-center justify-center gap-2 h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 transition"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {aiLoading ? "Improving…" : "Improve with AI"}
                </button>

                {aiSuggestion && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">AI Suggestion</label>
                    <textarea
                      value={aiSuggestion}
                      onChange={e => setAiSuggestion(e.target.value)}
                      rows={8}
                      className="px-2.5 py-2 rounded-md border border-blue-200 bg-blue-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={applyAiSuggestion}
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
                      >
                        <Check className="w-3.5 h-3.5" /> Apply
                      </button>
                      <button onClick={() => setAiSuggestion("")}
                        className="px-3 h-8 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition">
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ATS panel ─────────────────────────────── */}
            {activeRailPanel === "ats" && (
              <div className="p-3">
                <AtsPanel
                  doc={docState}
                  result={atsResult}
                  loading={atsLoading}
                  jobDescription={atsJobDescription}
                  jobUrl={atsJobUrl}
                  parsingUrl={atsParsingUrl}
                  onJobDescriptionChange={setAtsJobDescription}
                  onJobUrlChange={setAtsJobUrl}
                  onRun={runAtsCheck}
                  onParseUrl={parseAtsJobUrl}
                />
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Main area: header + preview ──────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setRenameOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-blue-600 transition min-w-0"
            >
              <span className="truncate max-w-48">{docState.title}</span>
              <Pencil className="w-3 h-3 flex-shrink-0" />
            </button>
            <span className="text-xs text-slate-400 flex-shrink-0">{status}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quality indicator */}
            {quality && quality.issues.length > 0 && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                {quality.issues.length} quality {quality.issues.length === 1 ? "issue" : "issues"}
              </Badge>
            )}

            <button
              onClick={duplicateDocument}
              className="flex items-center gap-1 px-2.5 h-7 rounded-md border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition"
            >
              <FilePlus className="w-3.5 h-3.5" />
              Duplicate
            </button>

            <button
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3 h-7 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-60"
            >
              {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {downloadingPdf ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="flex-1 overflow-hidden">
          <ResumeLivePreview
            doc={docState}
            customTemplates={customTemplates}
            docId={docId}
          />
        </div>
      </div>

      {/* ── Rename dialog ─────────────────────────────── */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <input
            value={renameTitle}
            onChange={e => setRenameTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && renameDocument()}
            className="h-10 w-full px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={renameDocument} disabled={!renameTitle.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
