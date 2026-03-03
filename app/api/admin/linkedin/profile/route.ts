import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { readStudioConfig } from "@/lib/linkedin-studio/firestore";
import { studioConfigSchema } from "@/lib/linkedin-studio/validation";

export const runtime = "nodejs";

export async function GET() {
  const session = await verifyAdminRequest({ requiredModule: "linkedin" });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await readStudioConfig();
  return NextResponse.json({ config });
}

export async function POST(request: Request) {
  const session = await verifyAdminRequest({ requiredModule: "linkedin" });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestContext = getAdminRequestContext(request);

  try {
    const raw = await request.json();
    const payload = studioConfigSchema.parse(raw);

    const ref = adminDb.collection("linkedinStudioProfiles").doc("default");
    const current = await ref.get();
    const now = new Date();

    await ref.set(
      {
        ...payload,
        createdAt: current.data()?.createdAt ?? now,
        updatedAt: now
      },
      { merge: true }
    );

    await writeAdminAuditLog(
      {
        module: "linkedin-studio",
        action: "profile_update",
        targetType: "linkedinStudioProfile",
        targetId: "default",
        summary: "Updated LinkedIn Studio profile and targeting settings",
        metadata: {
          companies: payload.targeting.companies.length,
          goals: payload.profile.goals.length,
          cadenceDays: payload.settings.cadenceDaysOfWeek
        }
      },
      session,
      requestContext
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
