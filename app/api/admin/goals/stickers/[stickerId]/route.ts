import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { deleteGoalSticker, updateGoalSticker } from "@/lib/goals/server";
import { goalStickerUpdateSchema } from "@/lib/goals/schemas";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ stickerId: string }> },
) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);
  const { stickerId } = await context.params;

  try {
    const body = goalStickerUpdateSchema.parse(await request.json());
    const sticker = await updateGoalSticker(user.uid, stickerId, body);

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_update_sticker",
        targetType: "goalsSticker",
        targetId: stickerId,
        summary: `Updated goals sticker ${sticker.title}`,
        metadata: {
          status: sticker.status,
          completedAt: sticker.completedAt || "",
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
    const message = error instanceof Error ? error.message : "Unable to update sticker";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ stickerId: string }> },
) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);
  const { stickerId } = await context.params;

  try {
    await deleteGoalSticker(user.uid, stickerId);

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_delete_sticker",
        targetType: "goalsSticker",
        targetId: stickerId,
        summary: `Deleted goals sticker ${stickerId}`,
        metadata: {
          stickerId,
        },
      },
      user,
      requestContext,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete sticker";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
