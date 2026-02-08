import { MetadataRoute } from "next";

import { safeGetSitemapEntries } from "@/lib/firestore/public";
import { resolveAbsoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "/",
    "/about",
    "/experience",
    "/projects",
    "/services",
    "/certificates",
    "/knowledge",
    "/creator",
    "/contact"
  ];

  const creatorEntries = await safeGetSitemapEntries();

  const staticItems = staticRoutes.map((path) => ({
    url: resolveAbsoluteUrl(path),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.75
  }));

  const creatorItems = creatorEntries.map((entry) => ({
    url: resolveAbsoluteUrl(`/creator/${entry.slug}`),
    lastModified: entry.updatedAt || entry.publishedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7
  }));

  return [...staticItems, ...creatorItems];
}
