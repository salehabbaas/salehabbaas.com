import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { buildProjectKeyBase, getProjectDashboard } from "@/lib/firestore/project-management";
import { adminDb } from "@/lib/firebase/admin";
import { defaultBoardColumns } from "@/types/project-management";

const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional()
});

function isProjectIdCollision(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("project_slug_taken") || message.includes("already exists") || message.includes("already_exists");
}

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dashboard = await getProjectDashboard(user.uid);
  return NextResponse.json(dashboard);
}

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const context = getAdminRequestContext(request);

  try {
    const body = createProjectSchema.parse(await request.json());
    const now = new Date();
    const baseProjectId = buildProjectKeyBase(body.name);
    let createdProjectId = "";
    let createdBoardId = "";

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const projectId = attempt === 0 ? baseProjectId : `${baseProjectId}-${attempt + 1}`;
      const projectRef = adminDb.collection("projects").doc(projectId);
      const boardRef = adminDb.collection("boards").doc();
      const counterRef = adminDb.collection("projectCounters").doc(projectId);

      try {
        await adminDb.runTransaction(async (tx) => {
          const projectSnap = await tx.get(projectRef);
          if (projectSnap.exists) {
            throw new Error("PROJECT_SLUG_TAKEN");
          }

          tx.create(projectRef, {
            name: body.name,
            description: body.description ?? "",
            status: "active",
            ownerId: user.uid,
            module: "project-management",
            projectKey: projectId,
            slug: projectId,
            createdAt: now,
            updatedAt: now
          });

          tx.create(boardRef, {
            projectId,
            name: "Kanban Board",
            columns: defaultBoardColumns,
            createdAt: now,
            updatedAt: now
          });

          tx.set(counterRef, {
            projectId,
            projectKey: projectId,
            taskSequence: 0,
            createdAt: now,
            updatedAt: now
          });
        });

        createdProjectId = projectId;
        createdBoardId = boardRef.id;
        break;
      } catch (error) {
        if (isProjectIdCollision(error)) continue;
        throw error;
      }
    }

    if (!createdProjectId || !createdBoardId) {
      return NextResponse.json({ error: "Unable to allocate a unique project id" }, { status: 409 });
    }

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "create_project",
        targetType: "project",
        targetId: createdProjectId,
        summary: `Created project ${body.name}`,
        metadata: {
          projectId: createdProjectId,
          boardId: createdBoardId
        }
      },
      user,
      context
    );

    return NextResponse.json({ success: true, projectId: createdProjectId, boardId: createdBoardId, projectKey: createdProjectId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
