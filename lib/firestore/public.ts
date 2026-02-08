import { ContentVariant } from "@/types/creator";
import {
  getCreatorPillarSummary,
  getCreatorSettings,
  getCreatorVariantBySlug,
  getFeaturedCreatorContent,
  getPublicCreatorFeed,
  getPublicCreatorTop,
  getRelatedCreatorContent,
  getCreatorSitemapEntries
} from "@/lib/firestore/creator";

export async function safeGetPublicTop(limit = 3): Promise<ContentVariant[]> {
  try {
    return await getPublicCreatorTop(limit);
  } catch {
    return [];
  }
}

export async function safeGetFeatured(limit = 3): Promise<ContentVariant[]> {
  try {
    return await getFeaturedCreatorContent(limit);
  } catch {
    return [];
  }
}

export async function safeGetCreatorFeed(options: {
  page: number;
  pageSize: number;
  pillar?: string;
  platform?: string;
  type?: string;
}) {
  try {
    return await getPublicCreatorFeed(options);
  } catch {
    return {
      items: [] as ContentVariant[],
      total: 0,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: 1
    };
  }
}

export async function safeGetCreatorSettings() {
  try {
    return await getCreatorSettings();
  } catch {
    return {
      pillars: ["AI", "HealthTech", "Software", "Cloud", "Cybersecurity", "Career", "Other"],
      platforms: ["linkedin", "youtube", "instagram", "tiktok", "x"],
      pinnedVariantSlugs: [],
      newsletterEnabled: true,
      defaultVisibility: "private",
      socialLinks: [
        { label: "LinkedIn", url: "https://linkedin.com/in/salehabbaas" },
        { label: "YouTube", url: "https://youtube.com/@salehabbaas" },
        { label: "Instagram", url: "https://instagram.com/salehabbaas" },
        { label: "TikTok", url: "https://tiktok.com/@salehabbaas" },
        { label: "X", url: "https://x.com/salehabbaas" }
      ]
    };
  }
}

export async function safeGetCreatorBySlug(slug: string) {
  try {
    return await getCreatorVariantBySlug(slug);
  } catch {
    return null;
  }
}

export async function safeGetRelatedContent(options: { currentSlug: string; pillar: string; tags: string[]; limit?: number }) {
  try {
    return await getRelatedCreatorContent(options);
  } catch {
    return [];
  }
}

export async function safeGetPillars(limit = 30) {
  try {
    return await getCreatorPillarSummary(limit);
  } catch {
    return [];
  }
}

export async function safeGetSitemapEntries() {
  try {
    return await getCreatorSitemapEntries();
  } catch {
    return [];
  }
}
