import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import type {
  AdminIntegrationSettings,
  AdminSecretSettings,
  PageVisibilitySettings,
  PublicPagePath,
  SecretPresence
} from "@/types/site-settings";

const PUBLIC_PAGE_PATHS: PublicPagePath[] = [
  "/",
  "/about",
  "/ai-news",
  "/experience",
  "/projects",
  "/services",
  "/certificates",
  "/blog",
  "/creator",
  "/public-statement",
  "/book-meeting",
  "/contact"
];

const DEFAULT_PAGE_VISIBILITY: PageVisibilitySettings = {
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

const DEFAULT_ADMIN_INTEGRATIONS: AdminIntegrationSettings = {
  emailProvider: "resend",
  senderEmail: "",
  senderName: "Saleh Abbaas",
  contactFunctionUrl: "",
  bookingFunctionUrl: "",
  googleCalendarId: "primary",
  geminiModel: "gemini-2.5-flash",
  geminiTextModel: ""
};

const DEFAULT_ADMIN_SECRETS: AdminSecretSettings = {
  resendApiKey: "",
  sendgridApiKey: "",
  mailgunApiKey: "",
  mailgunDomain: "",
  googleServiceAccountEmail: "",
  googleServiceAccountPrivateKey: "",
  geminiApiKey: "",
  googleApiKey: ""
};

const INTEGRATIONS_PATH = { collection: "adminSettings", doc: "integrations" } as const;
const SECRETS_PATH = { collection: "adminSettings", doc: "secrets" } as const;
const PAGE_VISIBILITY_PATH = { collection: "siteContent", doc: "pageVisibility" } as const;

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function getDefaultPageVisibility(): PageVisibilitySettings {
  return { ...DEFAULT_PAGE_VISIBILITY };
}

function normalizePageVisibility(input: Record<string, unknown> | undefined): PageVisibilitySettings {
  const base = getDefaultPageVisibility();
  if (!input) return base;

  for (const path of PUBLIC_PAGE_PATHS) {
    const value = input[path];
    if (typeof value === "boolean") {
      base[path] = value;
    }
  }
  return base;
}

export async function getPageVisibilitySettings(): Promise<PageVisibilitySettings> {
  const snap = await adminDb.collection(PAGE_VISIBILITY_PATH.collection).doc(PAGE_VISIBILITY_PATH.doc).get();
  return normalizePageVisibility((snap.data() as Record<string, unknown> | undefined) ?? undefined);
}

export async function savePageVisibilitySettings(patch: Partial<PageVisibilitySettings>) {
  const payload: Partial<PageVisibilitySettings> = {};
  for (const path of PUBLIC_PAGE_PATHS) {
    if (typeof patch[path] === "boolean") {
      payload[path] = patch[path];
    }
  }

  await adminDb.collection(PAGE_VISIBILITY_PATH.collection).doc(PAGE_VISIBILITY_PATH.doc).set(
    {
      ...payload,
      updatedAt: new Date()
    },
    { merge: true }
  );
}

function normalizeProvider(value: unknown): AdminIntegrationSettings["emailProvider"] {
  if (value === "sendgrid" || value === "resend" || value === "mailgun" || value === "zoho") {
    return value;
  }
  return DEFAULT_ADMIN_INTEGRATIONS.emailProvider;
}

export async function getAdminIntegrationSettings(): Promise<AdminIntegrationSettings> {
  const [integrationSnap, legacySnap] = await Promise.all([
    adminDb.collection(INTEGRATIONS_PATH.collection).doc(INTEGRATIONS_PATH.doc).get(),
    adminDb.collection("siteContent").doc("integrations").get()
  ]);

  const data = (integrationSnap.data() ?? {}) as Record<string, unknown>;
  const legacy = (legacySnap.data() ?? {}) as Record<string, unknown>;

  return {
    emailProvider: normalizeProvider(data.emailProvider ?? legacy.emailProvider),
    senderEmail: asString(data.senderEmail ?? legacy.senderEmail),
    senderName: asString(data.senderName ?? legacy.senderName) || DEFAULT_ADMIN_INTEGRATIONS.senderName,
    contactFunctionUrl: asString(data.contactFunctionUrl),
    bookingFunctionUrl: asString(data.bookingFunctionUrl),
    googleCalendarId: asString(data.googleCalendarId) || DEFAULT_ADMIN_INTEGRATIONS.googleCalendarId,
    geminiModel: asString(data.geminiModel) || DEFAULT_ADMIN_INTEGRATIONS.geminiModel,
    geminiTextModel: asString(data.geminiTextModel)
  };
}

export async function saveAdminIntegrationSettings(patch: Partial<AdminIntegrationSettings>) {
  const payload: Record<string, unknown> = {
    updatedAt: new Date()
  };

  if (patch.emailProvider) payload.emailProvider = normalizeProvider(patch.emailProvider);
  if (typeof patch.senderEmail === "string") payload.senderEmail = patch.senderEmail.trim();
  if (typeof patch.senderName === "string") payload.senderName = patch.senderName.trim();
  if (typeof patch.contactFunctionUrl === "string") payload.contactFunctionUrl = patch.contactFunctionUrl.trim();
  if (typeof patch.bookingFunctionUrl === "string") payload.bookingFunctionUrl = patch.bookingFunctionUrl.trim();
  if (typeof patch.googleCalendarId === "string") payload.googleCalendarId = patch.googleCalendarId.trim();
  if (typeof patch.geminiModel === "string") payload.geminiModel = patch.geminiModel.trim();
  if (typeof patch.geminiTextModel === "string") payload.geminiTextModel = patch.geminiTextModel.trim();

  await adminDb.collection(INTEGRATIONS_PATH.collection).doc(INTEGRATIONS_PATH.doc).set(payload, { merge: true });

  // Keep legacy integration document aligned for existing email provider consumers.
  const legacyPayload: Record<string, unknown> = {
    updatedAt: new Date()
  };
  if (payload.emailProvider) legacyPayload.emailProvider = payload.emailProvider;
  if (payload.senderEmail) legacyPayload.senderEmail = payload.senderEmail;
  if (payload.senderName) legacyPayload.senderName = payload.senderName;

  await adminDb.collection("siteContent").doc("integrations").set(legacyPayload, { merge: true });
}

export async function getAdminSecretSettings(): Promise<AdminSecretSettings> {
  const snap = await adminDb.collection(SECRETS_PATH.collection).doc(SECRETS_PATH.doc).get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;

  return {
    resendApiKey: asString(data.resendApiKey),
    sendgridApiKey: asString(data.sendgridApiKey),
    mailgunApiKey: asString(data.mailgunApiKey),
    mailgunDomain: asString(data.mailgunDomain),
    googleServiceAccountEmail: asString(data.googleServiceAccountEmail),
    googleServiceAccountPrivateKey: asString(data.googleServiceAccountPrivateKey),
    geminiApiKey: asString(data.geminiApiKey),
    googleApiKey: asString(data.googleApiKey)
  };
}

export async function getAdminSecretPresence(): Promise<SecretPresence> {
  const settings = await getAdminSecretSettings();
  return {
    resendApiKey: Boolean(settings.resendApiKey),
    sendgridApiKey: Boolean(settings.sendgridApiKey),
    mailgunApiKey: Boolean(settings.mailgunApiKey),
    mailgunDomain: Boolean(settings.mailgunDomain),
    googleServiceAccountEmail: Boolean(settings.googleServiceAccountEmail),
    googleServiceAccountPrivateKey: Boolean(settings.googleServiceAccountPrivateKey),
    geminiApiKey: Boolean(settings.geminiApiKey),
    googleApiKey: Boolean(settings.googleApiKey)
  };
}

export async function saveAdminSecretSettings(patch: Partial<AdminSecretSettings>) {
  const payload: Record<string, unknown> = {
    updatedAt: new Date()
  };

  for (const key of Object.keys(DEFAULT_ADMIN_SECRETS) as Array<keyof AdminSecretSettings>) {
    if (typeof patch[key] === "string") {
      payload[key] = patch[key].trim();
    }
  }

  await adminDb.collection(SECRETS_PATH.collection).doc(SECRETS_PATH.doc).set(payload, { merge: true });
}

export async function getRuntimeAdminSettings() {
  const [integrations, secrets] = await Promise.all([getAdminIntegrationSettings(), getAdminSecretSettings()]);
  return { integrations, secrets };
}
