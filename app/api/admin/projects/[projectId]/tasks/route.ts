import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { buildTaskPayload } from "@/lib/firestore/project-management";
import { adminDb } from "@/lib/firebase/admin";

const createTaskSchema = z.object({
  boardId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).default("P3"),
  statusColumnId: z.string().trim().min(1),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string().trim().min(1).max(64)).max(24).optional(),
  assigneeId: z.string().trim().min(1).optional(),
  watchers: z.array(z.string().trim().min(1)).max(30).optional()
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
    const body = createTaskSchema.parse(await request.json());

    const existing = await adminDb
      .collection("tasks")
      .where("projectId", "==", projectId)
      .where("statusColumnId", "==", body.statusColumnId)
      .orderBy("orderInColumn", "desc")
      .limit(1)
      .get();

    const nextOrder = existing.empty ? 0 : Number(existing.docs[0].data().orderInColumn ?? 0) + 1;
    const taskRef = adminDb.collection("tasks").doc();
    const now = new Date();

    await taskRef.set({
      ...buildTaskPayload({
        projectId,
        boardId: body.boardId,
        title: body.title,
        description: body.description,
        priority: body.priority,
        statusColumnId: body.statusColumnId,
        dueDate: body.dueDate,
        labels: body.labels,
        assigneeId: body.assigneeId,
        watchers: body.watchers,
        orderInColumn: nextOrder
      }),
      createdAt: now,
      updatedAt: now,
      lastMovedAt: now
    });

    await adminDb.collection("activity").add({
      projectId,
      taskId: taskRef.id,
      actorId: user.uid,
      action: "task_created",
      from: "",
      to: body.statusColumnId,
      createdAt: now
    });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "task_created",
        targetType: "task",
        targetId: taskRef.id,
        summary: `Created task ${body.title}`,
        metadata: {
          projectId,
          statusColumnId: body.statusColumnId,
          priority: body.priority
        }
      },
      user,
      reqContext
    );

    return NextResponse.json({ success: true, taskId: taskRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
