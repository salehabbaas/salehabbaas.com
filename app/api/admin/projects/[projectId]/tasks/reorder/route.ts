import { NextResponse } from "next/server";
import { z } from "zod";

import { canWriteProject } from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import {
  createTaskNotificationContext,
  sendInAppTaskNotification,
  sendTaskEmailNotification
} from "@/lib/project-management/task-notifications";

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

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId } = await context.params;
  const allowed = await canWriteProject(user.uid, projectId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = reorderSchema.parse(await request.json());
    const now = new Date();
    const projectSnap = await adminDb.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const projectName = String(projectSnap.data()?.name ?? "Project");
    const taskIds = [...new Set(body.updates.map((row) => row.taskId).concat(body.movedTaskId))];
    const refs = taskIds.map((taskId) => adminDb.collection("tasks").doc(taskId));
    const docs = refs.length ? await adminDb.getAll(...refs) : [];
    const missingTaskId = docs.find((doc) => !doc.exists)?.id ?? "";
    if (missingTaskId) {
      return NextResponse.json({ error: `Task not found: ${missingTaskId}` }, { status: 404 });
    }

    const invalidTask = docs.find((doc) => String(doc.data()?.projectId ?? "") !== projectId);
    if (invalidTask) {
      return NextResponse.json({ error: `Task ${invalidTask.id} does not belong to this project` }, { status: 400 });
    }

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

    const movedTaskDoc = docs.find((doc) => doc.id === body.movedTaskId);
    const movedTaskData = (movedTaskDoc?.data() ?? {}) as Record<string, unknown>;
    const movedTaskAssigneeId = typeof movedTaskData.assigneeId === "string" ? movedTaskData.assigneeId : "";
    const movedTaskTitle = String(movedTaskData.title ?? "Task");

    if (movedTaskAssigneeId && movedTaskAssigneeId !== user.uid) {
      const actorName = user.adminAccess.displayName || user.email || user.uid;
      const taskPath = `/admin/projects/${projectId}/tasks/${body.movedTaskId}`;
      const notificationContext = await createTaskNotificationContext(user.uid);
      await Promise.allSettled([
        sendInAppTaskNotification({
          context: notificationContext,
          recipientUid: movedTaskAssigneeId,
          dedupeKey: `task-moved:${body.movedTaskId}:${movedTaskAssigneeId}:${now.getTime()}`,
          sourceType: "task",
          sourceId: body.movedTaskId,
          title: "Assigned task moved",
          body: `${actorName} moved "${movedTaskTitle}" from ${body.fromColumnId} to ${body.toColumnId}.`,
          priority: "medium",
          ctaPath: taskPath,
          metadata: {
            projectId,
            taskId: body.movedTaskId
          }
        }),
        sendTaskEmailNotification({
          context: notificationContext,
          recipientUid: movedTaskAssigneeId,
          subject: `Task moved: ${movedTaskTitle}`,
          headline: "A task assigned to you was moved",
          summaryLines: [
            `Project: ${projectName}`,
            `Task: ${movedTaskTitle}`,
            `Moved by: ${actorName}`,
            `From: ${body.fromColumnId}`,
            `To: ${body.toColumnId}`
          ],
          taskPath,
          trigger: "task_moved",
          metadata: {
            projectId,
            taskId: body.movedTaskId,
            actorUid: user.uid
          }
        })
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reorder tasks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
