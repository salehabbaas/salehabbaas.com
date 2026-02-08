export interface ProfileContent {
  name: string;
  headline: string;
  bio: string;
  location?: string;
  email?: string;
  resumeUrl?: string;
  avatarUrl?: string;
}

export interface ExperienceContent {
  id: string;
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  summary: string;
  achievements: string[];
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectContent {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription?: string;
  tags: string[];
  coverImage?: string;
  projectUrl?: string;
  status: "draft" | "published";
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceContent {
  id: string;
  title: string;
  detail: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CertificateContent {
  id: string;
  title: string;
  issuer: string;
  year?: string;
  credentialUrl?: string;
  imageUrl?: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SocialLinkContent {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type BlogStatus = "draft" | "published";

export interface BlogPostContent {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  coverImage?: string;
  status: BlogStatus;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  seoTitle?: string;
  seoDesc?: string;
}

export interface SeoDefaults {
  titleTemplate: string;
  defaultDescription: string;
  defaultOgImage?: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  path: string;
  contentType?: string;
  size?: number;
  createdAt?: string;
}

export interface IntegrationSettings {
  emailProvider: "sendgrid" | "resend" | "mailgun" | "zoho";
  senderEmail: string;
  senderName: string;
  sendgridApiKeyPlaceholder?: string;
  resendApiKeyPlaceholder?: string;
  mailgunApiKeyPlaceholder?: string;
  mailgunDomainPlaceholder?: string;
  zohoEnabled: boolean;
  zohoClientIdPlaceholder?: string;
  zohoClientSecretPlaceholder?: string;
  zohoRedirectUriPlaceholder?: string;
}
