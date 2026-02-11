"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

import type { AnalyticsEventName } from "@/types/analytics";

function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Providers sometimes persist env values with quotes, and it's easy to end up with
  // a stray leading/trailing quote. Strip any wrapping quotes rather than requiring
  // a perfectly balanced pair.
  const unquoted = trimmed.replace(/^["']+/, "").replace(/["']+$/, "").trim();
  return unquoted || undefined;
}

function normalizeAuthDomain(value: string | undefined) {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return undefined;

  // Firebase expects `authDomain` to be a bare host name (no scheme/path/query).
  // People often paste full URLs like `https://<host>/__/auth/handler`.
  const withoutScheme = normalized.replace(/^https?:\/\//i, "").replace(/^\/\//, "");
  const hostWithMaybePort = withoutScheme.split(/[/?#]/)[0]?.trim();
  if (!hostWithMaybePort) return undefined;

  // Ports are not valid in `authDomain` and can cause subtle runtime errors.
  return hostWithMaybePort.replace(/:\d+$/, "");
}

function getFirebaseDefaultsConfig() {
  const defaultsRaw = typeof process !== "undefined" ? process.env.__FIREBASE_DEFAULTS__ : undefined;
  if (!defaultsRaw) return undefined;
  try {
    const parsed = JSON.parse(defaultsRaw);
    return parsed?.config as Partial<Record<string, string>> | undefined;
  } catch {
    return undefined;
  }
}

const firebaseDefaults = getFirebaseDefaultsConfig();

const firebaseConfig = {
  apiKey: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) ?? normalizeEnvValue(firebaseDefaults?.apiKey),
  authDomain:
    normalizeAuthDomain(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) ??
    normalizeAuthDomain(firebaseDefaults?.authDomain),
  projectId:
    normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ?? normalizeEnvValue(firebaseDefaults?.projectId),
  storageBucket:
    normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) ??
    normalizeEnvValue(firebaseDefaults?.storageBucket),
  messagingSenderId:
    normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) ??
    normalizeEnvValue(firebaseDefaults?.messagingSenderId),
  appId: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) ?? normalizeEnvValue(firebaseDefaults?.appId),
  measurementId:
    normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) ??
    normalizeEnvValue(firebaseDefaults?.measurementId),
  databaseURL:
    normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) ??
    normalizeEnvValue(firebaseDefaults?.databaseURL)
};

const isBrowser = typeof window !== "undefined";
const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
const app = isBrowser && hasFirebaseConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const firestoreDatabaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;

if (app && process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } catch {
    // App Check is already initialized during HMR.
  }
}

export const auth = app ? getAuth(app) : (null as unknown as ReturnType<typeof getAuth>);
export const db = app
  ? firestoreDatabaseId
    ? getFirestore(app, firestoreDatabaseId)
    : getFirestore(app)
  : (null as unknown as ReturnType<typeof getFirestore>);
export const storage = app ? getStorage(app) : (null as unknown as ReturnType<typeof getStorage>);

let analyticsPromise: Promise<ReturnType<typeof getAnalytics> | null> | null = null;

export async function getClientAnalytics() {
  if (!app) {
    return null;
  }
  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => (supported ? getAnalytics(app) : null));
  }
  return analyticsPromise;
}

export async function trackEvent(name: AnalyticsEventName, params?: Record<string, string | number | boolean>) {
  if (!app) return;
  const analytics = await getClientAnalytics();
  if (analytics) {
    logEvent(analytics, name as string, params);
  }

  // Mirror analytics events to Firestore for admin-side growth dashboards.
  if (typeof window !== "undefined") {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...params })
    }).catch(() => {
      // Non-blocking analytics side effect.
    });
  }
}
