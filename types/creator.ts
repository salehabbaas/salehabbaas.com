export type ContentStatus = "idea" | "draft" | "ready" | "scheduled" | "published";
export type ContentType = "short_video" | "carousel" | "post" | "thread" | "article";
export type Platform = "linkedin" | "youtube" | "instagram" | "tiktok" | "x";
export type Visibility = "private" | "unlisted" | "public";
export type TopicPillar = "AI" | "HealthTech" | "Software" | "Cloud" | "Cybersecurity" | "Career" | "Other";

export interface ContentItem {
  id: string;
  title: string;
  pillar: TopicPillar;
  type: ContentType;
  status: ContentStatus;
  notes?: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentVariant {
  id: string;
  contentItemId: string;
  contentTitle: string;
  contentType: ContentType;
  platform: Platform;
  slug: string;
  visibility: Visibility;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  media: string[];
  scheduledAt?: string | null;
  publishedAt?: string | null;
  externalUrl?: string;
  seoTitle?: string;
  seoDesc?: string;
  ogImage?: string;
  pillar: string;
  tags: string[];
  metrics?: VariantMetrics;
  createdAt?: string;
  updatedAt?: string;
}

export interface VariantMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  watchTime?: number;
  followersGained?: number;
  recordedAt?: string;
}

export interface CreatorSettings {
  pillars: string[];
  platforms: Platform[];
  pinnedVariantSlugs: string[];
  newsletterEnabled: boolean;
  defaultVisibility: Visibility;
  socialLinks: { label: string; url: string }[];
}

export interface CreatorTemplate {
  id: string;
  name: string;
  platform: Platform;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
}
