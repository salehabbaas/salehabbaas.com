import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { goalsWorkspaceDefault } from "@/types/goals";

export const runtime = "nodejs";

function asIso(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

export async function GET() {
  if (!(await verifyAdminRequest({ requiredModule: "dashboard" }))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch completed and in-progress goals for authenticated admin use.
    const stickersSnap = await adminDb
      .collection("goalStickers")
      .where("workspaceId", "==", goalsWorkspaceDefault)
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();

    const goals = stickersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title ?? ""),
        notes: data.notes ? String(data.notes) : undefined,
        status: String(data.status ?? "inbox"),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        color: String(data.color ?? "#6B7280"),
        priority: String(data.priority ?? "medium"),
        plannedDate: data.plannedDate ? String(data.plannedDate) : undefined,
        completedAt: asIso(data.completedAt),
        learning: data.learning
          ? {
              learningArea: data.learning.learningArea || undefined,
              learningOutcome: data.learning.learningOutcome || undefined,
              difficulty: data.learning.difficulty || undefined,
              studyType: data.learning.studyType || undefined,
              resourceLink: data.learning.resourceLink || undefined,
              timeBoxMinutes: data.learning.timeBoxMinutes || undefined,
            }
          : undefined,
      };
    });

    // Get basic stats
    const statsSnap = await adminDb
      .collection("goalLearningStats")
      .where("workspaceId", "==", goalsWorkspaceDefault)
      .limit(1)
      .get();

    const statsDoc = statsSnap.empty ? null : statsSnap.docs[0].data();
    const completedCount = goals.filter((g) => g.status === "done").length;

    return NextResponse.json({
      goals,
      stats: {
        currentStreak: statsDoc?.currentStreak ?? 0,
        longestStreak: statsDoc?.longestStreak ?? 0,
        totalCompleted: completedCount,
        totalMinutes: statsDoc?.totalMinutes ?? 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load goals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
