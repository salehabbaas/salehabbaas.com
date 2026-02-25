import { getFirestore } from "firebase-admin/firestore";

import { initAdminForScripts } from "./firebase-admin-init";

type BackfillConfig = {
  collection: string;
  defaultStatus: string;
};

const backfillConfigs: BackfillConfig[] = [
  { collection: "projects", defaultStatus: "draft" },
  { collection: "blogPosts", defaultStatus: "draft" },
  { collection: "experiences", defaultStatus: "published" },
  { collection: "services", defaultStatus: "published" },
  { collection: "certificates", defaultStatus: "published" },
  { collection: "socialLinks", defaultStatus: "published" }
];

const defaultPageVisibility = {
  "/": true,
  "/about": true,
  "/ai-news": true,
  "/experience": true,
  "/projects": true,
  "/services": true,
  "/certificates": true,
  "/blog": true,
  "/creator": true,
  "/public-statement": true,
  "/book-meeting": true,
  "/contact": true
};

async function run() {
  const app = initAdminForScripts();
  const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "(default)");

  for (const config of backfillConfigs) {
    const snap = await db.collection(config.collection).get();
    let changed = 0;
    const batch = db.batch();

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const updates: Record<string, unknown> = {};
      if (typeof data.status !== "string") {
        updates.status = config.defaultStatus;
      }
      if (typeof data.isDeleted !== "boolean") {
        updates.isDeleted = false;
      }
      if (!Object.keys(updates).length) return;
      updates.updatedAt = new Date();
      batch.set(docSnap.ref, updates, { merge: true });
      changed += 1;
    });

    if (changed) {
      await batch.commit();
    }
    // eslint-disable-next-line no-console
    console.log(`${config.collection}: ${changed} document(s) updated`);
  }

  await db.collection("siteContent").doc("pageVisibility").set(
    {
      ...defaultPageVisibility,
      updatedAt: new Date()
    },
    { merge: true }
  );
  // eslint-disable-next-line no-console
  console.log("siteContent/pageVisibility defaults ensured");
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
