import { adminDb } from "../admin";

type TemplateId =
  | "contactSubmission"
  | "bookingConfirmation"
  | "bookingOwnerNotification"
  | "taskReminder24h"
  | "taskReminder1h"
  | "taskOverdueDigest";

type TemplateContent = {
  subject: string;
  html: string;
  text: string;
};
type QuickLink = { label: string; url: string };

const RAW_PATTERN = /{{{\s*([a-zA-Z0-9_]+)\s*}}}/g;
const ESCAPED_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
const CACHE_TTL_MS = 60_000;
const DEFAULT_SITE_URL = "https://salehabbaas.com";

const DEFAULT_TEMPLATES: Record<TemplateId, TemplateContent> = {
  contactSubmission: {
    subject: "New Contact Submission: {{subject}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">New contact submission</h2>
    <p style="margin:0 0 6px;"><strong>Name:</strong> {{name}}</p>
    <p style="margin:0 0 6px;"><strong>Email:</strong> {{email}}</p>
    <p style="margin:0 0 6px;"><strong>Subject:</strong> {{subject}}</p>
    <p style="margin:0 0 4px;"><strong>Message:</strong></p>
    <p style="margin:0;white-space:pre-wrap;">{{message}}</p>
  </div>
</div>`,
    text: "New contact submission\nName: {{name}}\nEmail: {{email}}\nSubject: {{subject}}\nMessage:\n{{message}}"
  },
  bookingConfirmation: {
    subject: "Your meeting with Saleh Abbaas is confirmed",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Meeting confirmed</h2>
    <p style="margin:0 0 8px;">Hi {{name}}, your {{meetingType}} is confirmed.</p>
    <p style="margin:0 0 6px;"><strong>When:</strong> {{startAt}} ({{timezone}})</p>
    <p style="margin:0;"><strong>Meet link:</strong> {{meetLink}}</p>
  </div>
</div>`,
    text: "Hi {{name}}, your {{meetingType}} is confirmed.\nWhen: {{startAt}} ({{timezone}})\nMeet link: {{meetLink}}"
  },
  bookingOwnerNotification: {
    subject: "New Booking: {{name}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">New booking confirmed</h2>
    <p style="margin:0 0 6px;"><strong>Meeting:</strong> {{meetingType}}</p>
    <p style="margin:0 0 6px;"><strong>When:</strong> {{startAt}} ({{timezone}})</p>
    <p style="margin:0 0 6px;"><strong>Name:</strong> {{name}}</p>
    <p style="margin:0 0 6px;"><strong>Email:</strong> {{email}}</p>
    <p style="margin:0 0 6px;"><strong>Reason:</strong> {{reason}}</p>
    <p style="margin:0;"><strong>Meet link:</strong> {{meetLink}}</p>
  </div>
</div>`,
    text: "New booking confirmed\nMeeting: {{meetingType}}\nWhen: {{startAt}} ({{timezone}})\nName: {{name}}\nEmail: {{email}}\nReason: {{reason}}\nMeet link: {{meetLink}}"
  },
  taskReminder24h: {
    subject: "Task due in 24h: {{taskTitle}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Task reminder (24h)</h2>
    <p style="margin:0 0 6px;"><strong>{{taskTitle}}</strong></p>
    <p style="margin:0 0 6px;"><strong>Due:</strong> {{dueLabel}}</p>
    <p style="margin:0 0 10px;white-space:pre-wrap;">{{taskDescription}}</p>
    <p style="margin:0;"><a href="{{taskUrl}}">Open task</a></p>
  </div>
</div>`,
    text: "{{taskTitle}}\nDue: {{dueLabel}}\n{{taskDescription}}\n{{taskUrl}}"
  },
  taskReminder1h: {
    subject: "Task due in 1h: {{taskTitle}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Task reminder (1h)</h2>
    <p style="margin:0 0 6px;"><strong>{{taskTitle}}</strong></p>
    <p style="margin:0 0 6px;"><strong>Due:</strong> {{dueLabel}}</p>
    <p style="margin:0 0 10px;white-space:pre-wrap;">{{taskDescription}}</p>
    <p style="margin:0;"><a href="{{taskUrl}}">Open task</a></p>
  </div>
</div>`,
    text: "{{taskTitle}}\nDue: {{dueLabel}}\n{{taskDescription}}\n{{taskUrl}}"
  },
  taskOverdueDigest: {
    subject: "Daily overdue tasks ({{taskCount}})",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Overdue task digest</h2>
    <p style="margin:0 0 10px;">You have <strong>{{taskCount}}</strong> overdue task(s).</p>
    <ul style="margin:0;padding-left:18px;">{{{overdueItemsHtml}}}</ul>
  </div>
</div>`,
    text: "Overdue tasks: {{taskCount}}\n{{overdueItemsText}}"
  }
};

let templateCache: { expiresAt: number; templates: Record<string, unknown> } | null = null;
let brandingCache: { expiresAt: number; context: Record<string, unknown> } | null = null;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function normalizeTemplate(input: unknown, fallback: TemplateContent): TemplateContent {
  if (!isObjectRecord(input)) return fallback;
  return {
    subject: asString(input.subject, fallback.subject),
    html: asString(input.html, fallback.html),
    text: asString(input.text, fallback.text)
  };
}

async function loadTemplatesSource() {
  const now = Date.now();
  if (templateCache && templateCache.expiresAt > now) return templateCache.templates;

  const snap = await adminDb.collection("adminSettings").doc("emailTemplates").get();
  const raw = (snap.data() ?? {}) as Record<string, unknown>;
  const templates = isObjectRecord(raw.templates) ? raw.templates : raw;

  templateCache = {
    expiresAt: now + CACHE_TTL_MS,
    templates
  };

  return templates;
}

function resolveSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.DEFAULT_SITE_URL || DEFAULT_SITE_URL;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return DEFAULT_SITE_URL;
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

function toAbsoluteUrl(pathOrUrl: string, siteUrl: string) {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return "";

  try {
    if (trimmed.startsWith("/")) {
      return new URL(trimmed, siteUrl).toString();
    }
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
    return "";
  } catch {
    return "";
  }
}

function getPrimaryAction(variables: Record<string, unknown>, siteUrl: string) {
  const label = toTemplateValue(variables.primaryActionLabel || "").trim();
  const rawUrl = toTemplateValue(variables.primaryActionUrl || "").trim();
  if (!label || !rawUrl) return null;

  const url = toAbsoluteUrl(rawUrl, siteUrl);
  if (!url) return null;

  return { label, url };
}

function getQuickLinks(variables: Record<string, unknown>, siteUrl: string): QuickLink[] {
  const raw = variables.quickLinks;
  if (!Array.isArray(raw)) return [];

  const links: QuickLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = toTemplateValue((item as { label?: unknown }).label).trim();
    const rawUrl = toTemplateValue((item as { url?: unknown }).url).trim();
    if (!label || !rawUrl) continue;

    const url = toAbsoluteUrl(rawUrl, siteUrl);
    if (!url) continue;
    links.push({ label, url });
    if (links.length >= 6) break;
  }

  return links;
}

function toTemplateValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function stripLegacyBodyShell(input: string) {
  const trimmed = input.trim();
  const legacyShellPattern =
    /^<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">\s*<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">([\s\S]*?)<\/div>\s*<\/div>$/i;
  const matched = trimmed.match(legacyShellPattern);
  return matched ? matched[1] : input;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBrandedHtml(bodyHtml: string, variables: Record<string, unknown>) {
  const moduleName = escapeHtml(toTemplateValue(variables.moduleName || "System"));
  const senderName = escapeHtml(toTemplateValue(variables.senderName || "Saleh Abbaas"));
  const senderEmail = escapeHtml(toTemplateValue(variables.senderEmail || "noreply@salehabbaas.com"));
  const year = escapeHtml(toTemplateValue(variables.year || String(new Date().getUTCFullYear())));
  const siteUrl = normalizeUrl(toTemplateValue(variables.siteUrl || DEFAULT_SITE_URL), DEFAULT_SITE_URL);
  const logoUrl = normalizeUrl(
    toTemplateValue(variables.logoUrl || `${siteUrl.replace(/\/$/, "")}/SA-Logo.png`),
    `${siteUrl.replace(/\/$/, "")}/SA-Logo.png`
  );
  const safeSiteUrl = escapeHtml(siteUrl);
  const safeLogoUrl = escapeHtml(logoUrl);
  const primaryAction = getPrimaryAction(variables, siteUrl);
  const quickLinks = getQuickLinks(variables, siteUrl);
  const normalizedBodyHtml = stripLegacyBodyShell(bodyHtml);
  const primaryActionHtml = primaryAction
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 14px;">
        <tr>
          <td>
            <a class="cta-button" href="${escapeHtml(primaryAction.url)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1D4ED8;color:#FFFFFF;text-decoration:none;font-size:14px;line-height:1;font-weight:700;">${escapeHtml(primaryAction.label)}</a>
          </td>
        </tr>
      </table>`
    : "";
  const quickLinksHtml = quickLinks.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 16px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:14px;">
        <tr>
          <td style="padding:12px 12px 10px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#1E3A8A;letter-spacing:0.06em;text-transform:uppercase;">Quick Links</p>
            <div>
        ${quickLinks
          .map(
            (link) =>
              `<a href="${escapeHtml(link.url)}" style="display:inline-block;margin:0 6px 6px 0;padding:7px 11px;border-radius:999px;border:1px solid #BFDBFE;background:#FFFFFF;color:#1D4ED8;text-decoration:none;font-size:12px;font-weight:600;">${escapeHtml(link.label)}</a>`
          )
          .join("")}
            </div>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell {
          width: 100% !important;
        }
        .email-body {
          padding: 18px 12px !important;
        }
        .content-pad {
          padding: 18px 14px !important;
        }
        .brand-row,
        .brand-left,
        .brand-right {
          display: block !important;
          width: 100% !important;
          text-align: left !important;
        }
        .brand-right {
          margin-top: 10px !important;
        }
        .cta-button {
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
          text-align: center !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#EAF1FF;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:linear-gradient(180deg,#EAF1FF 0%,#F8FAFF 45%,#F5F9FF 100%);">
      <tr>
        <td class="email-body" style="padding:28px 16px;">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" align="center" class="email-shell" style="width:680px;max-width:680px;border-collapse:separate;border-spacing:0;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #D7E5FF;box-shadow:0 14px 40px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:20px;background:linear-gradient(125deg,#0F172A 0%,#1D4ED8 50%,#0284C7 100%);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="brand-row">
                  <tr>
                    <td class="brand-left" style="vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="padding-right:12px;vertical-align:middle;">
                            <img src="${safeLogoUrl}" alt="Saleh Abbaas Logo" width="40" height="40" style="display:block;border-radius:10px;background:#FFFFFF;padding:4px;" />
                          </td>
                          <td style="vertical-align:middle;">
                            <p style="margin:0;font-family:Arial,sans-serif;font-size:16px;line-height:1.2;color:#FFFFFF;font-weight:700;">Saleh Abbaas</p>
                            <p style="margin:3px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.3;color:#DBEAFE;">Automated Email Module</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="brand-right" style="text-align:right;vertical-align:middle;">
                      <span style="display:inline-block;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,0.18);font-family:Arial,sans-serif;font-size:11px;line-height:1;color:#FFFFFF;font-weight:700;letter-spacing:0.05em;">${moduleName}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="content-pad" style="padding:24px 22px 20px;">
                ${primaryActionHtml}
                ${quickLinksHtml}
                <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0F172A;">
                  ${normalizedBodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #E2E8F0;background:#F8FAFC;padding:13px 22px 16px;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.4;color:#334155;"><strong>Sender:</strong> ${senderName} &lt;${senderEmail}&gt;</p>
                <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.4;color:#475569;"><strong>Module:</strong> ${moduleName}</p>
                <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:11px;line-height:1.4;color:#64748B;">${year} | <a href="${safeSiteUrl}" style="color:#1D4ED8;text-decoration:none;">${safeSiteUrl}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function loadBrandingContext() {
  const now = Date.now();
  if (brandingCache && brandingCache.expiresAt > now) return brandingCache.context;

  const siteUrl = resolveSiteUrl();
  const logoFallback = `${siteUrl.replace(/\/$/, "")}/SA-Logo.png`;
  const defaults = {
    moduleName: "System",
    senderName: "Saleh Abbaas",
    senderEmail: process.env.DEFAULT_SENDER_EMAIL || "noreply@salehabbaas.com",
    siteUrl,
    logoUrl: normalizeUrl(process.env.EMAIL_LOGO_URL || logoFallback, logoFallback),
    year: String(new Date().getUTCFullYear())
  };

  try {
    const [legacySnap, settingsSnap] = await Promise.all([
      adminDb.collection("siteContent").doc("integrations").get(),
      adminDb.collection("adminSettings").doc("integrations").get()
    ]);
    const legacyData = legacySnap.data() ?? {};
    const settingsData = settingsSnap.data() ?? {};
    const senderName = asString(settingsData.senderName ?? legacyData.senderName, defaults.senderName) || defaults.senderName;
    const senderEmail =
      asString(settingsData.senderEmail ?? legacyData.senderEmail, defaults.senderEmail) || defaults.senderEmail;

    const context = {
      ...defaults,
      senderName,
      senderEmail
    };

    brandingCache = {
      expiresAt: now + CACHE_TTL_MS,
      context
    };

    return context;
  } catch {
    return defaults;
  }
}

function interpolate(input: string, variables: Record<string, unknown>, mode: "html" | "text" | "subject") {
  const withRaw = input.replace(RAW_PATTERN, (_match, key: string) => toTemplateValue(variables[key]));

  return withRaw.replace(ESCAPED_PATTERN, (_match, key: string) => {
    const value = toTemplateValue(variables[key]);
    if (mode === "html") return escapeHtml(value);
    return value;
  });
}

export async function renderConfiguredEmailTemplate(id: TemplateId, variables: Record<string, unknown>) {
  const [source, branding] = await Promise.all([loadTemplatesSource(), loadBrandingContext()]);
  const template = normalizeTemplate(source[id], DEFAULT_TEMPLATES[id]);
  const baseVariables = { ...branding, ...variables };
  const subject = interpolate(template.subject, baseVariables, "subject");
  const bodyHtml = interpolate(template.html, baseVariables, "html");
  const textBody = interpolate(template.text, baseVariables, "text");
  const moduleName = toTemplateValue(baseVariables.moduleName || "System");
  const senderName = toTemplateValue(baseVariables.senderName || "Saleh Abbaas");
  const senderEmail = toTemplateValue(baseVariables.senderEmail || "noreply@salehabbaas.com");
  const siteUrl = toTemplateValue(baseVariables.siteUrl || DEFAULT_SITE_URL);
  const primaryAction = getPrimaryAction(baseVariables, siteUrl);
  const quickLinks = getQuickLinks(baseVariables, siteUrl);
  const primaryActionText = primaryAction ? `\nAction: ${primaryAction.label} - ${primaryAction.url}` : "";
  const quickLinksText = quickLinks.length
    ? `\nQuick Links:\n${quickLinks.map((link) => `- ${link.label}: ${link.url}`).join("\n")}`
    : "";

  return {
    subject,
    html: buildBrandedHtml(bodyHtml, baseVariables),
    text: `${textBody}${primaryActionText}${quickLinksText}\n\n---\nModule: ${moduleName}\nSender: ${senderName} <${senderEmail}>\nWebsite: ${siteUrl}`
  };
}
