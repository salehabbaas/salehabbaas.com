import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function initAdmin() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY env vars.");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

async function main() {
  initAdmin();
  const auth = getAuth();

  const uid = process.argv[2];
  if (!uid) {
    throw new Error("Usage: npm run set-admin -- <uid>");
  }

  await auth.setCustomUserClaims(uid, { admin: true });
  console.log(`Admin custom claim enabled for uid: ${uid}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
