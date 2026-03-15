import { NextResponse } from "next/server";

import { canReadProject } from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { createStickerFromProjectTask } from "@/lib/goals/server";
import { addProjectTaskStickerSchema } from "@/lib/goals/schemas";

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = addProjectTaskStickerSchema.parse(await request.json());
    const canRead = await canReadProject(user.uid, body.projectId);
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sticker = await createStickerFromProjectTask({
      uid: user.uid,
      projectId: body.projectId,
      taskId: body.taskId,
      dateId: body.dateId,
      status: body.status,
    });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_add_project_task",
        targetType: "goalsSticker",
        targetId: sticker.id,
        summary: "Added project task to goals plan",
        metadata: {
          projectId: body.projectId,
          taskId: body.taskId,
          dateId: body.dateId || "",
        },
      },
      user,
      requestContext,
    );

    return NextResponse.json({
      success: true,
      sticker,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add project task to plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
