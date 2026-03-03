import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { writeResumeActivity } from "@/lib/firestore/resume-studio";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { resumeToText } from "@/lib/resume-studio/pdf";
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
    if (doc.page.size !== "A4") {
      return NextResponse.json({ error: "Only A4 export is supported in this version." }, { status: 400 });
    }

    const baseName = normalizeFileName(body.fileName) || "resume";
    const text = resumeToText(doc);

    await adminDb.collection("resumeExports").add({
      docId: doc.id,
      ownerId: session.uid,
      createdAt: new Date(),
      fileName: `${baseName}.txt`,
      type: "txt",
      deliveredByEmail: false
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export TXT";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
