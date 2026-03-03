"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onSnapshot, doc } from "firebase/firestore";
import { ArrowLeft, Download, FileText, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase/client";
import { mapResumeDocumentSnapshot } from "@/lib/resume-studio/client-mappers";
import type { ResumeDocumentRecord } from "@/types/resume-studio";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ResumeStudioExport({ docId, actorEmail }: { docId: string; actorEmail: string }) {
  const router = useRouter();
  const [documentRecord, setDocumentRecord] = useState<ResumeDocumentRecord | null>(null);
  const [fileName, setFileName] = useState("resume-export");
  const [email, setEmail] = useState(actorEmail || "");
  const [status, setStatus] = useState("");
  const [loadingAction, setLoadingAction] = useState<"pdf" | "txt" | "email" | "">("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "resumeDocuments", docId), (snap) => {
      if (!snap.exists()) {
        setStatus("Document not found");
        return;
      }

      const mapped = mapResumeDocumentSnapshot(snap.id, snap.data());
      setDocumentRecord(mapped);
      if (!fileName || fileName === "resume-export") {
        setFileName(mapped.title.replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "-").toLowerCase());
      }
    });

    return () => unsub();
  }, [docId, fileName]);

  async function runExport(action: "download_pdf" | "download_txt" | "send_pdf_email") {
    if (!documentRecord) return;

    const mode = action === "download_pdf" ? "pdf" : action === "download_txt" ? "txt" : "email";
    setLoadingAction(mode);
    setStatus("");

    try {
      const endpoint =
        action === "download_txt" ? "/api/resume-studio/export/txt" : "/api/resume-studio/export/pdf";
      const payload =
        action === "download_txt"
          ? {
              docId: documentRecord.id,
              fileName: fileName || documentRecord.title
            }
          : {
              docId: documentRecord.id,
              fileName: fileName || documentRecord.title,
              delivery: action === "send_pdf_email" ? "email" : "download",
              email: action === "send_pdf_email" ? email : undefined
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Export failed");
      }

      if (action === "download_pdf") {
        const blob = await response.blob();
        downloadBlob(blob, `${fileName || "resume"}.pdf`);
        const fallback = response.headers.get("X-Resume-Pdf-Fallback") === "1";
        setStatus(fallback ? "PDF downloaded using fallback renderer (pdf-lib)." : "PDF download started");
      } else if (action === "download_txt") {
        const blob = await response.blob();
        downloadBlob(blob, `${fileName || "resume"}.txt`);
        setStatus("TXT download started");
      } else {
        const payload = (await response.json()) as { fallbackUsed?: boolean };
        setStatus(payload.fallbackUsed ? "PDF emailed using fallback renderer (pdf-lib)." : "PDF sent by email");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Export failed");
    } finally {
      setLoadingAction("");
    }
  }

  if (!documentRecord) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Loading document...</CardDescription>
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
              <CardTitle>Export & Delivery</CardTitle>
              <CardDescription>{documentRecord.title}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => window.open(`/admin/resume-studio/${docId}/print`, "_blank", "noopener,noreferrer")}>
                HTML Preview
              </Button>
              <Button variant="outline" onClick={() => router.push(`/admin/resume-studio/${docId}`)}>
                <ArrowLeft className="h-4 w-4" />
                Back to Editor
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">File Name</label>
              <Input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="resume-export" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Send PDF to Email</label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={() => runExport("download_pdf")} disabled={loadingAction !== ""}>
              <Download className="h-4 w-4" />
              {loadingAction === "pdf" ? "Preparing PDF..." : "Download PDF"}
            </Button>
            <Button variant="outline" onClick={() => runExport("send_pdf_email")} disabled={loadingAction !== ""}>
              <MailCheck className="h-4 w-4" />
              {loadingAction === "email" ? "Sending..." : "Send PDF to Email"}
            </Button>
            <Button variant="outline" onClick={() => runExport("download_txt")} disabled={loadingAction !== ""}>
              <FileText className="h-4 w-4" />
              {loadingAction === "txt" ? "Preparing TXT..." : "Download TXT"}
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/25 p-3 text-sm text-muted-foreground">
            <p>
              PDF is generated only on demand using the HTML print route with your selected template and design settings. TXT exports include section headings and plain text content for ATS-safe submissions.
            </p>
          </div>

          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Notes</CardTitle>
          <CardDescription>Keep this document’s submission context.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea rows={4} placeholder="Optional notes: role applied, date sent, follow-up context..." />
        </CardContent>
      </Card>
    </div>
  );
}
