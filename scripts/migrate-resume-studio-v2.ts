import { getFirestore } from "firebase-admin/firestore";

import { initAdminForScripts } from "./firebase-admin-init";
import {
  RESUME_STUDIO_SCHEMA_VERSION,
  normalizeResumeDocumentRecord,
  normalizeResumeTemplateRecord,
  toPersistedResumeDocument,
  toPersistedResumeTemplate
} from "../lib/resume-studio/normalize";

type MigrationStats = {
  scanned: number;
  updated: number;
};

function getDb() {
  const app = initAdminForScripts();
  const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
  return firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
}

async function migrateCollection(
  collectionName: "resumeDocuments" | "resumeTemplates",
  dryRun: boolean
): Promise<MigrationStats> {
  const db = getDb();
  const snap = await db.collection(collectionName).get();
  let scanned = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    scanned += 1;
    const raw = doc.data() as Record<string, unknown>;

    if (collectionName === "resumeDocuments") {
      const normalized = normalizeResumeDocumentRecord({ id: doc.id, data: raw });
      const payload = {
        ...toPersistedResumeDocument(normalized),
        schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
        updatedAt: new Date()
      };

      if (!dryRun) {
        await doc.ref.set(payload, { merge: true });
      }
      updated += 1;
      continue;
    }

    const normalizedTemplate = normalizeResumeTemplateRecord({ id: doc.id, data: raw });
    const payload = {
      ...toPersistedResumeTemplate(normalizedTemplate),
      schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
      updatedAt: new Date()
    };

    if (!dryRun) {
      await doc.ref.set(payload, { merge: true });
    }
    updated += 1;
  }

  return { scanned, updated };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const docsStats = await migrateCollection("resumeDocuments", dryRun);
  const templatesStats = await migrateCollection("resumeTemplates", dryRun);

  console.log(`Resume Studio v2 migration ${dryRun ? "(dry run)" : ""}`);
  console.log(`- resumeDocuments: scanned ${docsStats.scanned}, updated ${docsStats.updated}`);
  console.log(`- resumeTemplates: scanned ${templatesStats.scanned}, updated ${templatesStats.updated}`);
}

main().catch((error) => {
  console.error("Migration failed", error);
  process.exit(1);
});
