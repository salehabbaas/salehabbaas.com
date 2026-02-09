import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

interface ServiceAccountFile {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getPrivateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

function getCredentialFromServiceAccountFile() {
  const configuredPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    "secrets/firebase-adminsdk.json";

  const absolutePath = resolve(configuredPath);
  if (!existsSync(absolutePath)) return null;

  const raw = readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<ServiceAccountFile>;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(`Invalid service account file at ${absolutePath}`);
  }

  return cert({
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key
  });
}

function getCredentialFromEnvironment() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return cert({
    projectId,
    clientEmail,
    privateKey
  });
}

const credential = getCredentialFromServiceAccountFile() ?? getCredentialFromEnvironment();

function initializeAdminApp() {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (credential && storageBucket) {
    return initializeApp({ credential, storageBucket });
  }
  if (credential) {
    return initializeApp({ credential });
  }
  if (storageBucket) {
    return initializeApp({ storageBucket });
  }
  return initializeApp();
}

const adminApp = initializeAdminApp();

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;

export const adminAuth = getAuth(adminApp);
export const adminDb = firestoreDatabaseId
  ? getFirestore(adminApp, firestoreDatabaseId)
  : getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
