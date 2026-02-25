import { NextResponse } from "next/server";

import { toIso } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { captureSiteSnapshot } from "@/lib/admin/versioning";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  const session = await verifyAdminSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection("siteVersionSnapshots").orderBy("createdAt", "desc").limit(20).get();

  return NextResponse.json({
    snapshots: snap.docs.map((doc) => ({
      id: doc.id,
      createdAt: toIso(doc.data().createdAt),
      createdBy: {
        uid: String(doc.data().createdBy?.uid ?? ""),
        email: String(doc.data().createdBy?.email ?? "")
      },
      note: String(doc.data().note ?? ""),
      counts: {
        projects: Number(doc.data().counts?.projects ?? 0),
        blogPosts: Number(doc.data().counts?.blogPosts ?? 0),
        creatorItems: Number(doc.data().counts?.creatorItems ?? 0),
        bookings: Number(doc.data().counts?.bookings ?? 0),
        jobApplications: Number(doc.data().counts?.jobApplications ?? 0),
        linkedinPosts: Number(doc.data().counts?.linkedinPosts ?? 0)
      }
    }))
  });
}

export async function POST(request: Request) {
  const session = await verifyAdminSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestContext = getAdminRequestContext(request);

  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note : undefined;

  const snapshot = await captureSiteSnapshot(session, note, requestContext);

  return NextResponse.json({
    snapshot: {
      id: snapshot.id,
      createdAt: toIso(snapshot.createdAt),
      createdBy: snapshot.createdBy,
      note: snapshot.note,
      counts: snapshot.counts
    }
  });
}
