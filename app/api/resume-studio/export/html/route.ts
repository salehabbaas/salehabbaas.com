import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { writeResumeActivity } from "@/lib/firestore/resume-studio";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { exportDocument } from "@/lib/resume-studio/io";
import { assertOwnedResume, requireAdminUser } from "@/lib/resume-studio/server";

export const runtime = "nodejs";

const schema = z.object({
  docId: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(120)
});

function normalizeFileName(input: string) {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9-_\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 90);
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireAdminUser();
  if (sessionResult.unauthorized) return sessionResult.unauthorized;
  const featureBlocked = await ensureResumeStudioFlag("resumeStudioV2Enabled", "Resume Studio v2 is not enabled.");
  if (featureBlocked) return featureBlocked;
  const session = sessionResult.user;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const { doc, forbidden } = await assertOwnedResume(body.docId, session.uid);
    if (forbidden) return forbidden;
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const baseName = normalizeFileName(body.fileName) || "resume";
    const exported = await exportDocument({ format: "html", doc, fidelityMode: "semantic" });
    const html = typeof exported.body === "string" ? exported.body : exported.body.toString("utf-8");

    await adminDb.collection("resumeExports").add({
      docId: doc.id,
      ownerId: session.uid,
      createdAt: new Date(),
      fileName: `${baseName}.html`,
      type: "html",
      deliveredByEmail: false
    });

    await writeResumeActivity({
      ownerId: session.uid,
      entityType: "resumeDocument",
      entityId: doc.id,
      action: "export_html"
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${baseName}.html"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export HTML";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
