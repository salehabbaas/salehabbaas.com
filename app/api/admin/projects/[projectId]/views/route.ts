import { NextResponse } from "next/server";
import { z } from "zod";

import { canReadProject } from "@/lib/admin/access";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";

const viewSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  filters: z.record(z.unknown())
});

const bodySchema = z.object({
  views: z.array(viewSchema).max(40)
});

export async function GET(_: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await context.params;
  const allowed = await canReadProject(user.uid, projectId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snap = await adminDb.collection("users").doc(user.uid).collection("settings").doc(`projectView-${projectId}`).get();
  const views = Array.isArray(snap.data()?.views) ? snap.data()?.views : [];
  return NextResponse.json({ views });
}

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);
  const { projectId } = await context.params;
  const allowed = await canReadProject(user.uid, projectId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = bodySchema.parse(await request.json());
    const now = new Date();
    await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("settings")
      .doc(`projectView-${projectId}`)
      .set(
        {
          module: "project-management",
          projectId,
          views: body.views,
          updatedAt: now
        },
        { merge: true }
      );

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "saved_views_updated",
        targetType: "project",
        targetId: projectId,
        summary: `Updated saved views (${body.views.length})`,
        metadata: {
          projectId,
          count: body.views.length
        }
      },
      user,
      reqContext
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update saved views";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
