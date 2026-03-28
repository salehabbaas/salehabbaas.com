import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { convertImportPayload } from "@/lib/resume-studio/io";
import { requireAdminUser } from "@/lib/resume-studio/server";

export const runtime = "nodejs";

const schema = z.object({
  format: z.enum(["html", "markdown", "docx", "txt"]),
  content: z.string().optional(),
  contentBase64: z.string().optional()
});

export async function POST(request: NextRequest) {
  const sessionResult = await requireAdminUser();
  if (sessionResult.unauthorized) return sessionResult.unauthorized;
  const featureBlocked = await ensureResumeStudioFlag("resumeStudioV2Enabled", "Resume Studio v2 is not enabled.");
  if (featureBlocked) return featureBlocked;

  try {
    const body = schema.parse(await request.json());
    const binary = body.contentBase64 ? Buffer.from(body.contentBase64, "base64") : undefined;
    const payload = await convertImportPayload({
      format: body.format,
      content: binary ?? body.content ?? ""
    });

    return NextResponse.json({
      success: true,
      doc: payload.doc,
      html: payload.html,
      markdown: payload.markdown,
      plainText: payload.plainText
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import structured content";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
