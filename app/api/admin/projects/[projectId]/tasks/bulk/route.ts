import { NextResponse } from "next/server";
import { z } from "zod";

import { assertUsersHaveProjectAccess, canWriteProject } from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import {
  createTaskNotificationContext,
  sendInAppTaskNotification,
  sendTaskEmailNotification
} from "@/lib/project-management/task-notifications";
import { priorityRankMap } from "@/types/project-management";

const bulkSchema = z
  .object({
    taskIds: z.array(z.string().trim().min(1)).min(1).max(200),
    updates: z
      .object({
        statusColumnId: z.string().trim().min(1).optional(),
        assigneeId: z.string().trim().nullable().optional(),
        priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
        labels: z.array(z.string().trim().min(1).max(64)).max(24).optional()
      })
      .refine((value) => Object.keys(value).length > 0, "No updates provided")
  })
  .refine((value) => value.taskIds.length > 0, "No task ids provided");

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId } = await context.params;
  const allowed = await canWriteProject(user.uid, projectId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = bulkSchema.parse(await request.json());
    const now = new Date();
    const projectSnap = await adminDb.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const projectData = projectSnap.data() ?? {};
    const projectName = String(projectData.name ?? "Project");
    const ownerId = String(projectData.ownerId ?? "");

    const refs = body.taskIds.map((taskId) => adminDb.collection("tasks").doc(taskId));
    const docs = refs.length ? await adminDb.getAll(...refs) : [];
    const missing = docs.find((doc) => !doc.exists);
    if (missing) return NextResponse.json({ error: `Task not found: ${missing.id}` }, { status: 404 });

    const badProjectDoc = docs.find((doc) => String(doc.data()?.projectId ?? "") !== projectId);
    if (badProjectDoc) {
      return NextResponse.json({ error: `Task ${badProjectDoc.id} does not belong to this project` }, { status: 400 });
    }

    if (body.updates.assigneeId !== undefined && body.updates.assigneeId) {
      const check = await assertUsersHaveProjectAccess({
        projectId,
        ownerId,
        userIds: [body.updates.assigneeId]
      });
      if (!check.ok) {
        return NextResponse.json({ error: `Invalid assignee: ${check.invalidUserIds.join(", ")}` }, { status: 400 });
      }
    }

    const batch = adminDb.batch();
    const doneRegex = /done|complete|closed/i;
    const taskAlertRows: Array<{
      taskId: string;
      title: string;
      previousAssigneeId: string;
      nextAssigneeId: string;
    }> = [];

    docs.forEach((doc) => {
      const docData = doc.data() ?? {};
      const prevStatus = String(doc.data()?.statusColumnId ?? "");
      const previousAssigneeId = String(docData.assigneeId ?? "");
      const title = String(docData.title ?? "Task");
      const nextAssigneeId =
        body.updates.assigneeId !== undefined ? String(body.updates.assigneeId || "") : previousAssigneeId;
      const payload: Record<string, unknown> = {
        updatedAt: now
      };
      if (body.updates.statusColumnId) {
        payload.statusColumnId = body.updates.statusColumnId;
        payload.lastMovedAt = now;
        const wasDone = doneRegex.test(prevStatus);
        const isDone = doneRegex.test(body.updates.statusColumnId);
        if (!wasDone && isDone) payload.completedAt = now;
        if (wasDone && !isDone) payload.completedAt = null;
      }
      if (body.updates.assigneeId !== undefined) payload.assigneeId = body.updates.assigneeId || null;
      if (body.updates.priority) {
        payload.priority = body.updates.priority;
        payload.priorityRank = priorityRankMap[body.updates.priority];
      }
      if (body.updates.labels) payload.labels = body.updates.labels;

      batch.set(doc.ref, payload, { merge: true });
      batch.set(adminDb.collection("activity").doc(), {
        projectId,
        taskId: doc.id,
        actorId: user.uid,
        action: "task_bulk_updated",
        from: prevStatus,
        to: body.updates.statusColumnId || prevStatus,
        createdAt: now
      });

      taskAlertRows.push({
        taskId: doc.id,
        title,
        previousAssigneeId,
        nextAssigneeId
      });
    });

    await batch.commit();

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "task_bulk_updated",
        targetType: "task",
        targetId: body.taskIds.join(","),
        summary: `Bulk updated ${body.taskIds.length} tasks`,
        metadata: {
          projectId,
          taskCount: body.taskIds.length,
          updates: body.updates
        }
      },
      user,
      reqContext
    );

    const actorName = user.adminAccess.displayName || user.email || user.uid;
    const hasMajorUpdates = Boolean(body.updates.statusColumnId || body.updates.priority || body.updates.labels);
    const notificationContext = await createTaskNotificationContext(user.uid);
    const alertOps: Array<Promise<unknown>> = [];

    taskAlertRows.forEach((row) => {
      if (!row.nextAssigneeId || row.nextAssigneeId === user.uid) return;

      const taskPath = `/admin/projects/${projectId}/tasks/${row.taskId}`;
      const assigneeChanged = row.nextAssigneeId !== row.previousAssigneeId;

      if (assigneeChanged) {
        alertOps.push(
          sendInAppTaskNotification({
            context: notificationContext,
            recipientUid: row.nextAssigneeId,
            dedupeKey: `task-bulk-assigned:${row.taskId}:${row.nextAssigneeId}:${now.getTime()}`,
            sourceType: "task",
            sourceId: row.taskId,
            title: row.previousAssigneeId ? "Task reassigned to you" : "Task assigned to you",
            body: `${actorName} assigned "${row.title}" to you via bulk update.`,
            priority: body.updates.priority === "P1" ? "high" : "medium",
            ctaPath: taskPath,
            metadata: {
              projectId,
              taskId: row.taskId
            }
          })
        );
        alertOps.push(
          sendTaskEmailNotification({
            context: notificationContext,
            recipientUid: row.nextAssigneeId,
            subject: row.previousAssigneeId ? `Task reassigned: ${row.title}` : `Task assigned: ${row.title}`,
            headline: row.previousAssigneeId ? "A task was reassigned to you" : "A task was assigned to you",
            summaryLines: [
              `Project: ${projectName}`,
              `Task: ${row.title}`,
              `Assigned by: ${actorName}`,
              "Updated using bulk action"
            ],
            taskPath,
            trigger: "task_bulk_assigned",
            metadata: {
              projectId,
              taskId: row.taskId,
              actorUid: user.uid
            }
          })
        );
        return;
      }

      if (!hasMajorUpdates) return;

      const summaryLines = [`Project: ${projectName}`, `Task: ${row.title}`];
      if (body.updates.statusColumnId) summaryLines.push(`Status updated to: ${body.updates.statusColumnId}`);
      if (body.updates.priority) summaryLines.push(`Priority updated to: ${body.updates.priority}`);
      if (body.updates.labels) summaryLines.push(`Labels updated (${body.updates.labels.length})`);

      alertOps.push(
        sendInAppTaskNotification({
          context: notificationContext,
          recipientUid: row.nextAssigneeId,
          dedupeKey: `task-bulk-major-update:${row.taskId}:${row.nextAssigneeId}:${now.getTime()}`,
          sourceType: "task",
          sourceId: row.taskId,
          title: "Assigned task updated",
          body: `${actorName} made a major bulk update to "${row.title}".`,
          priority: body.updates.priority === "P1" ? "high" : "medium",
          ctaPath: taskPath,
          metadata: {
            projectId,
            taskId: row.taskId
          }
        })
      );
      alertOps.push(
        sendTaskEmailNotification({
          context: notificationContext,
          recipientUid: row.nextAssigneeId,
          subject: `Task updated: ${row.title}`,
          headline: "A task assigned to you was updated",
          summaryLines,
          taskPath,
          trigger: "task_bulk_major_update",
          metadata: {
            projectId,
            taskId: row.taskId,
            actorUid: user.uid
          }
        })
      );
    });

    if (alertOps.length) {
      await Promise.allSettled(alertOps);
    }

    return NextResponse.json({ success: true, updatedCount: body.taskIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to bulk update tasks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
