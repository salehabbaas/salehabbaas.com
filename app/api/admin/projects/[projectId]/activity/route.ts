import { NextResponse } from "next/server";

import { canReadProject } from "@/lib/admin/access";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getTaskActivity } from "@/lib/firestore/project-management";

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const allowed = await canReadProject(user.uid, projectId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId") ?? "";
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  const activity = await getTaskActivity(projectId, taskId);
  return NextResponse.json({ activity });
}
