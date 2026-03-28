export type PublicPagePath =
  | "/"
  | "/about"
  | "/ai-news"
  | "/experience"
  | "/projects"
  | "/services"
  | "/certificates"
  | "/blog"
  | "/creator"
  | "/public-statement"
  | "/book-meeting"
  | "/contact";

export type PageVisibilitySettings = Record<PublicPagePath, boolean>;

export type PublicPageSettingsItem = {
  path: PublicPagePath;
  enabled: boolean;
  name: string;
  description: string;
  link: string;
  menuOrder: number;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoImage: string;
};

export type PublicPageSettings = PublicPageSettingsItem[];

export type ManagedEmailProvider = "sendgrid" | "resend" | "mailgun" | "zoho" | "gmail";

export type EmailTemplateId =
  | "settingsTest"
  | "adminInvitation"
  | "resumeExport"
  | "contactSubmission"
  | "bookingConfirmation"
  | "bookingOwnerNotification"
  | "taskReminder24h"
  | "taskReminder1h"
  | "taskOverdueDigest";

export type EmailTemplateContent = {
  subject: string;
  html: string;
  text: string;
};

export type AdminEmailTemplates = Record<EmailTemplateId, EmailTemplateContent>;

export type EmailTemplateDefinition = {
  id: EmailTemplateId;
  label: string;
  description: string;
  placeholders: string[];
};

export type AdminIntegrationSettings = {
  emailProvider: ManagedEmailProvider;
  senderEmail: string;
  senderName: string;
  contactFunctionUrl: string;
  bookingFunctionUrl: string;
  googleCalendarId: string;
  geminiModel: string;
  geminiTextModel: string;
  telegramAllowedChatIds: string;
  telegramDefaultChatId: string;
  agentOwnerUid: string;
  telegramActionsEnabled: boolean;
  resumeStudioV2Enabled: boolean;
  resumeEditorV2Enabled: boolean;
  resumeAi53Enabled: boolean;
  resumeJobUrlParserEnabled: boolean;
  resumeAdvancedTemplateBuilderEnabled: boolean;
};

export type AdminSecretSettings = {
  resendApiKey: string;
  sendgridApiKey: string;
  mailgunApiKey: string;
  mailgunDomain: string;
  gmailAppPassword: string;
  zohoSmtpHost: string;
  zohoSmtpPort: string;
  zohoSmtpSecure: string;
  zohoSmtpUsername: string;
  zohoSmtpPassword: string;
  googleServiceAccountEmail: string;
  googleServiceAccountPrivateKey: string;
  geminiApiKey: string;
  googleApiKey: string;
  telegramBotToken: string;
  telegramWebhookSecret: string;
};

export type SecretPresence = Record<keyof AdminSecretSettings, boolean>;

export type HealthStatus = "healthy" | "degraded";

export type FeatureDependency = {
  key: string;
  label: string;
  configured: boolean;
};

export type AdminFeatureHealth = {
  feature: "email" | "contact" | "bookings" | "saleh-os" | "linkedin-studio";
  label: string;
  status: HealthStatus;
  missing: string[];
  dependencies: FeatureDependency[];
};

export type AdminHealthStatus = {
  status: HealthStatus;
  generatedAt: string;
  features: AdminFeatureHealth[];
};
