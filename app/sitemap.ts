import { MetadataRoute } from "next";

import { safeGetSitemapEntries } from "@/lib/firestore/public";
import { safeBlogPosts, safeProjects } from "@/lib/firestore/site-public";
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
    "/book-meeting",
    "/contact"
  ];

  const [creatorEntries, projects, blogPosts] = await Promise.all([
    safeGetSitemapEntries(),
    safeProjects({ publishedOnly: true }),
    safeBlogPosts({ publishedOnly: true })
  ]);

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

  const projectItems = projects.map((project) => ({
    url: resolveAbsoluteUrl(`/projects/${project.slug}`),
    lastModified: project.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.72
  }));

  const blogItems = blogPosts.map((post) => ({
    url: resolveAbsoluteUrl(`/knowledge/${post.slug}`),
    lastModified: post.updatedAt || post.publishedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7
  }));

  return [...staticItems, ...projectItems, ...blogItems, ...creatorItems];
}
