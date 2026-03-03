"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
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
const firestoreDatabaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "salehabbaas";

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

const authInstance = app ? getAuth(app) : null;
if (authInstance && typeof window !== "undefined") {
  void setPersistence(authInstance, browserLocalPersistence).catch(() => {
    // Keep auth usable even if persistence cannot be applied (e.g., strict browser settings).
  });
}

export const auth = authInstance ?? (null as unknown as ReturnType<typeof getAuth>);

function createFirestore() {
  if (!app) {
    return null as unknown as ReturnType<typeof getFirestore>;
  }

  try {
    // WebKit/Safari can fail Firestore WebChannel streaming with CORS-like
    // listen channel errors. Auto long-polling + disabled fetch streams avoids it.
    return firestoreDatabaseId
      ? initializeFirestore(
          app,
          {
            experimentalForceLongPolling: true,
            experimentalAutoDetectLongPolling: true,
          },
          firestoreDatabaseId
        )
      : initializeFirestore(app, {
          experimentalForceLongPolling: true,
          experimentalAutoDetectLongPolling: true,
        });
  } catch {
    // If Firestore was already initialized during HMR, reuse existing instance.
    return firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  }
}

export const db = createFirestore();
export const storage = app ? getStorage(app) : (null as unknown as ReturnType<typeof getStorage>);

let analyticsPromise: Promise<ReturnType<typeof getAnalytics> | null> | null = null;
const ANALYTICS_SESSION_KEY = "saleh_analytics_session";

export async function getClientAnalytics() {
  if (!app) {
    return null;
  }
  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => (supported ? getAnalytics(app) : null));
  }
  return analyticsPromise;
}

function getSessionId() {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(ANALYTICS_SESSION_KEY);
    if (existing) return existing;

    const next =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    window.localStorage.setItem(ANALYTICS_SESSION_KEY, next);
    return next;
  } catch {
    return "";
  }
}

function deriveDeviceType(userAgent: string): "mobile" | "desktop" | "tablet" | "bot" | "unknown" {
  const ua = userAgent.toLowerCase();
  if (!ua) return "unknown";
  if (/bot|crawler|spider|headless/i.test(ua)) return "bot";
  if (/ipad|tablet|kindle/i.test(ua)) return "tablet";
  if (/iphone|android.+mobile|mobile/i.test(ua)) return "mobile";
  return "desktop";
}

function deriveTrafficSource() {
  if (typeof window === "undefined") return "direct";

  try {
    const url = new URL(window.location.href);
    const utm = url.searchParams.get("utm_source");
    if (utm) return `utm:${utm}`;
  } catch {
    // Ignore malformed URL edge cases.
  }

  if (typeof document !== "undefined" && document.referrer) {
    try {
      const ref = new URL(document.referrer);
      return ref.hostname.replace(/^www\./, "") || "referral";
    } catch {
      return "referral";
    }
  }

  return "direct";
}

export async function trackEvent(name: AnalyticsEventName, params?: Record<string, string | number | boolean>) {
  if (!app) return;
  const contextParams =
    typeof window !== "undefined"
      ? {
          path: window.location.pathname,
          referrer: document.referrer || "",
          source: deriveTrafficSource(),
          sessionId: getSessionId(),
          deviceType: deriveDeviceType(navigator.userAgent),
          userAgent: navigator.userAgent.slice(0, 280)
        }
      : {};

  const mergedParams = { ...contextParams, ...(params ?? {}) };

  const analytics = await getClientAnalytics();
  if (analytics) {
    logEvent(analytics, name as string, mergedParams);
  }

  // Mirror analytics events to Firestore for admin-side growth dashboards.
  if (typeof window !== "undefined") {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...mergedParams })
    }).catch(() => {
      // Non-blocking analytics side effect.
    });
  }
}
