import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { cert, getApps, initializeApp } from "firebase-admin/app";

interface ServiceAccountFile {
  project_id: string;
  client_email: string;
  private_key: string;
}

function loadScriptEnvFiles() {
  const maybeProcess = process as typeof process & { loadEnvFile?: (path?: string) => void };
  if (!maybeProcess.loadEnvFile) return;

  if (existsSync(resolve(".env"))) {
    maybeProcess.loadEnvFile(".env");
  }

  if (existsSync(resolve(".env.local"))) {
    maybeProcess.loadEnvFile(".env.local");
  }
}

loadScriptEnvFiles();

function fromServiceAccountFile() {
  const configuredPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    "artelo-f7475-firebase-adminsdk-krn92-1e4c710408.json";

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

function fromEnvironment() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;

  return cert({
    projectId,
    clientEmail,
    privateKey
  });
}

export function initAdminForScripts() {
  if (getApps().length) return getApps()[0];

  const credential = fromServiceAccountFile() ?? fromEnvironment();
  if (!credential) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_PATH (recommended) or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
    );
  }

  return initializeApp({ credential });
}
