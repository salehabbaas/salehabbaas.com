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

export type ManagedEmailProvider = "sendgrid" | "resend" | "mailgun" | "zoho";

export type AdminIntegrationSettings = {
  emailProvider: ManagedEmailProvider;
  senderEmail: string;
  senderName: string;
  contactFunctionUrl: string;
  bookingFunctionUrl: string;
  googleCalendarId: string;
  geminiModel: string;
  geminiTextModel: string;
};

export type AdminSecretSettings = {
  resendApiKey: string;
  sendgridApiKey: string;
  mailgunApiKey: string;
  mailgunDomain: string;
  googleServiceAccountEmail: string;
  googleServiceAccountPrivateKey: string;
  geminiApiKey: string;
  googleApiKey: string;
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
