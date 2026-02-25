import { NextResponse } from "next/server";

import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { getTaskActivity } from "@/lib/firestore/project-management";
import { adminDb } from "@/lib/firebase/admin";

async function assertOwner(projectId: string, uid: string) {
  const projectSnap = await adminDb.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) return false;
  return String(projectSnap.data()?.ownerId ?? "") === uid;
}

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const allowed = await assertOwner(projectId, user.uid);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId") ?? "";
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  const activity = await getTaskActivity(projectId, taskId);
  return NextResponse.json({ activity });
}
