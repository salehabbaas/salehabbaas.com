import type { AdminIntegrationSettings, AdminSecretSettings, SecretPresence } from "@/types/site-settings";
import type { SecretSource } from "@/lib/admin/integration-secrets";
import { SECRET_DEFINITIONS, hasConfiguredText } from "@/lib/admin/integration-secrets";

export type IntegrationSectionId = "email" | "runtime" | "ai" | "telegram" | "resume" | "secrets";

export type IntegrationSectionDependency = {
  id: string;
  label: string;
  configured: boolean;
  source?: SecretSource;
};

export type IntegrationSectionStatus = {
  id: IntegrationSectionId;
  title: string;
  description: string;
  configuredCount: number;
  totalCount: number;
  status: "configured" | "partial" | "missing";
  dependencies: IntegrationSectionDependency[];
};

type SecretSourceMap = Record<keyof AdminSecretSettings, SecretSource>;

function toStatus(configuredCount: number, totalCount: number): IntegrationSectionStatus["status"] {
  if (configuredCount <= 0) return "missing";
  if (configuredCount >= totalCount) return "configured";
  return "partial";
}

function countConfigured(dependencies: IntegrationSectionDependency[]) {
  return dependencies.filter((item) => item.configured).length;
}

function secretDependency(
  key: keyof AdminSecretSettings,
  presence: SecretPresence,
  sources: SecretSourceMap
): IntegrationSectionDependency {
  const definition = SECRET_DEFINITIONS.find((item) => item.key === key);
  return {
    id: key,
    label: definition?.label ?? key,
    configured: presence[key],
    source: sources[key]
  };
}

function providerSecretKeys(provider: AdminIntegrationSettings["emailProvider"]): Array<keyof AdminSecretSettings> {
  if (provider === "sendgrid") return ["sendgridApiKey"];
  if (provider === "mailgun") return ["mailgunApiKey", "mailgunDomain"];
  if (provider === "gmail") return ["gmailAppPassword"];
  if (provider === "zoho") {
    return ["zohoSmtpHost", "zohoSmtpPort", "zohoSmtpSecure", "zohoSmtpUsername", "zohoSmtpPassword"];
  }
  return ["resendApiKey"];
}

export function buildIntegrationSectionStatuses(
  integrations: AdminIntegrationSettings,
  presence: SecretPresence,
  secretSources: SecretSourceMap
): IntegrationSectionStatus[] {
  const emailDependencies: IntegrationSectionDependency[] = [
    { id: "senderEmail", label: "Sender Email", configured: hasConfiguredText(integrations.senderEmail) },
    { id: "senderName", label: "Sender Name", configured: hasConfiguredText(integrations.senderName) },
    ...providerSecretKeys(integrations.emailProvider).map((key) => secretDependency(key, presence, secretSources))
  ];

  const runtimeDependencies: IntegrationSectionDependency[] = [
    { id: "contactFunctionUrl", label: "Contact Function URL", configured: hasConfiguredText(integrations.contactFunctionUrl) },
    { id: "bookingFunctionUrl", label: "Booking Function URL", configured: hasConfiguredText(integrations.bookingFunctionUrl) },
    { id: "googleCalendarId", label: "Google Calendar ID", configured: hasConfiguredText(integrations.googleCalendarId) },
    secretDependency("googleServiceAccountEmail", presence, secretSources),
    secretDependency("googleServiceAccountPrivateKey", presence, secretSources)
  ];

  const aiDependencies: IntegrationSectionDependency[] = [
    { id: "geminiModel", label: "Gemini Model", configured: hasConfiguredText(integrations.geminiModel) },
    {
      id: "geminiTextModel",
      label: "Gemini Text Model",
      configured: hasConfiguredText(integrations.geminiTextModel) || hasConfiguredText(integrations.geminiModel)
    },
    {
      id: "geminiApiKey",
      label: "Gemini/Google API Key",
      configured: presence.geminiApiKey || presence.googleApiKey,
      source: presence.geminiApiKey ? secretSources.geminiApiKey : secretSources.googleApiKey
    }
  ];

  const telegramDependencies: IntegrationSectionDependency[] = [
    { id: "telegramDefaultChatId", label: "Telegram Default Chat ID", configured: hasConfiguredText(integrations.telegramDefaultChatId) },
    secretDependency("telegramBotToken", presence, secretSources),
    secretDependency("telegramWebhookSecret", presence, secretSources)
  ];

  const resumeDependencies: IntegrationSectionDependency[] = [
    { id: "resumeStudioV2Enabled", label: "Resume Studio v2", configured: integrations.resumeStudioV2Enabled },
    { id: "resumeAi53Enabled", label: "GPT-5.3 defaults", configured: integrations.resumeAi53Enabled },
    { id: "resumeJobUrlParserEnabled", label: "JD URL parser", configured: integrations.resumeJobUrlParserEnabled },
    {
      id: "resumeAdvancedTemplateBuilderEnabled",
      label: "Advanced template builder",
      configured: integrations.resumeAdvancedTemplateBuilderEnabled
    }
  ];

  const secretDependencies = SECRET_DEFINITIONS.map((definition) =>
    secretDependency(definition.key, presence, secretSources)
  );

  const sections = [
    {
      id: "email",
      title: "Email Delivery",
      description: `Provider: ${integrations.emailProvider}`,
      dependencies: emailDependencies
    },
    {
      id: "runtime",
      title: "Runtime Endpoints",
      description: "Contact and booking function runtime config",
      dependencies: runtimeDependencies
    },
    {
      id: "ai",
      title: "AI Runtime",
      description: "Gemini models and API credentials",
      dependencies: aiDependencies
    },
    {
      id: "telegram",
      title: "Telegram Agent",
      description: "Bot auth and runtime routing",
      dependencies: telegramDependencies
    },
    {
      id: "resume",
      title: "Resume Studio Flags",
      description: "Enable feature flags by capability",
      dependencies: resumeDependencies
    },
    {
      id: "secrets",
      title: "Secret Vault",
      description: "All stored/env secret keys",
      dependencies: secretDependencies
    }
  ] as const;

  return sections.map((section) => {
    const configuredCount = countConfigured(section.dependencies);
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      configuredCount,
      totalCount: section.dependencies.length,
      status: toStatus(configuredCount, section.dependencies.length),
      dependencies: section.dependencies
    };
  });
}
