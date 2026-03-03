import { NextResponse } from "next/server";
import { z } from "zod";

import { canWriteProject, listProjectMembers } from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getProjectBoard } from "@/lib/firestore/project-management";
import { adminDb } from "@/lib/firebase/admin";

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    status: z.enum(["active", "archived"]).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "No updates provided");

export async function GET(_: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const payload = await getProjectBoard(projectId, user.uid);
  if (!payload.project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const members = await listProjectMembers({
    projectId,
    ownerId: payload.project.ownerId
  });

  return NextResponse.json({
    ...payload,
    actorUid: user.uid,
    members
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId } = await context.params;
  const allowed = await canWriteProject(user.uid, projectId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const projectSnap = await adminDb.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  try {
    const body = updateSchema.parse(await request.json());
    const updates: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.description === "string") updates.description = body.description;
    if (body.status) updates.status = body.status;

    await projectSnap.ref.set(updates, { merge: true });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "update_project",
        targetType: "project",
        targetId: projectId,
        summary: "Updated project details",
        metadata: {
          fields: Object.keys(updates)
        }
      },
      user,
      reqContext
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
