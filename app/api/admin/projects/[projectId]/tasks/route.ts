import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertUsersHaveProjectAccess,
  canWriteProject,
} from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import {
  allocateTaskIdentifier,
  buildTaskPayload,
} from "@/lib/firestore/project-management";
import { adminDb } from "@/lib/firebase/admin";
import {
  createTaskNotificationContext,
  sendInAppTaskNotification,
  sendTaskEmailNotification,
} from "@/lib/project-management/task-notifications";

const createTaskSchema = z.object({
  boardId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).default("P3"),
  statusColumnId: z.string().trim().min(1),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string().trim().min(1).max(64)).max(24).optional(),
  assigneeId: z.string().trim().min(1).optional(),
  watchers: z.array(z.string().trim().min(1)).max(30).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId } = await context.params;
  const canWrite = await canWriteProject(user.uid, projectId);
  if (!canWrite)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const projectSnap = await adminDb.collection("projects").doc(projectId).get();
  if (!projectSnap.exists)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const projectData = projectSnap.data() ?? {};
  const ownerId = String(projectData.ownerId ?? "");
  const projectName = String(projectData.name ?? "Project");

  try {
    const body = createTaskSchema.parse(await request.json());
    const assigneeAndWatchers = [
      body.assigneeId ?? "",
      ...(body.watchers ?? []),
    ].filter(Boolean);
    const accessCheck = await assertUsersHaveProjectAccess({
      projectId,
      ownerId,
      userIds: assigneeAndWatchers,
    });
    if (!accessCheck.ok) {
      return NextResponse.json(
        {
          error: `Invalid assignee/watchers. Missing project access for: ${accessCheck.invalidUserIds.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const taskIdentity = await allocateTaskIdentifier({
      projectId,
      projectName,
      projectKey:
        typeof projectData.projectKey === "string"
          ? projectData.projectKey
          : undefined,
      slug: typeof projectData.slug === "string" ? projectData.slug : undefined,
    });
    const taskRef = adminDb.collection("tasks").doc(taskIdentity.taskId);
    const now = new Date();
    const columnTasksQuery = adminDb
      .collection("tasks")
      .where("projectId", "==", projectId)
      .where("statusColumnId", "==", body.statusColumnId)
      .orderBy("orderInColumn", "desc");

    await adminDb.runTransaction(async (tx) => {
      const columnTasksSnap = await tx.get(columnTasksQuery);
      columnTasksSnap.docs.forEach((doc) => {
        const currentOrder = Number(doc.data().orderInColumn ?? 0);
        tx.set(
          doc.ref,
          {
            orderInColumn: currentOrder + 1,
            updatedAt: now,
            lastMovedAt: now,
          },
          { merge: true },
        );
      });

      tx.set(taskRef, {
        ...buildTaskPayload({
          projectId,
          boardId: body.boardId,
          taskKey: taskIdentity.taskKey,
          taskSequence: taskIdentity.taskSequence,
          title: body.title,
          description: body.description,
          priority: body.priority,
          statusColumnId: body.statusColumnId,
          dueDate: body.dueDate,
          labels: body.labels,
          assigneeId: body.assigneeId,
          watchers: body.watchers,
          orderInColumn: 0,
        }),
        createdAt: now,
        updatedAt: now,
        lastMovedAt: now,
      });
    });

    await adminDb.collection("activity").add({
      projectId,
      taskId: taskRef.id,
      actorId: user.uid,
      action: "task_created",
      from: "",
      to: body.statusColumnId,
      createdAt: now,
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
          priority: body.priority,
          taskKey: taskIdentity.taskKey,
        },
      },
      user,
      reqContext,
    );

    if (body.assigneeId && body.assigneeId !== user.uid) {
      const actorName = user.adminAccess.displayName || user.email || user.uid;
      const taskPath = `/admin/projects/${projectId}/tasks/${taskRef.id}`;
      const notificationContext = await createTaskNotificationContext(user.uid);
      await Promise.allSettled([
        sendInAppTaskNotification({
          context: notificationContext,
          recipientUid: body.assigneeId,
          dedupeKey: `task-created-assigned:${taskRef.id}:${body.assigneeId}:${now.getTime()}`,
          sourceType: "task",
          sourceId: taskRef.id,
          title: "New task assigned to you",
          body: `${actorName} assigned "${body.title}" to you.`,
          priority: body.priority === "P1" ? "high" : "medium",
          ctaPath: taskPath,
          metadata: {
            projectId,
            taskId: taskRef.id,
          },
        }),
        sendTaskEmailNotification({
          context: notificationContext,
          recipientUid: body.assigneeId,
          subject: `New task assigned: ${body.title}`,
          headline: "A new task was assigned to you",
          summaryLines: [
            `Project: ${projectName}`,
            `Task: ${body.title}`,
            `Assigned by: ${actorName}`,
          ],
          taskPath,
          trigger: "task_assigned",
          metadata: {
            projectId,
            taskId: taskRef.id,
            actorUid: user.uid,
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      taskId: taskRef.id,
      taskKey: taskIdentity.taskKey,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
