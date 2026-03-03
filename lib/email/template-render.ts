import type { EmailTemplateContent } from "@/types/site-settings";

type TemplateVariables = Record<string, unknown>;
type QuickLink = { label: string; url: string };

const RAW_PATTERN = /{{{\s*([a-zA-Z0-9_]+)\s*}}}/g;
const ESCAPED_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

function toTemplateString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeUrl(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
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

function getPrimaryAction(variables: TemplateVariables, siteUrl: string) {
  const label = toTemplateString(variables.primaryActionLabel || "").trim();
  const rawUrl = toTemplateString(variables.primaryActionUrl || "").trim();
  if (!label || !rawUrl) return null;

  const url = toAbsoluteUrl(rawUrl, siteUrl);
  if (!url) return null;

  return { label, url };
}

function getQuickLinks(variables: TemplateVariables, siteUrl: string): QuickLink[] {
  const raw = variables.quickLinks;
  if (!Array.isArray(raw)) return [];

  const links: QuickLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = toTemplateString((item as { label?: unknown }).label).trim();
    const rawUrl = toTemplateString((item as { url?: unknown }).url).trim();
    if (!label || !rawUrl) continue;

    const url = toAbsoluteUrl(rawUrl, siteUrl);
    if (!url) continue;
    links.push({ label, url });
    if (links.length >= 6) break;
  }

  return links;
}

function stripLegacyBodyShell(input: string) {
  const trimmed = input.trim();
  const legacyShellPattern =
    /^<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">\s*<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">([\s\S]*?)<\/div>\s*<\/div>$/i;
  const matched = trimmed.match(legacyShellPattern);
  return matched ? matched[1] : input;
}

function buildBrandedHtml(bodyHtml: string, variables: TemplateVariables) {
  const moduleName = escapeHtml(toTemplateString(variables.moduleName || "System"));
  const senderName = escapeHtml(toTemplateString(variables.senderName || "Saleh Abbaas"));
  const senderEmail = escapeHtml(toTemplateString(variables.senderEmail || "noreply@salehabbaas.com"));
  const year = escapeHtml(toTemplateString(variables.year || String(new Date().getUTCFullYear())));
  const siteUrl = normalizeUrl(toTemplateString(variables.siteUrl || "https://salehabbaas.com"), "https://salehabbaas.com");
  const logoUrl = normalizeUrl(toTemplateString(variables.logoUrl || `${siteUrl.replace(/\/$/, "")}/SA-Logo.png`), `${siteUrl.replace(/\/$/, "")}/SA-Logo.png`);
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

function interpolate(input: string, variables: TemplateVariables, mode: "html" | "text" | "subject") {
  const withRaw = input.replaceAll(RAW_PATTERN, (_match, key: string) => toTemplateString(variables[key]));

  return withRaw.replaceAll(ESCAPED_PATTERN, (_match, key: string) => {
    const value = toTemplateString(variables[key]);
    if (mode === "html") return escapeHtml(value);
    return value;
  });
}

export function wrapBrandedEmailHtml(bodyHtml: string, variables: TemplateVariables) {
  const baseVariables: TemplateVariables = {
    moduleName: "System",
    senderName: "Saleh Abbaas",
    senderEmail: "noreply@salehabbaas.com",
    siteUrl: "https://salehabbaas.com",
    logoUrl: "https://salehabbaas.com/SA-Logo.png",
    year: String(new Date().getUTCFullYear()),
    ...variables
  };
  return buildBrandedHtml(bodyHtml, baseVariables);
}

export function renderEmailTemplate(template: EmailTemplateContent, variables: TemplateVariables) {
  const baseVariables: TemplateVariables = {
    moduleName: "System",
    senderName: "Saleh Abbaas",
    senderEmail: "noreply@salehabbaas.com",
    siteUrl: "https://salehabbaas.com",
    logoUrl: "https://salehabbaas.com/SA-Logo.png",
    year: String(new Date().getUTCFullYear()),
    ...variables
  };

  const subject = interpolate(template.subject, baseVariables, "subject");
  const bodyHtml = interpolate(template.html, baseVariables, "html");
  const textBody = interpolate(template.text, baseVariables, "text");
  const moduleName = toTemplateString(baseVariables.moduleName || "System");
  const senderName = toTemplateString(baseVariables.senderName || "Saleh Abbaas");
  const senderEmail = toTemplateString(baseVariables.senderEmail || "noreply@salehabbaas.com");
  const siteUrl = toTemplateString(baseVariables.siteUrl || "https://salehabbaas.com");
  const primaryAction = getPrimaryAction(baseVariables, siteUrl);
  const quickLinks = getQuickLinks(baseVariables, siteUrl);
  const primaryActionText = primaryAction ? `\nAction: ${primaryAction.label} - ${primaryAction.url}` : "";
  const quickLinksText = quickLinks.length
    ? `\nQuick Links:\n${quickLinks.map((link) => `- ${link.label}: ${link.url}`).join("\n")}`
    : "";

  return {
    subject,
    html: wrapBrandedEmailHtml(bodyHtml, baseVariables),
    text: `${textBody}${primaryActionText}${quickLinksText}\n\n---\nModule: ${moduleName}\nSender: ${senderName} <${senderEmail}>\nWebsite: ${siteUrl}`
  };
}
