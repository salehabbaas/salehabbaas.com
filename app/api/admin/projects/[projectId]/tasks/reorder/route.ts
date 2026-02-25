import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";

const reorderSchema = z.object({
  updates: z
    .array(
      z.object({
        taskId: z.string().trim().min(1),
        statusColumnId: z.string().trim().min(1),
        orderInColumn: z.number().int().min(0)
      })
    )
    .min(1)
    .max(200),
  movedTaskId: z.string().trim().min(1),
  fromColumnId: z.string().trim().min(1),
  toColumnId: z.string().trim().min(1)
});

async function assertOwner(projectId: string, uid: string) {
  const projectSnap = await adminDb.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) {
    return { error: "Project not found", status: 404 as const };
  }

  const ownerId = String(projectSnap.data()?.ownerId ?? "");
  if (!ownerId || ownerId !== uid) {
    return { error: "Forbidden", status: 403 as const };
  }

  return { ownerId };
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId } = await context.params;
  const ownership = await assertOwner(projectId, user.uid);
  if ("error" in ownership) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  try {
    const body = reorderSchema.parse(await request.json());
    const now = new Date();

    const batch = adminDb.batch();
    for (const row of body.updates) {
      const ref = adminDb.collection("tasks").doc(row.taskId);
      batch.set(
        ref,
        {
          statusColumnId: row.statusColumnId,
          orderInColumn: row.orderInColumn,
          updatedAt: now,
          lastMovedAt: now
        },
        { merge: true }
      );
    }

    const activityRef = adminDb.collection("activity").doc();
    batch.set(activityRef, {
      projectId,
      taskId: body.movedTaskId,
      actorId: user.uid,
      action: "task_moved",
      from: body.fromColumnId,
      to: body.toColumnId,
      createdAt: now
    });

    await batch.commit();

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "task_moved",
        targetType: "task",
        targetId: body.movedTaskId,
        summary: "Reordered task board",
        metadata: {
          projectId,
          movedTaskId: body.movedTaskId,
          fromColumnId: body.fromColumnId,
          toColumnId: body.toColumnId,
          updateCount: body.updates.length
        }
      },
      user,
      reqContext
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reorder tasks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
