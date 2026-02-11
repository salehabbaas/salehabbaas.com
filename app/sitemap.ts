import { MetadataRoute } from "next";

import { safeGetSitemapEntries } from "@/lib/firestore/public";
import { safeBlogPosts, safeProjects } from "@/lib/firestore/site-public";
import { resolveAbsoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: Array<{
    path: string;
    changeFrequency: "daily" | "weekly" | "monthly";
    priority: number;
  }> = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/ai-news", changeFrequency: "daily", priority: 0.82 },
    { path: "/about", changeFrequency: "weekly", priority: 0.8 },
    { path: "/experience", changeFrequency: "weekly", priority: 0.8 },
    { path: "/projects", changeFrequency: "weekly", priority: 0.8 },
    { path: "/services", changeFrequency: "weekly", priority: 0.8 },
    { path: "/certificates", changeFrequency: "monthly", priority: 0.74 },
    { path: "/knowledge", changeFrequency: "daily", priority: 0.8 },
    { path: "/creator", changeFrequency: "daily", priority: 0.82 },
    { path: "/book-meeting", changeFrequency: "weekly", priority: 0.78 },
    { path: "/contact", changeFrequency: "weekly", priority: 0.78 },
    { path: "/blog/rss.xml", changeFrequency: "daily", priority: 0.5 },
    { path: "/creator/rss.xml", changeFrequency: "daily", priority: 0.5 },
    { path: "/llms.txt", changeFrequency: "weekly", priority: 0.5 }
  ];

  const [creatorEntries, projects, blogPosts] = await Promise.all([
    safeGetSitemapEntries(),
    safeProjects({ publishedOnly: true }),
    safeBlogPosts({ publishedOnly: true })
  ]);

  const now = new Date();
  const toLastModified = (value: string | null | undefined) => value || undefined;

  const staticItems = staticRoutes.map((route) => ({
    url: resolveAbsoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));

  const creatorItems = creatorEntries.map((entry) => ({
    url: resolveAbsoluteUrl(`/creator/${entry.slug}`),
    lastModified: toLastModified(entry.updatedAt || entry.publishedAt),
    changeFrequency: "weekly" as const,
    priority: 0.7
  }));

  const projectItems = projects.map((project) => ({
    url: resolveAbsoluteUrl(`/projects/${project.slug}`),
    lastModified: toLastModified(project.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.72
  }));

  const blogItems = blogPosts.map((post) => ({
    url: resolveAbsoluteUrl(`/knowledge/${post.slug}`),
    lastModified: toLastModified(post.updatedAt || post.publishedAt),
    changeFrequency: "weekly" as const,
    priority: 0.7
  }));

  return [...staticItems, ...projectItems, ...blogItems, ...creatorItems];
}
