import { NextResponse } from "next/server";
import { z } from "zod";

import { assertUsersHaveProjectAccess, canWriteProject } from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { extractCommentMentionUids } from "@/lib/project-management/comment-mentions";
import {
  createTaskNotificationContext,
  sendInAppTaskNotification,
  sendTaskEmailNotification
} from "@/lib/project-management/task-notifications";
import { priorityLabelMap, priorityRankMap } from "@/types/project-management";

const subtaskSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(180),
  completed: z.boolean(),
  assigneeId: z.string().trim().max(120).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).optional()
});

const taskLinkSchema = z.object({
  id: z.string().trim().min(1).max(80),
  relationType: z.enum(["blocks", "blockedBy", "related", "duplicate", "duplicatedBy", "blocked_by", "related_to", "duplicated_by"]),
  targetTaskId: z.string().trim().min(1).max(120),
  createdBy: z.string().trim().min(1).max(120).optional()
});

const updateSchema = z
  .object({
    title: z.string().trim().min(2).max(180).optional(),
    description: z.string().trim().max(5000).optional(),
    priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
    statusColumnId: z.string().trim().min(1).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    startDate: z.string().datetime().nullable().optional(),
    labels: z.array(z.string().trim().min(1).max(64)).max(24).optional(),
    category: z.string().trim().max(120).nullable().optional(),
    assigneeId: z.string().trim().nullable().optional(),
    watchers: z.array(z.string().trim().min(1)).max(30).optional(),
    subtasks: z.array(subtaskSchema).max(120).optional(),
    links: z.array(taskLinkSchema).max(120).optional(),
    addLink: z
      .object({
        relationType: z.enum(["blocks", "blockedBy", "related", "duplicate", "duplicatedBy", "blocked_by", "related_to", "duplicated_by"]),
        targetTaskId: z.string().trim().min(1).max(120)
      })
      .optional(),
    removeLinkId: z.string().trim().min(1).max(80).optional(),
    addComment: z
      .union([
        z.string().trim().min(1).max(2000),
        z.object({
          body: z.string().trim().min(1).max(2000),
          mentionUids: z.array(z.string().trim().min(1).max(160)).max(30).optional()
        })
      ])
      .optional(),
    deleteCommentId: z.string().trim().min(1).max(120).optional(),
    reminderConfig: z
      .object({
        email24h: z.boolean(),
        email1h: z.boolean(),
        dailyOverdue: z.boolean()
      })
      .optional()
  })
  .refine((value) => Object.keys(value).length > 0, "No updates provided");

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRelationType(value: string) {
  if (value === "blocked_by") return "blockedBy";
  if (value === "related_to") return "related";
  if (value === "duplicated_by") return "duplicatedBy";
  if (value === "blocks" || value === "blockedBy" || value === "related" || value === "duplicate" || value === "duplicatedBy") {
    return value;
  }
  return "related";
}

function toIsoString(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return undefined;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateLabel(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function mapTaskForResponse(taskId: string, data: Record<string, unknown>) {
  const taskSequence = typeof data.taskSequence === "number" && Number.isFinite(data.taskSequence) ? Number(data.taskSequence) : undefined;
  const taskKey =
    typeof data.taskKey === "string" && data.taskKey.trim()
      ? data.taskKey
      : taskSequence && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(data.projectId ?? ""))
        ? `${String(data.projectId)}#${taskSequence}`
        : undefined;
  return {
    id: taskId,
    taskKey,
    taskSequence,
    projectId: String(data.projectId ?? ""),
    boardId: String(data.boardId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    priority: data.priority,
    priorityRank: Number(data.priorityRank ?? 3),
    statusColumnId: String(data.statusColumnId ?? ""),
    dueDate: toIsoString(data.dueDate),
    startDate: toIsoString(data.startDate),
    labels: Array.isArray(data.labels) ? data.labels.filter((item): item is string => typeof item === "string") : [],
    assigneeId: typeof data.assigneeId === "string" ? data.assigneeId : undefined,
    watchers: Array.isArray(data.watchers) ? data.watchers.filter((item): item is string => typeof item === "string") : [],
    subtasks: Array.isArray(data.subtasks) ? data.subtasks : [],
    comments: Array.isArray(data.comments)
      ? data.comments.map((entry) => {
          const row = (entry ?? {}) as Record<string, unknown>;
          return {
            ...row,
            mentionUids: normalizeStringArray(row.mentionUids)
          };
        })
      : [],
    links: Array.isArray(data.links) ? data.links : [],
    completedAt: toIsoString(data.completedAt),
    category: typeof data.category === "string" ? data.category : undefined,
    orderInColumn: Number(data.orderInColumn ?? 0),
    reminderConfig: {
      email24h: Boolean((data.reminderConfig as Record<string, unknown> | undefined)?.email24h ?? true),
      email1h: Boolean((data.reminderConfig as Record<string, unknown> | undefined)?.email1h ?? true),
      dailyOverdue: Boolean((data.reminderConfig as Record<string, unknown> | undefined)?.dailyOverdue ?? true)
    },
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    lastMovedAt: toIsoString(data.lastMovedAt)
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string; taskId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId, taskId } = await context.params;
  const canWrite = await canWriteProject(user.uid, projectId);
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const projectSnap = await adminDb.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const projectData = projectSnap.data() ?? {};
  const ownerId = String(projectData.ownerId ?? "");
  const projectName = String(projectData.name ?? "Project");

  const taskRef = adminDb.collection("tasks").doc(taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const existing = taskSnap.data() ?? {};
  const existingAssigneeId = typeof existing.assigneeId === "string" ? existing.assigneeId : "";
  const existingStatusColumnId = String(existing.statusColumnId ?? "");
  const existingPriority = String(existing.priority ?? "");
  const existingDueDateIso =
    existing.dueDate && typeof (existing.dueDate as { toDate?: () => Date }).toDate === "function"
      ? (existing.dueDate as { toDate: () => Date }).toDate().toISOString()
      : "";
  if (String(existing.projectId ?? "") !== projectId) {
    return NextResponse.json({ error: "Task does not belong to this project" }, { status: 400 });
  }

  try {
    const body = updateSchema.parse(await request.json());
    const now = new Date();
    const addCommentBody =
      typeof body.addComment === "string"
        ? body.addComment.trim()
        : typeof body.addComment === "object" && body.addComment
          ? body.addComment.body.trim()
          : "";
    const commentMentionUids = Array.from(
      new Set([
        ...(typeof body.addComment === "object" && body.addComment && Array.isArray(body.addComment.mentionUids)
          ? body.addComment.mentionUids
          : []),
        ...extractCommentMentionUids(addCommentBody)
      ])
    ).filter((item): item is string => Boolean(item && item.trim()) && item !== user.uid);

    const assigneeAndWatchers = [body.assigneeId ?? "", ...(body.watchers ?? []), ...commentMentionUids].filter(
      (item): item is string => Boolean(item)
    );
    if (assigneeAndWatchers.length) {
      const accessCheck = await assertUsersHaveProjectAccess({
        projectId,
        ownerId,
        userIds: assigneeAndWatchers
      });
      if (!accessCheck.ok) {
        return NextResponse.json(
          {
            error: `Invalid assignee/watchers. Missing project access for: ${accessCheck.invalidUserIds.join(", ")}`
          },
          { status: 400 }
        );
      }
    }

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
      const doneBefore = /done|complete|closed/i.test(String(existing.statusColumnId ?? ""));
      const doneAfter = /done|complete|closed/i.test(body.statusColumnId);
      if (!doneBefore && doneAfter) {
        updates.completedAt = now;
        changedFields.push("completedAt");
      }
      if (doneBefore && !doneAfter) {
        updates.completedAt = null;
        changedFields.push("completedAt");
      }
    }
    if (body.dueDate !== undefined) {
      updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      changedFields.push("dueDate");
    }
    if (body.startDate !== undefined) {
      updates.startDate = body.startDate ? new Date(body.startDate) : null;
      changedFields.push("startDate");
    }
    if (body.labels) {
      updates.labels = body.labels;
      changedFields.push("labels");
    }
    if (body.category !== undefined) {
      updates.category = body.category || null;
      changedFields.push("category");
    }
    if (body.assigneeId !== undefined) {
      updates.assigneeId = body.assigneeId || null;
      changedFields.push("assigneeId");
    }
    if (body.watchers) {
      updates.watchers = body.watchers;
      changedFields.push("watchers");
    }
    if (body.subtasks) {
      const existingSubtasks = Array.isArray(existing.subtasks) ? (existing.subtasks as Array<Record<string, unknown>>) : [];
      const existingById = new Map(
        existingSubtasks
          .map((item) => ({ id: String(item.id ?? ""), createdAt: item.createdAt, completedAt: item.completedAt }))
          .filter((item) => item.id)
          .map((item) => [item.id, item] as const)
      );

      updates.subtasks = body.subtasks.map((subtask) => {
        const current = existingById.get(subtask.id);
        const wasCompleted = current ? current.completedAt != null : false;
        const nextCompletedAt = subtask.completed
          ? wasCompleted
            ? current?.completedAt ?? now
            : now
          : null;

        return {
          id: subtask.id,
          title: subtask.title,
          completed: subtask.completed,
          assigneeId: subtask.assigneeId || null,
          status: subtask.status || (subtask.completed ? "done" : "todo"),
          priority: subtask.priority || "P3",
          createdAt: current?.createdAt ?? now,
          completedAt: nextCompletedAt
        };
      });
      changedFields.push("subtasks");
    }
    if (body.links) {
      updates.links = body.links.map((link) => ({
        ...link,
        relationType: normalizeRelationType(link.relationType),
        createdBy: link.createdBy || user.uid,
        createdAt: now
      }));
      changedFields.push("links");
    }
    if (body.addLink) {
      const existingLinks = Array.isArray(existing.links) ? (existing.links as Array<Record<string, unknown>>) : [];
      updates.links = [
        ...existingLinks,
        {
          id: uid(),
          relationType: normalizeRelationType(body.addLink.relationType),
          targetTaskId: body.addLink.targetTaskId,
          createdBy: user.uid,
          createdAt: now
        }
      ];
      changedFields.push("links");
    }
    if (typeof body.removeLinkId === "string" && body.removeLinkId.trim()) {
      const existingLinks = Array.isArray(existing.links) ? (existing.links as Array<Record<string, unknown>>) : [];
      updates.links = existingLinks.filter((row) => String(row.id ?? "") !== body.removeLinkId);
      changedFields.push("links");
    }
    if (addCommentBody) {
      const existingComments = Array.isArray(existing.comments) ? (existing.comments as Array<Record<string, unknown>>) : [];
      updates.comments = [
        ...existingComments,
        {
          id: uid(),
          authorId: user.uid,
          authorName: user.adminAccess.displayName || user.email || user.uid,
          body: addCommentBody,
          mentionUids: commentMentionUids,
          createdAt: now,
          updatedAt: now
        }
      ];
      changedFields.push("comments");
    }
    if (typeof body.deleteCommentId === "string" && body.deleteCommentId.trim()) {
      const existingComments = Array.isArray(existing.comments) ? (existing.comments as Array<Record<string, unknown>>) : [];
      updates.comments = existingComments.filter((row) => String(row.id ?? "") !== body.deleteCommentId);
      changedFields.push("comments");
    }
    if (body.reminderConfig) {
      updates.reminderConfig = body.reminderConfig;
      changedFields.push("reminderConfig");
    }

    await taskRef.set(updates, { merge: true });

    const dueDateBefore = existingDueDateIso;
    const dueDateAfter = body.dueDate ?? (dueDateBefore || "");

    const activityAction =
      body.addLink
        ? "task_link_added"
        : body.removeLinkId
          ? "task_link_removed"
          : body.links
            ? "task_links_updated"
            :
      addCommentBody
        ? "comment_added"
        : typeof body.deleteCommentId === "string"
          ? "comment_deleted"
          : body.subtasks
            ? "subtasks_updated"
            : body.statusColumnId
              ? "task_moved"
              : body.priority
                ? "priority_changed"
                : body.assigneeId !== undefined
                  ? "assignee_changed"
                  : body.labels
                    ? "labels_changed"
                    : body.startDate !== undefined
                      ? "start_date_changed"
              : body.dueDate !== undefined
                ? "due_date_changed"
                : "task_updated";

    await adminDb.collection("activity").add({
      projectId,
      taskId,
      actorId: user.uid,
      action: activityAction,
      from: body.statusColumnId
        ? String(existing.statusColumnId ?? "")
        : body.priority
          ? String(existing.priority ?? "")
          : body.assigneeId !== undefined
            ? String(existing.assigneeId ?? "")
            : body.labels
              ? String(Array.isArray(existing.labels) ? existing.labels.join(", ") : "")
              : body.startDate !== undefined
                ? String(existing.startDate && typeof existing.startDate.toDate === "function" ? existing.startDate.toDate().toISOString() : "")
        : body.dueDate !== undefined
          ? dueDateBefore
            : body.addLink
              ? ""
              : "",
      to: body.statusColumnId
        ? body.statusColumnId
        : body.priority
          ? body.priority
          : body.assigneeId !== undefined
            ? body.assigneeId || ""
            : body.labels
              ? body.labels.join(", ")
              : body.startDate !== undefined
                ? body.startDate ?? ""
        : body.dueDate !== undefined
          ? dueDateAfter
            : body.addLink
              ? `${normalizeRelationType(body.addLink.relationType)}:${body.addLink.targetTaskId}`
              : "",
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

    const actorName = user.adminAccess.displayName || user.email || user.uid;
    const taskTitleAfter = typeof body.title === "string" ? body.title : String(existing.title ?? "Task");
    const taskPath = `/admin/projects/${projectId}/tasks/${taskId}`;
    const currentAssigneeId = body.assigneeId !== undefined ? body.assigneeId || "" : existingAssigneeId;
    const assigneeChanged = body.assigneeId !== undefined && currentAssigneeId !== existingAssigneeId;
    const hasMajorUpdates =
      typeof body.title === "string" ||
      typeof body.description === "string" ||
      typeof body.statusColumnId === "string" ||
      Boolean(body.priority) ||
      body.dueDate !== undefined ||
      body.startDate !== undefined ||
      body.labels !== undefined ||
      body.category !== undefined;

    const majorSummary: string[] = [`Project: ${projectName}`, `Task: ${taskTitleAfter}`];
    if (body.statusColumnId) {
      majorSummary.push(`Status: ${existingStatusColumnId || "Unknown"} -> ${body.statusColumnId}`);
    }
    if (body.priority) {
      const oldPriority =
        existingPriority in priorityLabelMap
          ? priorityLabelMap[existingPriority as keyof typeof priorityLabelMap]
          : existingPriority || "Unknown";
      majorSummary.push(`Priority: ${oldPriority} -> ${priorityLabelMap[body.priority]}`);
    }
    if (body.dueDate !== undefined) {
      majorSummary.push(`Due date: ${formatDateLabel(dueDateBefore)} -> ${formatDateLabel(body.dueDate ?? "")}`);
    }
    if (body.labels) {
      majorSummary.push(`Labels updated (${body.labels.length})`);
    }
    if (typeof body.description === "string") {
      majorSummary.push("Description updated");
    }
    if (typeof body.title === "string") {
      majorSummary.push("Title updated");
    }

    const notificationContext = await createTaskNotificationContext(user.uid);
    const alertOps: Array<Promise<unknown>> = [];

    if (assigneeChanged && currentAssigneeId && currentAssigneeId !== user.uid) {
      const assignmentSummary = [
        `Project: ${projectName}`,
        `Task: ${taskTitleAfter}`,
        existingAssigneeId ? `Assigned by: ${actorName} (reassigned)` : `Assigned by: ${actorName}`
      ];
      alertOps.push(
        sendInAppTaskNotification({
          context: notificationContext,
          recipientUid: currentAssigneeId,
          dedupeKey: `task-assigned:${taskId}:${currentAssigneeId}:${now.getTime()}`,
          sourceType: "task",
          sourceId: taskId,
          title: existingAssigneeId ? "Task reassigned to you" : "New task assigned to you",
          body: `${actorName} assigned "${taskTitleAfter}" to you.`,
          priority: body.priority ? (body.priority === "P1" ? "high" : "medium") : "medium",
          ctaPath: taskPath,
          metadata: {
            projectId,
            taskId
          }
        })
      );
      alertOps.push(
        sendTaskEmailNotification({
          context: notificationContext,
          recipientUid: currentAssigneeId,
          subject: existingAssigneeId ? `Task reassigned: ${taskTitleAfter}` : `New task assigned: ${taskTitleAfter}`,
          headline: existingAssigneeId ? "A task was reassigned to you" : "A new task was assigned to you",
          summaryLines: assignmentSummary,
          taskPath,
          trigger: existingAssigneeId ? "task_reassigned" : "task_assigned",
          metadata: {
            projectId,
            taskId,
            actorUid: user.uid
          }
        })
      );
    }

    if (!assigneeChanged && currentAssigneeId && currentAssigneeId !== user.uid && hasMajorUpdates) {
      alertOps.push(
        sendInAppTaskNotification({
          context: notificationContext,
          recipientUid: currentAssigneeId,
          dedupeKey: `task-major-update:${taskId}:${currentAssigneeId}:${now.getTime()}`,
          sourceType: "task",
          sourceId: taskId,
          title: "Assigned task updated",
          body: `${actorName} made a major update to "${taskTitleAfter}".`,
          priority: body.priority === "P1" ? "high" : "medium",
          ctaPath: taskPath,
          metadata: {
            projectId,
            taskId
          }
        })
      );
      alertOps.push(
        sendTaskEmailNotification({
          context: notificationContext,
          recipientUid: currentAssigneeId,
          subject: `Task updated: ${taskTitleAfter}`,
          headline: "A task assigned to you was updated",
          summaryLines: majorSummary.slice(0, 6),
          taskPath,
          trigger: "task_major_update",
          metadata: {
            projectId,
            taskId,
            actorUid: user.uid
          }
        })
      );
    }

    if (addCommentBody && commentMentionUids.length) {
      commentMentionUids.forEach((mentionUid) => {
        if (!mentionUid || mentionUid === user.uid) return;
        alertOps.push(
          sendInAppTaskNotification({
            context: notificationContext,
            recipientUid: mentionUid,
            dedupeKey: `task-comment-mention:${taskId}:${mentionUid}:${now.getTime()}`,
            sourceType: "task_comment",
            sourceId: taskId,
            title: "You were mentioned in a comment",
            body: `${actorName} mentioned you on "${taskTitleAfter}".`,
            priority: "medium",
            ctaPath: taskPath,
            metadata: {
              projectId,
              taskId
            }
          })
        );
      });
    }

    if (alertOps.length) {
      await Promise.allSettled(alertOps);
    }

    const updatedSnap = await taskRef.get();
    const updatedData = (updatedSnap.data() ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      task: mapTaskForResponse(taskId, updatedData)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string; taskId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId, taskId } = await context.params;
  const canWrite = await canWriteProject(user.uid, projectId);
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
