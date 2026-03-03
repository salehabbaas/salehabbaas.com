import type { AdminSecretSettings, SecretPresence } from "@/types/site-settings";

export type SecretSource = "runtime" | "environment" | "both" | "missing";

export type SecretDefinition = {
  key: keyof AdminSecretSettings;
  label: string;
  envKey: string;
  sensitive: boolean;
};

export const SECRET_DEFINITIONS: SecretDefinition[] = [
  { key: "resendApiKey", label: "Resend API Key", envKey: "RESEND_API_KEY", sensitive: true },
  { key: "sendgridApiKey", label: "SendGrid API Key", envKey: "SENDGRID_API_KEY", sensitive: true },
  { key: "mailgunApiKey", label: "Mailgun API Key", envKey: "MAILGUN_API_KEY", sensitive: true },
  { key: "mailgunDomain", label: "Mailgun Domain", envKey: "MAILGUN_DOMAIN", sensitive: false },
  { key: "gmailAppPassword", label: "Gmail App Password", envKey: "GMAIL_APP_PASSWORD", sensitive: true },
  { key: "zohoSmtpHost", label: "Zoho SMTP Host", envKey: "ZOHO_SMTP_HOST", sensitive: false },
  { key: "zohoSmtpPort", label: "Zoho SMTP Port", envKey: "ZOHO_SMTP_PORT", sensitive: false },
  { key: "zohoSmtpSecure", label: "Zoho SMTP Secure", envKey: "ZOHO_SMTP_SECURE", sensitive: false },
  { key: "zohoSmtpUsername", label: "Zoho SMTP Username", envKey: "ZOHO_SMTP_USERNAME", sensitive: false },
  { key: "zohoSmtpPassword", label: "Zoho SMTP Password", envKey: "ZOHO_SMTP_PASSWORD", sensitive: true },
  {
    key: "googleServiceAccountEmail",
    label: "Google Service Account Email",
    envKey: "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    sensitive: false
  },
  {
    key: "googleServiceAccountPrivateKey",
    label: "Google Service Account Private Key",
    envKey: "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    sensitive: true
  },
  { key: "geminiApiKey", label: "Gemini API Key", envKey: "GEMINI_API_KEY", sensitive: true },
  { key: "googleApiKey", label: "Google API Key", envKey: "GOOGLE_API_KEY", sensitive: true },
  { key: "telegramBotToken", label: "Telegram Bot Token", envKey: "TELEGRAM_BOT_TOKEN", sensitive: true },
  {
    key: "telegramWebhookSecret",
    label: "Telegram Webhook Secret",
    envKey: "TELEGRAM_WEBHOOK_SECRET",
    sensitive: true
  }
];

export function hasConfiguredText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function getSecretSourceMap(
  settings: AdminSecretSettings,
  env: Record<string, string | undefined>
): Record<keyof AdminSecretSettings, SecretSource> {
  const sourceMap = {} as Record<keyof AdminSecretSettings, SecretSource>;

  for (const definition of SECRET_DEFINITIONS) {
    const runtimeConfigured = hasConfiguredText(settings[definition.key]);
    const envConfigured = hasConfiguredText(env[definition.envKey]);

    if (runtimeConfigured && envConfigured) {
      sourceMap[definition.key] = "both";
    } else if (runtimeConfigured) {
      sourceMap[definition.key] = "runtime";
    } else if (envConfigured) {
      sourceMap[definition.key] = "environment";
    } else {
      sourceMap[definition.key] = "missing";
    }
  }

  return sourceMap;
}

export function getSecretPresenceFromSettings(
  settings: AdminSecretSettings,
  env: Record<string, string | undefined>
): SecretPresence {
  const sourceMap = getSecretSourceMap(settings, env);
  const presence = {} as SecretPresence;

  for (const definition of SECRET_DEFINITIONS) {
    presence[definition.key] = sourceMap[definition.key] !== "missing";
  }

  return presence;
}
