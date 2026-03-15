import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { createGoalSticker } from "@/lib/goals/server";
import { goalStickerCreateSchema } from "@/lib/goals/schemas";

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = goalStickerCreateSchema.parse(await request.json());
    const sticker = await createGoalSticker(user.uid, body);

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_create_sticker",
        targetType: "goalsSticker",
        targetId: sticker.id,
        summary: `Created goals sticker ${sticker.title}`,
        metadata: {
          status: sticker.status,
          priority: sticker.priority,
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
    const message = error instanceof Error ? error.message : "Unable to create sticker";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
