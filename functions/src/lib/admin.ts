import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

const app = getApps().length ? getApps()[0] : initializeApp();
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID;

export const adminDb = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
