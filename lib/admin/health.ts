import "server-only";

import type { AdminFeatureHealth, AdminHealthStatus, FeatureDependency } from "@/types/site-settings";
import { getAdminIntegrationSettings, getAdminSecretSettings } from "@/lib/firestore/admin-settings";

function hasText(value: string | undefined | null) {
  return Boolean(value && value.trim());
}

function buildFeature(
  feature: AdminFeatureHealth["feature"],
  label: string,
  dependencies: FeatureDependency[]
): AdminFeatureHealth {
  const missing = dependencies.filter((item) => !item.configured).map((item) => item.label);
  return {
    feature,
    label,
    status: missing.length ? "degraded" : "healthy",
    missing,
    dependencies
  };
}

function withFallback(primary: string, envValue?: string | null) {
  return hasText(primary) || hasText(envValue ?? "");
}

export async function getAdminHealthStatus(): Promise<AdminHealthStatus> {
  const [{ integrations, secrets }, env] = await Promise.all([
    (async () => {
      const [integrations, secrets] = await Promise.all([getAdminIntegrationSettings(), getAdminSecretSettings()]);
      return { integrations, secrets };
    })(),
    Promise.resolve(process.env)
  ]);

  const emailProvider = integrations.emailProvider;
  const providerDeps: FeatureDependency[] =
    emailProvider === "sendgrid"
      ? [{ key: "sendgridApiKey", label: "SendGrid API Key", configured: withFallback(secrets.sendgridApiKey, env.SENDGRID_API_KEY) }]
      : emailProvider === "mailgun"
        ? [
            { key: "mailgunApiKey", label: "Mailgun API Key", configured: withFallback(secrets.mailgunApiKey, env.MAILGUN_API_KEY) },
            { key: "mailgunDomain", label: "Mailgun Domain", configured: withFallback(secrets.mailgunDomain, env.MAILGUN_DOMAIN) }
          ]
        : emailProvider === "zoho"
          ? [
              {
                key: "zohoReserved",
                label: "Zoho provider currently unavailable",
                configured: false
              }
            ]
          : [{ key: "resendApiKey", label: "Resend API Key", configured: withFallback(secrets.resendApiKey, env.RESEND_API_KEY) }];

  const features: AdminFeatureHealth[] = [
    buildFeature("email", "Email Delivery", [
      {
        key: "senderEmail",
        label: "Sender Email",
        configured: withFallback(integrations.senderEmail, env.DEFAULT_SENDER_EMAIL)
      },
      ...providerDeps
    ]),
    buildFeature("contact", "Contact Pipeline", [
      {
        key: "contactFunctionUrl",
        label: "Contact Function URL",
        configured: withFallback(integrations.contactFunctionUrl, env.CONTACT_FUNCTION_URL)
      }
    ]),
    buildFeature("bookings", "Bookings Integrations", [
      {
        key: "bookingFunctionUrl",
        label: "Booking Function URL",
        configured: withFallback(integrations.bookingFunctionUrl, env.BOOK_MEETING_FUNCTION_URL)
      },
      {
        key: "googleServiceAccountEmail",
        label: "Google Service Account Email",
        configured: withFallback(secrets.googleServiceAccountEmail, env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
      },
      {
        key: "googleServiceAccountPrivateKey",
        label: "Google Service Account Private Key",
        configured: withFallback(secrets.googleServiceAccountPrivateKey, env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
      },
      {
        key: "googleCalendarId",
        label: "Google Calendar ID",
        configured: withFallback(integrations.googleCalendarId, env.GOOGLE_CALENDAR_ID)
      }
    ]),
    buildFeature("saleh-os", "Saleh-OS AI", [
      {
        key: "geminiApiKey",
        label: "Gemini/Google API Key",
        configured:
          withFallback(secrets.geminiApiKey, env.GEMINI_API_KEY) ||
          withFallback(secrets.googleApiKey, env.GOOGLE_API_KEY)
      },
      {
        key: "geminiModel",
        label: "Gemini Model",
        configured: withFallback(integrations.geminiModel, env.GEMINI_MODEL)
      }
    ]),
    buildFeature("linkedin-studio", "LinkedIn Studio AI", [
      {
        key: "geminiApiKey",
        label: "Gemini/Google API Key",
        configured:
          withFallback(secrets.geminiApiKey, env.GEMINI_API_KEY) ||
          withFallback(secrets.googleApiKey, env.GOOGLE_API_KEY)
      },
      {
        key: "geminiTextModel",
        label: "Gemini Text Model",
        configured: withFallback(integrations.geminiTextModel || integrations.geminiModel, env.GEMINI_TEXT_MODEL || env.GEMINI_MODEL)
      }
    ])
  ];

  const degraded = features.some((feature) => feature.status === "degraded");

  return {
    status: degraded ? "degraded" : "healthy",
    generatedAt: new Date().toISOString(),
    features
  };
}
