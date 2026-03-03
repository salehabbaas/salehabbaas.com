import "server-only";

import type { EmailTemplateId } from "@/types/site-settings";
import { getAdminEmailTemplates, getAdminIntegrationSettings } from "@/lib/firestore/admin-settings";
import { renderEmailTemplate } from "@/lib/email/template-render";

type TemplateVariables = Record<string, unknown>;

function resolveSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.DEFAULT_SITE_URL || "https://salehabbaas.com";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return "https://salehabbaas.com";
  }
}

function normalizeUrl(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
    return fallback;
  } catch {
    return fallback;
  }
}

export async function renderConfiguredEmailTemplate(id: EmailTemplateId, variables: TemplateVariables) {
  const [templates, integrations] = await Promise.all([getAdminEmailTemplates(), getAdminIntegrationSettings()]);
  const senderEmail = integrations.senderEmail || process.env.DEFAULT_SENDER_EMAIL || "noreply@salehabbaas.com";
  const senderName = integrations.senderName || "Saleh Abbaas";
  const siteUrl = resolveSiteUrl();
  const logoFallback = `${siteUrl.replace(/\/$/, "")}/SA-Logo.png`;
  const logoUrl = normalizeUrl(process.env.EMAIL_LOGO_URL || logoFallback, logoFallback);

  return renderEmailTemplate(templates[id], {
    senderName,
    senderEmail,
    siteUrl,
    logoUrl,
    year: String(new Date().getUTCFullYear()),
    ...variables
  });
}
