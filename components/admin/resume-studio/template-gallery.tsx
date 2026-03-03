"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Archive, Filter, Plus, Trash2, Upload } from "lucide-react";

import { BUILT_IN_RESUME_TEMPLATES, createDefaultResumeDocument } from "@/lib/resume-studio/defaults";
import { db } from "@/lib/firebase/client";
import { mapResumeTemplateSnapshot } from "@/lib/resume-studio/client-mappers";
import { resolveMarginBox } from "@/lib/resume-studio/normalize";
import type { ResumeDocumentRecord, ResumeTemplateCategory, ResumeTemplateRecord } from "@/types/resume-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { mapResumeDocumentSnapshot } from "@/lib/resume-studio/client-mappers";

const categories: Array<ResumeTemplateCategory | "all"> = [
  "all",
  "single_column",
  "two_column",
  "sidebar",
  "compact",
  "executive",
  "modern",
  "academic"
];

export function TemplateGallery({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [customTemplates, setCustomTemplates] = useState<ResumeTemplateRecord[]>([]);
  const [documents, setDocuments] = useState<ResumeDocumentRecord[]>([]);
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState<ResumeTemplateCategory | "all">("all");
  const [atsOnly, setAtsOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [paperFilter, setPaperFilter] = useState<"all" | "A4">("all");
  const [layoutFilter, setLayoutFilter] = useState<"all" | "single" | "two">("all");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, "resumeTemplates"), where("ownerId", "==", ownerId), orderBy("updatedAt", "desc")), (snap) => {
        setCustomTemplates(
          snap.docs.map((entry) => mapResumeTemplateSnapshot(entry.id, entry.data()))
        );
      }),
      onSnapshot(query(collection(db, "resumeDocuments"), where("ownerId", "==", ownerId), orderBy("updatedAt", "desc")), (snap) => {
        setDocuments(
          snap.docs.map((entry) => mapResumeDocumentSnapshot(entry.id, entry.data()))
        );
      })
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [ownerId]);

  const templateUsageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const docItem of documents) {
      map.set(docItem.templateId, (map.get(docItem.templateId) ?? 0) + 1);
    }
    return map;
  }, [documents]);

  const templates = useMemo(() => {
    const all = [...BUILT_IN_RESUME_TEMPLATES, ...customTemplates];

    return all.filter((template) => {
      if (!showArchived && template.archived) return false;
      if (category !== "all" && template.category !== category) return false;
      if (atsOnly && !template.constraints.atsFriendly) return false;
      if (paperFilter !== "all" && template.paper.size !== paperFilter) return false;
      if (layoutFilter === "single" && template.constraints.supportsTwoColumn) return false;
      if (layoutFilter === "two" && !template.constraints.supportsTwoColumn) return false;

      const search = queryText.trim().toLowerCase();
      if (!search) return true;
      return (
        template.name.toLowerCase().includes(search) ||
        template.category.toLowerCase().includes(search) ||
        (template.source || "").toLowerCase().includes(search)
      );
    });
  }, [customTemplates, queryText, category, atsOnly, paperFilter, layoutFilter, showArchived]);

  async function createResumeFromTemplate(templateId: string) {
    try {
      const selectedTemplate = templates.find((item) => item.id === templateId);
      const payload = createDefaultResumeDocument({
        ownerId,
        templateId,
        title: "Untitled Resume"
      });
      const ref = await addDoc(collection(db, "resumeDocuments"), {
        ...payload,
        page: {
          ...payload.page,
          size: "A4",
          margins: selectedTemplate?.paper.defaultMargins ?? payload.page.margins,
          marginBox: resolveMarginBox({
            marginBox: selectedTemplate?.paper.defaultMarginBox,
            margins: selectedTemplate?.paper.defaultMargins ?? payload.page.margins,
            fallback: 22
          })
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      router.push(`/admin/resume-studio/${ref.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create resume from template");
    }
  }

  async function retireTemplate(template: ResumeTemplateRecord) {
    if (template.source === "built_in") {
      setStatus("Built-in templates cannot be archived or deleted.");
      return;
    }

    const usageCount = templateUsageMap.get(template.id) ?? 0;
    try {
      if (usageCount > 0) {
        await updateDoc(doc(db, "resumeTemplates", template.id), {
          archived: true,
          archivedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setStatus(`Template archived (used by ${usageCount} document${usageCount === 1 ? "" : "s"}).`);
        return;
      }

      const confirmed = window.confirm(`Delete template "${template.name}" permanently?`);
      if (!confirmed) return;
      await deleteDoc(doc(db, "resumeTemplates", template.id));
      setStatus("Template deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update template lifecycle");
    }
  }

  async function unarchiveTemplate(template: ResumeTemplateRecord) {
    try {
      await updateDoc(doc(db, "resumeTemplates", template.id), {
        archived: false,
        archivedAt: null,
        updatedAt: serverTimestamp()
      });
      setStatus("Template restored.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to restore template");
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Template Gallery</CardTitle>
              <CardDescription>Built-in and custom templates for Resume Studio.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push("/admin/resume-studio/templates/import")}>
                <Upload className="h-4 w-4" />
                Import from PDF
              </Button>
              <Button onClick={() => router.push("/admin/resume-studio/templates/new")}>
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>
          </div>
          <div className="grid gap-2 lg:grid-cols-5">
            <Input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search templates" />
            <Select value={category} onChange={(event) => setCategory((event.target.value as typeof category) || "all")}>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All categories" : value.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Select value={paperFilter} onChange={(event) => setPaperFilter((event.target.value as typeof paperFilter) || "all")}>
              <option value="all">All paper sizes</option>
              <option value="A4">A4</option>
            </Select>
            <Select value={layoutFilter} onChange={(event) => setLayoutFilter((event.target.value as typeof layoutFilter) || "all")}>
              <option value="all">All layouts</option>
              <option value="single">Single-column</option>
              <option value="two">Two-column</option>
            </Select>
            <label className="inline-flex items-center gap-2 rounded-2xl border border-border/70 px-3 text-sm">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <input type="checkbox" checked={atsOnly} onChange={(event) => setAtsOnly(event.target.checked)} /> ATS-friendly only
            </label>
            <label className="inline-flex items-center gap-2 rounded-2xl border border-border/70 px-3 text-sm">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived
            </label>
          </div>
          {status ? <p className="text-sm text-destructive">{status}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="border-border/70 bg-card/90">
            <CardContent className="space-y-3 pt-4">
              <div
                className="h-40 rounded-xl border border-border/70"
                style={{
                  background: `linear-gradient(150deg, ${template.styleTokens.colors.background}, #eef2ff)`
                }}
              />
              <div>
                <p className="font-semibold">{template.name}</p>
                <p className="text-sm text-muted-foreground">{template.category.replace(/_/g, " ")}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {template.constraints.atsFriendly ? <Badge>ATS Friendly</Badge> : <Badge variant="secondary">Creative</Badge>}
                <Badge variant="outline">{template.paper.size}</Badge>
                <Badge variant="outline">{template.source === "built_in" ? "Built-in" : template.source === "pdf_extracted" ? "PDF Extracted" : "Custom"}</Badge>
                {template.archived ? <Badge variant="secondary">Archived</Badge> : null}
                {template.source !== "built_in" ? (
                  <Badge variant="outline">Used in {templateUsageMap.get(template.id) ?? 0}</Badge>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => router.push(`/admin/resume-studio/templates/${template.id}`)}>
                  Edit
                </Button>
                <Button onClick={() => createResumeFromTemplate(template.id)} disabled={Boolean(template.archived)}>
                  Use this template
                </Button>
                {template.source !== "built_in" ? (
                  template.archived ? (
                    <Button variant="outline" onClick={() => void unarchiveTemplate(template)}>
                      Restore
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => void retireTemplate(template)}>
                      {(templateUsageMap.get(template.id) ?? 0) > 0 ? <Archive className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      {(templateUsageMap.get(template.id) ?? 0) > 0 ? "Archive" : "Delete"}
                    </Button>
                  )
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
