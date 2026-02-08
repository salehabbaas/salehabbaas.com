import { getAuth } from "firebase-admin/auth";
import { initAdminForScripts } from "./firebase-admin-init";

async function main() {
  initAdminForScripts();
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
