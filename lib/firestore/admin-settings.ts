import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { publicNavigation } from "@/lib/data/navigation";
import { applyEmailTemplatePatch, normalizeAdminEmailTemplates } from "@/lib/email/template-catalog";
import { getSecretPresenceFromSettings, getSecretSourceMap, type SecretSource } from "@/lib/admin/integration-secrets";
import type {
  AdminEmailTemplates,
  AdminIntegrationSettings,
  AdminSecretSettings,
  PublicPageSettings,
  PublicPageSettingsItem,
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

const DEFAULT_PUBLIC_PAGE_SETTINGS: PublicPageSettings = PUBLIC_PAGE_PATHS.map((path, index) => {
  const navigationItem = publicNavigation.find((item) => item.href === path);
  const defaultName = navigationItem?.label ?? path;
  const defaultDescription = navigationItem?.description ?? "";
  return {
    path,
    enabled: DEFAULT_PAGE_VISIBILITY[path],
    name: defaultName,
    description: defaultDescription,
    link: navigationItem?.href ?? path,
    menuOrder: index,
    seoTitle: defaultName,
    seoDescription: defaultDescription,
    seoKeywords: "",
    seoImage: ""
  };
});

const DEFAULT_ADMIN_INTEGRATIONS: AdminIntegrationSettings = {
  emailProvider: "resend",
  senderEmail: "",
  senderName: "Saleh Abbaas",
  contactFunctionUrl: "",
  bookingFunctionUrl: "",
  googleCalendarId: "primary",
  geminiModel: "gemini-2.5-flash",
  geminiTextModel: "",
  telegramAllowedChatIds: "",
  telegramDefaultChatId: "",
  agentOwnerUid: "",
  telegramActionsEnabled: false,
  resumeStudioV2Enabled: false,
  resumeAi53Enabled: false,
  resumeJobUrlParserEnabled: false,
  resumeAdvancedTemplateBuilderEnabled: false
};

const DEFAULT_ADMIN_SECRETS: AdminSecretSettings = {
  resendApiKey: "",
  sendgridApiKey: "",
  mailgunApiKey: "",
  mailgunDomain: "",
  gmailAppPassword: "",
  zohoSmtpHost: "",
  zohoSmtpPort: "",
  zohoSmtpSecure: "",
  zohoSmtpUsername: "",
  zohoSmtpPassword: "",
  googleServiceAccountEmail: "",
  googleServiceAccountPrivateKey: "",
  geminiApiKey: "",
  googleApiKey: "",
  telegramBotToken: "",
  telegramWebhookSecret: ""
};

const INTEGRATIONS_PATH = { collection: "adminSettings", doc: "integrations" } as const;
const SECRETS_PATH = { collection: "adminSettings", doc: "secrets" } as const;
const EMAIL_TEMPLATES_PATH = { collection: "adminSettings", doc: "emailTemplates" } as const;
const PAGE_VISIBILITY_PATH = { collection: "siteContent", doc: "pageVisibility" } as const;

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePublicLink(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `/${trimmed.replace(/^\/+/, "")}`;
}

function normalizeMenuOrder(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function normalizeOptionalText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function sortPublicPageSettings(settings: PublicPageSettings) {
  return [...settings].sort(
    (a, b) => a.menuOrder - b.menuOrder || a.name.localeCompare(b.name) || a.path.localeCompare(b.path)
  );
}

export function getDefaultPageVisibility(): PageVisibilitySettings {
  return { ...DEFAULT_PAGE_VISIBILITY };
}

export function getDefaultPublicPageSettings(): PublicPageSettings {
  return sortPublicPageSettings(DEFAULT_PUBLIC_PAGE_SETTINGS.map((item) => ({ ...item })));
}

function normalizePublicPageSettings(input: Record<string, unknown> | undefined): PublicPageSettings {
  const defaults = getDefaultPublicPageSettings();
  if (!input) return defaults;

  const fallbackByPath = new Map(defaults.map((item) => [item.path, item] as const));
  const nestedPages = isObjectRecord(input.pages) ? input.pages : undefined;

  const normalized = PUBLIC_PAGE_PATHS.map((path) => {
    const fallback = fallbackByPath.get(path);
    if (!fallback) {
      return {
        path,
        enabled: DEFAULT_PAGE_VISIBILITY[path],
        name: path,
        description: "",
        link: path,
        menuOrder: Number.MAX_SAFE_INTEGER,
        seoTitle: path,
        seoDescription: "",
        seoKeywords: "",
        seoImage: ""
      } satisfies PublicPageSettingsItem;
    }

    const rawPage = nestedPages && isObjectRecord(nestedPages[path]) ? nestedPages[path] : undefined;
    const enabled =
      typeof rawPage?.enabled === "boolean"
        ? rawPage.enabled
        : typeof input[path] === "boolean"
          ? (input[path] as boolean)
          : fallback.enabled;
    const name =
      typeof rawPage?.name === "string" && rawPage.name.trim().length
        ? rawPage.name.trim()
        : fallback.name;
    const description = typeof rawPage?.description === "string" ? rawPage.description.trim() : fallback.description;
    const link = normalizePublicLink(rawPage?.link, fallback.link);
    const menuOrder = normalizeMenuOrder(rawPage?.menuOrder, fallback.menuOrder);
    const seoTitle = normalizeOptionalText(rawPage?.seoTitle, fallback.seoTitle || name);
    const seoDescription = normalizeOptionalText(rawPage?.seoDescription, fallback.seoDescription || description);
    const seoKeywords = normalizeOptionalText(rawPage?.seoKeywords, fallback.seoKeywords);
    const seoImage = normalizeOptionalText(rawPage?.seoImage, fallback.seoImage);

    return {
      path,
      enabled,
      name,
      description,
      link,
      menuOrder,
      seoTitle,
      seoDescription,
      seoKeywords,
      seoImage
    } satisfies PublicPageSettingsItem;
  });

  return sortPublicPageSettings(normalized);
}

function toPageVisibilityMap(settings: PublicPageSettings): PageVisibilitySettings {
  const visibility = getDefaultPageVisibility();
  for (const setting of settings) {
    visibility[setting.path] = setting.enabled;
  }
  return visibility;
}

function normalizePageSettingsPatch(input: PublicPageSettings): PublicPageSettings {
  const defaultsByPath = new Map(getDefaultPublicPageSettings().map((item) => [item.path, item] as const));
  const inputByPath = new Map(input.map((item) => [item.path, item] as const));

  const merged = PUBLIC_PAGE_PATHS.map((path) => {
    const fallback = defaultsByPath.get(path);
    const candidate = inputByPath.get(path);
    if (!fallback) {
      return {
        path,
        enabled: true,
        name: path,
        description: "",
        link: path,
        menuOrder: Number.MAX_SAFE_INTEGER,
        seoTitle: path,
        seoDescription: "",
        seoKeywords: "",
        seoImage: ""
      } satisfies PublicPageSettingsItem;
    }

    if (!candidate) return fallback;

    return {
      path,
      enabled: candidate.enabled === false ? false : true,
      name: candidate.name.trim() || fallback.name,
      description: candidate.description.trim(),
      link: normalizePublicLink(candidate.link, fallback.link),
      menuOrder: normalizeMenuOrder(candidate.menuOrder, fallback.menuOrder),
      seoTitle: normalizeOptionalText(candidate.seoTitle, fallback.seoTitle || fallback.name),
      seoDescription: normalizeOptionalText(candidate.seoDescription, fallback.seoDescription || fallback.description),
      seoKeywords: normalizeOptionalText(candidate.seoKeywords, fallback.seoKeywords),
      seoImage: normalizeOptionalText(candidate.seoImage, fallback.seoImage)
    } satisfies PublicPageSettingsItem;
  });

  return sortPublicPageSettings(merged);
}

export async function getPublicPageSettings(): Promise<PublicPageSettings> {
  const snap = await adminDb.collection(PAGE_VISIBILITY_PATH.collection).doc(PAGE_VISIBILITY_PATH.doc).get();
  return normalizePublicPageSettings((snap.data() as Record<string, unknown> | undefined) ?? undefined);
}

export async function getPageVisibilitySettings(): Promise<PageVisibilitySettings> {
  const settings = await getPublicPageSettings();
  return toPageVisibilityMap(settings);
}

export async function savePageVisibilitySettings(patch: Partial<PageVisibilitySettings>) {
  const existing = await getPublicPageSettings();
  const merged = existing.map((item) => ({
    ...item,
    enabled: typeof patch[item.path] === "boolean" ? (patch[item.path] as boolean) : item.enabled
  }));

  await savePublicPageSettings(merged);
}

export async function savePublicPageSettings(input: PublicPageSettings) {
  const settings = normalizePageSettingsPatch(input);
  const visibilityPayload: Partial<PageVisibilitySettings> = {};
  const pagesPayload: Record<string, Omit<PublicPageSettingsItem, "path">> = {};

  for (const page of settings) {
    visibilityPayload[page.path] = page.enabled;
    pagesPayload[page.path] = {
      enabled: page.enabled,
      name: page.name,
      description: page.description,
      link: page.link,
      menuOrder: page.menuOrder,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoKeywords: page.seoKeywords,
      seoImage: page.seoImage
    };
  }

  await adminDb.collection(PAGE_VISIBILITY_PATH.collection).doc(PAGE_VISIBILITY_PATH.doc).set(
    {
      ...visibilityPayload,
      pages: pagesPayload,
      updatedAt: new Date()
    },
    { merge: true }
  );
}

function normalizeProvider(value: unknown): AdminIntegrationSettings["emailProvider"] {
  if (value === "sendgrid" || value === "resend" || value === "mailgun" || value === "zoho" || value === "gmail") {
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
    geminiTextModel: asString(data.geminiTextModel),
    telegramAllowedChatIds: asString(data.telegramAllowedChatIds),
    telegramDefaultChatId: asString(data.telegramDefaultChatId),
    agentOwnerUid: asString(data.agentOwnerUid),
    telegramActionsEnabled:
      typeof data.telegramActionsEnabled === "boolean"
        ? data.telegramActionsEnabled
        : DEFAULT_ADMIN_INTEGRATIONS.telegramActionsEnabled,
    resumeStudioV2Enabled:
      typeof data.resumeStudioV2Enabled === "boolean"
        ? data.resumeStudioV2Enabled
        : DEFAULT_ADMIN_INTEGRATIONS.resumeStudioV2Enabled,
    resumeAi53Enabled:
      typeof data.resumeAi53Enabled === "boolean" ? data.resumeAi53Enabled : DEFAULT_ADMIN_INTEGRATIONS.resumeAi53Enabled,
    resumeJobUrlParserEnabled:
      typeof data.resumeJobUrlParserEnabled === "boolean"
        ? data.resumeJobUrlParserEnabled
        : DEFAULT_ADMIN_INTEGRATIONS.resumeJobUrlParserEnabled,
    resumeAdvancedTemplateBuilderEnabled:
      typeof data.resumeAdvancedTemplateBuilderEnabled === "boolean"
        ? data.resumeAdvancedTemplateBuilderEnabled
        : DEFAULT_ADMIN_INTEGRATIONS.resumeAdvancedTemplateBuilderEnabled
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
  if (typeof patch.telegramAllowedChatIds === "string") payload.telegramAllowedChatIds = patch.telegramAllowedChatIds.trim();
  if (typeof patch.telegramDefaultChatId === "string") payload.telegramDefaultChatId = patch.telegramDefaultChatId.trim();
  if (typeof patch.agentOwnerUid === "string") payload.agentOwnerUid = patch.agentOwnerUid.trim();
  if (typeof patch.telegramActionsEnabled === "boolean") payload.telegramActionsEnabled = patch.telegramActionsEnabled;
  if (typeof patch.resumeStudioV2Enabled === "boolean") payload.resumeStudioV2Enabled = patch.resumeStudioV2Enabled;
  if (typeof patch.resumeAi53Enabled === "boolean") payload.resumeAi53Enabled = patch.resumeAi53Enabled;
  if (typeof patch.resumeJobUrlParserEnabled === "boolean") payload.resumeJobUrlParserEnabled = patch.resumeJobUrlParserEnabled;
  if (typeof patch.resumeAdvancedTemplateBuilderEnabled === "boolean") {
    payload.resumeAdvancedTemplateBuilderEnabled = patch.resumeAdvancedTemplateBuilderEnabled;
  }

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
    gmailAppPassword: asString(data.gmailAppPassword),
    zohoSmtpHost: asString(data.zohoSmtpHost),
    zohoSmtpPort: asString(data.zohoSmtpPort),
    zohoSmtpSecure: asString(data.zohoSmtpSecure),
    zohoSmtpUsername: asString(data.zohoSmtpUsername),
    zohoSmtpPassword: asString(data.zohoSmtpPassword),
    googleServiceAccountEmail: asString(data.googleServiceAccountEmail),
    googleServiceAccountPrivateKey: asString(data.googleServiceAccountPrivateKey),
    geminiApiKey: asString(data.geminiApiKey),
    googleApiKey: asString(data.googleApiKey),
    telegramBotToken: asString(data.telegramBotToken),
    telegramWebhookSecret: asString(data.telegramWebhookSecret)
  };
}

export async function getAdminSecretPresence(): Promise<SecretPresence> {
  const settings = await getAdminSecretSettings();
  return getSecretPresenceFromSettings(settings, process.env);
}

export async function getAdminSecretSources(): Promise<Record<keyof AdminSecretSettings, SecretSource>> {
  const settings = await getAdminSecretSettings();
  return getSecretSourceMap(settings, process.env);
}

export async function getAdminEmailTemplates(): Promise<AdminEmailTemplates> {
  const snap = await adminDb.collection(EMAIL_TEMPLATES_PATH.collection).doc(EMAIL_TEMPLATES_PATH.doc).get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  return normalizeAdminEmailTemplates(data.templates ?? data);
}

export async function saveAdminEmailTemplates(patch: Partial<AdminEmailTemplates>) {
  const existing = await getAdminEmailTemplates();
  const merged = applyEmailTemplatePatch(existing, patch);

  await adminDb.collection(EMAIL_TEMPLATES_PATH.collection).doc(EMAIL_TEMPLATES_PATH.doc).set(
    {
      templates: merged,
      updatedAt: new Date()
    },
    { merge: true }
  );
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
  const [integrations, secrets, emailTemplates] = await Promise.all([
    getAdminIntegrationSettings(),
    getAdminSecretSettings(),
    getAdminEmailTemplates()
  ]);
  return { integrations, secrets, emailTemplates };
}
