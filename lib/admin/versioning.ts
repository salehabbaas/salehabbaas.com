import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { adminDb } from "@/lib/firebase/admin";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import type { AdminRequestContext } from "@/lib/admin/request-context";

export async function captureSiteSnapshot(actor: DecodedIdToken | null, note?: string, context?: Partial<AdminRequestContext>) {
  const [projectsSnap, blogSnap, contentItemsSnap, bookingsSnap, jobsSnap, linkedinSnap] = await Promise.all([
    adminDb.collection("projects").get(),
    adminDb.collection("blogPosts").get(),
    adminDb.collection("contentItems").get(),
    adminDb.collection("bookings").get(),
    adminDb.collection("jobApplications").get(),
    adminDb.collection("linkedinStudioPosts").get()
  ]);

  const snapshot = {
    createdAt: new Date(),
    createdBy: {
      uid: actor?.uid ?? "system",
      email: actor?.email ?? ""
    },
    note: note ?? "",
    counts: {
      projects: projectsSnap.size,
      blogPosts: blogSnap.size,
      creatorItems: contentItemsSnap.size,
      bookings: bookingsSnap.size,
      jobApplications: jobsSnap.size,
      linkedinPosts: linkedinSnap.size
    }
  };

  const ref = await adminDb.collection("siteVersionSnapshots").add(snapshot);

  await writeAdminAuditLog(
    {
      module: "versioning",
      action: "snapshot_create",
      targetType: "siteVersionSnapshot",
      targetId: ref.id,
      summary: "Created an application snapshot",
      metadata: snapshot.counts
    },
    actor,
    context
  );

  return { id: ref.id, ...snapshot };
}
