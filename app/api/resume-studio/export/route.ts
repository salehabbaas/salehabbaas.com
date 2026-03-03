import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { getConfiguredEmailAdapter } from "@/lib/email/service";
import { renderConfiguredEmailTemplate } from "@/lib/email/templates";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { resumeToText } from "@/lib/resume-studio/pdf";
import { renderResumePdfOnDemand } from "@/lib/resume-studio/export";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { assertOwnedResume, requireAdminUser } from "@/lib/resume-studio/server";
import { writeResumeActivity } from "@/lib/firestore/resume-studio";

export const runtime = "nodejs";

const exportSchema = z.object({
  docId: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(120),
  action: z.enum(["download_pdf", "download_txt", "send_pdf_email"]),
  email: z.string().email().optional()
});

function normalizeFileName(input: string) {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9-_\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 90);
}

async function saveExportRecord(input: {
  ownerId: string;
  docId: string;
  fileName: string;
  type: "pdf" | "txt";
  storagePath?: string;
  deliveredByEmail?: boolean;
}) {
  const exportRef = adminDb.collection("resumeExports").doc();
  await exportRef.set({
    docId: input.docId,
    ownerId: input.ownerId,
    createdAt: new Date(),
    fileName: input.fileName,
    type: input.type,
    storagePath: input.storagePath ?? "",
    deliveredByEmail: Boolean(input.deliveredByEmail)
  });
  return exportRef.id;
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireAdminUser();
  if (sessionResult.unauthorized) return sessionResult.unauthorized;
  const featureBlocked = await ensureResumeStudioFlag("resumeStudioV2Enabled", "Resume Studio v2 is not enabled.");
  if (featureBlocked) return featureBlocked;
  const session = sessionResult.user;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = exportSchema.parse(await request.json());
    const { doc, forbidden } = await assertOwnedResume(body.docId, session.uid);
    if (forbidden) return forbidden;
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (doc.page.size !== "A4") {
      return NextResponse.json({ error: "Only A4 export is supported in this version." }, { status: 400 });
    }

    const baseName = normalizeFileName(body.fileName) || "resume";

    if (body.action === "download_txt") {
      const text = resumeToText(doc);
      await saveExportRecord({
        ownerId: session.uid,
        docId: doc.id,
        fileName: `${baseName}.txt`,
        type: "txt"
      });

      await writeResumeActivity({
        ownerId: session.uid,
        entityType: "resumeDocument",
        entityId: doc.id,
        action: "export_txt"
      });

      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"${baseName}.txt\"`
        }
      });
    }

    const rendered = await renderResumePdfOnDemand({ request, doc });
    const pdfBuffer = rendered.buffer;
    const exportId = adminDb.collection("resumeExports").doc().id;
    const storagePath = `exports/${session.uid}/${doc.id}/${exportId}.pdf`;

    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);
    await file.save(pdfBuffer, {
      contentType: "application/pdf",
      resumable: false,
      metadata: {
        cacheControl: "private, max-age=0, no-store"
      }
    });

    if (body.action === "send_pdf_email") {
      const targetEmail = body.email || session.email;
      if (!targetEmail) {
        return NextResponse.json({ error: "Target email is required." }, { status: 400 });
      }

      const adapter = await getConfiguredEmailAdapter();
      const renderedTemplate = await renderConfiguredEmailTemplate("resumeExport", {
        moduleName: "Resume Studio",
        primaryActionLabel: "Open Resume",
        primaryActionUrl: `/admin/resume-studio/${encodeURIComponent(doc.id)}`,
        quickLinks: [
          { label: "Resume Studio", url: "/admin/resume-studio" },
          { label: "Template Builder", url: "/admin/resume-studio/templates" },
          { label: "System Inbox", url: "/admin/system-inbox" }
        ],
        documentTitle: doc.title
      });
      await adapter.send({
        to: targetEmail,
        subject: renderedTemplate.subject,
        html: renderedTemplate.html,
        text: renderedTemplate.text,
        activity: {
          module: "Resume Studio",
          templateId: "resumeExport",
          trigger: "resume_export_email"
        },
        attachments: [
          {
            filename: `${baseName}.pdf`,
            contentType: "application/pdf",
            contentBase64: pdfBuffer.toString("base64")
          }
        ]
      });

      await adminDb.collection("resumeExports").doc(exportId).set({
        docId: doc.id,
        ownerId: session.uid,
        createdAt: new Date(),
        fileName: `${baseName}.pdf`,
        type: "pdf",
        storagePath,
        deliveredByEmail: true
      });

      await writeResumeActivity({
        ownerId: session.uid,
        entityType: "resumeDocument",
        entityId: doc.id,
        action: "export_email",
        to: targetEmail
      });

      await writeAdminAuditLog(
        {
          module: "resume-studio",
          action: "export_send_email",
          targetType: "resumeDocument",
          targetId: doc.id,
          summary: `Sent resume PDF by email for ${doc.title}`,
          metadata: {
            targetEmail,
            storagePath,
            rendererUsed: rendered.rendererUsed,
            fallbackUsed: rendered.fallbackUsed
          }
        },
        session,
        requestContext
      );

      return NextResponse.json({
        success: true,
        storagePath,
        exportId,
        rendererUsed: rendered.rendererUsed,
        fallbackUsed: rendered.fallbackUsed
      });
    }

    await adminDb.collection("resumeExports").doc(exportId).set({
      docId: doc.id,
      ownerId: session.uid,
      createdAt: new Date(),
      fileName: `${baseName}.pdf`,
      type: "pdf",
      storagePath,
      deliveredByEmail: false
    });

    await writeResumeActivity({
      ownerId: session.uid,
      entityType: "resumeDocument",
      entityId: doc.id,
      action: "export_pdf"
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${baseName}.pdf\"`,
        "X-Resume-Pdf-Renderer": rendered.rendererUsed,
        "X-Resume-Pdf-Fallback": rendered.fallbackUsed ? "1" : "0"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export document";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
