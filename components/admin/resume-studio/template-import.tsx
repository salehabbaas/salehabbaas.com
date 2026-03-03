"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes } from "firebase/storage";
import { AlertTriangle, FileUp, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { storage } from "@/lib/firebase/client";

export function TemplateImport({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [notes, setNotes] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function importTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setStatus("Please select a PDF file.");
      return;
    }

    if (!rightsConfirmed) {
      setStatus("You must confirm rights before importing.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const importId = `tpl-import-${Date.now()}`;
      const storagePath = `resume-template-imports/${ownerId}/${importId}.pdf`;

      const uploadRef = ref(storage, storagePath);
      await uploadBytes(uploadRef, file, { contentType: "application/pdf" });

      const response = await fetch("/api/resume-studio/templates/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath,
          templateName: templateName.trim() || file.name.replace(/\.pdf$/i, ""),
          notes: notes.trim()
        })
      });

      const payload = (await response.json()) as { error?: string; templateId?: string; warning?: string };
      if (!response.ok || !payload.templateId) {
        throw new Error(payload.error || "Unable to extract template");
      }

      if (payload.warning) {
        setStatus(payload.warning);
      }

      router.push(`/admin/resume-studio/templates/${payload.templateId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to import template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Template from PDF</CardTitle>
          <CardDescription>Upload a licensed/owned PDF and generate a draft template schema for review.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-warning/40">
        <CardContent className="pt-6 text-sm">
          <p className="inline-flex items-center gap-2 font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            Legal notice
          </p>
          <p className="mt-2 text-muted-foreground">
            Only upload templates you own or are licensed to use. Do not upload proprietary paid templates without rights.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={importTemplate}>
            <Input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name (optional)" />
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Optional extraction notes for AI" />

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
              I confirm I own or am licensed to use this PDF template.
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                <FileUp className="h-4 w-4" />
                {loading ? "Extracting..." : "Upload and Extract"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/resume-studio/templates")}>Back to templates</Button>
            </div>

            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            {!status ? (
              <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Extraction output is a draft and should be refined in the template builder.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
