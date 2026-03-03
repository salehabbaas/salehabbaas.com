import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";

const app = getApps().length ? getApps()[0] : initializeApp();
const configuredDatabaseId =
  process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "salehabbaas";
const firestoreDatabaseId = configuredDatabaseId === "(default)" ? undefined : configuredDatabaseId;

export const adminDb = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
export const adminMessaging = getMessaging(app);
