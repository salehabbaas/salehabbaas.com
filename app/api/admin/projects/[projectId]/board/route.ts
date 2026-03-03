import { NextResponse } from "next/server";
import { z } from "zod";

import { canWriteProject } from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";

const boardSchema = z.object({
  boardId: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  columns: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1).max(80),
        order: z.number().int().min(0)
      })
    )
    .min(1)
    .max(12)
});

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  const { projectId } = await context.params;
  const allowed = await canWriteProject(user.uid, projectId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = boardSchema.parse(await request.json());
    const now = new Date();

    const boardRef = body.boardId ? adminDb.collection("boards").doc(body.boardId) : adminDb.collection("boards").doc();
    const existingBoard = await boardRef.get();
    if (existingBoard.exists && String(existingBoard.data()?.projectId ?? "") !== projectId) {
      return NextResponse.json({ error: "Board does not belong to this project" }, { status: 400 });
    }

    await boardRef.set(
      {
        projectId,
        name: body.name,
        columns: body.columns,
        updatedAt: now,
        ...(existingBoard.exists ? {} : { createdAt: now })
      },
      { merge: true }
    );

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "update_board",
        targetType: "board",
        targetId: boardRef.id,
        summary: "Updated board structure",
        metadata: {
          projectId,
          columns: body.columns.length
        }
      },
      user,
      reqContext
    );

    return NextResponse.json({ success: true, boardId: boardRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save board";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
