import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { reorderGoalStickers } from "@/lib/goals/server";
import { stickersReorderSchema } from "@/lib/goals/schemas";

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = stickersReorderSchema.parse(await request.json());
    await reorderGoalStickers(user.uid, body.updates);

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_reorder_stickers",
        targetType: "goalsBoard",
        targetId: "default",
        summary: "Reordered goals stickers board",
        metadata: {
          count: body.updates.length,
        },
      },
      user,
      requestContext,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reorder stickers";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
