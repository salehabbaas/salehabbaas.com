import "server-only";

import { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";

function asIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

export async function getAdminDashboardSummary() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [eventsSnap, bookingsSnap, jobsSnap, creatorVariantsSnap] = await Promise.all([
    adminDb.collection("analyticsEvents").where("createdAt", ">=", thirtyDaysAgo).get(),
    adminDb.collection("bookings").where("startAt", ">=", new Date()).get(),
    adminDb.collection("jobApplications").get(),
    getPublicVariantDocs()
  ]);

  const pageViews = eventsSnap.docs.filter((doc) => doc.data().name === "page_view");
  const topPagesMap = new Map<string, number>();
  pageViews.forEach((doc) => {
    const path = doc.data().path ?? "/";
    topPagesMap.set(path, (topPagesMap.get(path) ?? 0) + 1);
  });

  const topPages = Array.from(topPagesMap.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 7);

  const creatorTotals = creatorVariantsSnap.docs.reduce(
    (acc, doc) => {
      const metrics = doc.data().metrics ?? {};
      return {
        views: acc.views + Number(metrics.views ?? 0),
        likes: acc.likes + Number(metrics.likes ?? 0),
        comments: acc.comments + Number(metrics.comments ?? 0),
        shares: acc.shares + Number(metrics.shares ?? 0)
      };
    },
    { views: 0, likes: 0, comments: 0, shares: 0 }
  );

  const bookings = bookingsSnap.docs.map((doc) => ({
    id: doc.id,
    startAt: asIso(doc.data().startAt),
    status: doc.data().status ?? "confirmed"
  }));

  const bookingStats = {
    upcoming: bookings.filter((booking) => booking.status !== "cancelled").length,
    cancelled: bookings.filter((booking) => booking.status === "cancelled").length
  };

  const jobStats = {
    total: jobsSnap.size,
    offers: jobsSnap.docs.filter((doc) => String(doc.data().response ?? "").toLowerCase() === "offer").length,
    interviews: jobsSnap.docs.filter((doc) => String(doc.data().interviewStage ?? "none").toLowerCase() !== "none").length
  };

  return {
    traffic: {
      pageViews: pageViews.length,
      eventCount: eventsSnap.size,
      topPages
    },
    creator: creatorTotals,
    bookings: bookingStats,
    jobs: jobStats
  };
}

async function getPublicVariantDocs() {
  const pageSize = 200;
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  const docs: QueryDocumentSnapshot<DocumentData>[] = [];

  for (let page = 0; page < 50; page += 1) {
    let query = adminDb.collectionGroup("variants").where("visibility", "==", "public").orderBy("publishedAt", "desc").limit(pageSize);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snap = await query.get();
    if (snap.empty) break;

    docs.push(...snap.docs);
    cursor = snap.docs[snap.docs.length - 1];

    if (snap.size < pageSize) break;
  }

  return { docs };
}
