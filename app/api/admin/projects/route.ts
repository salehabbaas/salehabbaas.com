import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { getProjectDashboard } from "@/lib/firestore/project-management";
import { adminDb } from "@/lib/firebase/admin";
import { defaultBoardColumns } from "@/types/project-management";

const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional()
});

export async function GET() {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dashboard = await getProjectDashboard(user.uid);
  return NextResponse.json(dashboard);
}

export async function POST(request: Request) {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const context = getAdminRequestContext(request);

  try {
    const body = createProjectSchema.parse(await request.json());
    const now = new Date();

    const projectRef = adminDb.collection("projects").doc();
    const boardRef = adminDb.collection("boards").doc();

    const batch = adminDb.batch();
    batch.set(projectRef, {
      name: body.name,
      description: body.description ?? "",
      status: "active",
      ownerId: user.uid,
      module: "project-management",
      createdAt: now,
      updatedAt: now
    });

    batch.set(boardRef, {
      projectId: projectRef.id,
      name: "Kanban Board",
      columns: defaultBoardColumns,
      createdAt: now,
      updatedAt: now
    });

    await batch.commit();

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "create_project",
        targetType: "project",
        targetId: projectRef.id,
        summary: `Created project ${body.name}`,
        metadata: {
          projectId: projectRef.id,
          boardId: boardRef.id
        }
      },
      user,
      context
    );

    return NextResponse.json({ success: true, projectId: projectRef.id, boardId: boardRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
