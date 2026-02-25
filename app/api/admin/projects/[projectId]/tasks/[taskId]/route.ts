import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { priorityRankMap } from "@/types/project-management";
import { adminDb } from "@/lib/firebase/admin";

const updateSchema = z
  .object({
    title: z.string().trim().min(2).max(180).optional(),
    description: z.string().trim().max(5000).optional(),
    priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
    statusColumnId: z.string().trim().min(1).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    labels: z.array(z.string().trim().min(1).max(64)).max(24).optional(),
    assigneeId: z.string().trim().nullable().optional(),
    watchers: z.array(z.string().trim().min(1)).max(30).optional(),
    reminderConfig: z
      .object({
        email24h: z.boolean(),
        email1h: z.boolean(),
        dailyOverdue: z.boolean()
      })
      .optional()
  })
  .refine((value) => Object.keys(value).length > 0, "No updates provided");

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

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string; taskId: string }> }) {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId, taskId } = await context.params;
  const ownership = await assertOwner(projectId, user.uid);
  if ("error" in ownership) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  const taskRef = adminDb.collection("tasks").doc(taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const existing = taskSnap.data() ?? {};
  if (String(existing.projectId ?? "") !== projectId) {
    return NextResponse.json({ error: "Task does not belong to this project" }, { status: 400 });
  }

  try {
    const body = updateSchema.parse(await request.json());
    const now = new Date();

    const updates: Record<string, unknown> = { updatedAt: now };
    const changedFields: string[] = [];

    if (typeof body.title === "string") {
      updates.title = body.title;
      changedFields.push("title");
    }
    if (typeof body.description === "string") {
      updates.description = body.description;
      changedFields.push("description");
    }
    if (body.priority) {
      updates.priority = body.priority;
      updates.priorityRank = priorityRankMap[body.priority];
      changedFields.push("priority", "priorityRank");
    }
    if (typeof body.statusColumnId === "string") {
      updates.statusColumnId = body.statusColumnId;
      updates.lastMovedAt = now;
      changedFields.push("statusColumnId", "lastMovedAt");
    }
    if (body.dueDate !== undefined) {
      updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      changedFields.push("dueDate");
    }
    if (body.labels) {
      updates.labels = body.labels;
      changedFields.push("labels");
    }
    if (body.assigneeId !== undefined) {
      updates.assigneeId = body.assigneeId || null;
      changedFields.push("assigneeId");
    }
    if (body.watchers) {
      updates.watchers = body.watchers;
      changedFields.push("watchers");
    }
    if (body.reminderConfig) {
      updates.reminderConfig = body.reminderConfig;
      changedFields.push("reminderConfig");
    }

    await taskRef.set(updates, { merge: true });

    const dueDateBefore = existing.dueDate && typeof existing.dueDate.toDate === "function" ? existing.dueDate.toDate().toISOString() : "";
    const dueDateAfter = body.dueDate ?? (dueDateBefore || "");

    await adminDb.collection("activity").add({
      projectId,
      taskId,
      actorId: user.uid,
      action: body.statusColumnId ? "task_moved" : body.dueDate !== undefined ? "due_date_changed" : "task_updated",
      from: body.statusColumnId ? String(existing.statusColumnId ?? "") : body.dueDate !== undefined ? dueDateBefore : "",
      to: body.statusColumnId ? body.statusColumnId : body.dueDate !== undefined ? dueDateAfter : "",
      createdAt: now
    });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "task_updated",
        targetType: "task",
        targetId: taskId,
        summary: "Updated task",
        metadata: {
          projectId,
          changedFields,
          dueDateChanged: body.dueDate !== undefined
        }
      },
      user,
      reqContext
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string; taskId: string }> }) {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId, taskId } = await context.params;
  const ownership = await assertOwner(projectId, user.uid);
  if ("error" in ownership) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  const taskRef = adminDb.collection("tasks").doc(taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (String(taskSnap.data()?.projectId ?? "") !== projectId) {
    return NextResponse.json({ error: "Task does not belong to this project" }, { status: 400 });
  }

  const now = new Date();
  await Promise.all([
    taskRef.delete(),
    adminDb.collection("activity").add({
      projectId,
      taskId,
      actorId: user.uid,
      action: "task_deleted",
      from: String(taskSnap.data()?.statusColumnId ?? ""),
      to: "",
      createdAt: now
    })
  ]);

  await writeAdminAuditLog(
    {
      module: "project-management",
      action: "task_deleted",
      targetType: "task",
      targetId: taskId,
      summary: "Deleted task",
      metadata: {
        projectId
      }
    },
    user,
    reqContext
  );

  return NextResponse.json({ success: true });
}
