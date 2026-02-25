import "server-only";

import { getAdminHealthStatus } from "@/lib/admin/health";
import { getPublicPageSettings } from "@/lib/firestore/admin-settings";
import { adminDb } from "@/lib/firebase/admin";
import { getRemoteFeatureFlags } from "@/lib/firebase/remote-config";
import type { AdminHealthStatus } from "@/types/site-settings";

type StatusBreakdown = {
  total: number;
  published: number;
  hidden: number;
  draft: number;
};

type DistributionRow = {
  label: string;
  count: number;
};

type AuditActivityRow = {
  id: string;
  module: string;
  action: string;
  summary: string;
  actorEmail: string;
  createdAt: string;
};

type FeatureFlagRow = {
  key: "bookingEnabled" | "pipelineStoryEnabled" | "featuredCarouselEnabled" | "experienceStoryEnabled";
  label: string;
  enabled: boolean;
  source: "remote-config" | "firestore";
};

export type AdminSystemsSummary = {
  generatedAt: string;
  health: AdminHealthStatus;
  healthCounts: {
    healthy: number;
    degraded: number;
  };
  moduleTotals: {
    tracked: number;
    activeCollections: number;
  };
  cms: {
    projects: StatusBreakdown;
    blog: StatusBreakdown;
    experiences: StatusBreakdown;
    services: StatusBreakdown;
    certificates: StatusBreakdown;
    socialLinks: StatusBreakdown;
    mediaAssets: number;
  };
  creator: {
    contentItems: number;
    variantsTotal: number;
    publicVariants: number;
    unlistedVariants: number;
    privateVariants: number;
    byPlatform: Array<{ platform: string; count: number }>;
  };
  linkedin: {
    total: number;
    drafts: number;
    scheduled: number;
    published: number;
    lastActivityAt: string;
  };
  jobs: {
    total: number;
    offers: number;
    interviews: number;
    noResponse: number;
    byResponse: DistributionRow[];
    byStage: DistributionRow[];
  };
  bookings: {
    total: number;
    upcoming: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  };
  settings: {
    totalPages: number;
    enabledPages: number;
    hiddenPages: number;
    featureFlags: FeatureFlagRow[];
  };
  auditing: {
    actions7d: number;
    actions30d: number;
    topModules: Array<{ module: string; count: number }>;
    recent: AuditActivityRow[];
  };
  versioning: {
    totalSnapshots: number;
    latestSnapshotAt: string;
  };
};

function asIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}

function safeDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatus(value: unknown, fallback: "published" | "draft"): "published" | "hidden" | "draft" {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "published") return "published";
  if (status === "hidden") return "hidden";
  if (status === "draft") return "draft";
  return fallback;
}

function toStatusBreakdown(
  docs: Array<{ data: () => Record<string, unknown> }>,
  options?: { fallback?: "published" | "draft" }
): StatusBreakdown {
  const fallback = options?.fallback ?? "published";
  const activeRows = docs.filter((doc) => doc.data().isDeleted !== true);

  return activeRows.reduce(
    (acc, doc) => {
      const status = normalizeStatus(doc.data().status, fallback);
      acc.total += 1;
      if (status === "published") acc.published += 1;
      if (status === "hidden") acc.hidden += 1;
      if (status === "draft") acc.draft += 1;
      return acc;
    },
    { total: 0, published: 0, hidden: 0, draft: 0 } satisfies StatusBreakdown
  );
}

function toDistributionRows(counter: Map<string, number>, max = 8): DistributionRow[] {
  return Array.from(counter.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

function latestIso(...values: string[]) {
  return values.reduce((latest, current) => {
    if (!current) return latest;
    if (!latest) return current;
    return current > latest ? current : latest;
  }, "");
}

export async function getAdminSystemsSummary(): Promise<AdminSystemsSummary> {
  const now = new Date();
  const last7d = new Date(now);
  last7d.setDate(last7d.getDate() - 7);
  const last30d = new Date(now);
  last30d.setDate(last30d.getDate() - 30);

  const [
    health,
    pageSettings,
    remoteFlags,
    projectsSnap,
    blogSnap,
    experiencesSnap,
    servicesSnap,
    certificatesSnap,
    socialLinksSnap,
    mediaAssetsSnap,
    contentItemsSnap,
    variantsSnap,
    linkedinPostsSnap,
    jobsSnap,
    bookingsSnap,
    bookingSettingsSnap,
    siteFlagsSnap,
    auditsRecentSnap,
    audits30dSnap,
    snapshotsCountSnap,
    latestSnapshotSnap
  ] = await Promise.all([
    getAdminHealthStatus(),
    getPublicPageSettings(),
    getRemoteFeatureFlags(),
    adminDb.collection("projects").where("status", "in", ["draft", "published", "hidden"]).get(),
    adminDb.collection("blogPosts").get(),
    adminDb.collection("experiences").get(),
    adminDb.collection("services").get(),
    adminDb.collection("certificates").get(),
    adminDb.collection("socialLinks").get(),
    adminDb.collection("mediaAssets").get(),
    adminDb.collection("contentItems").get(),
    adminDb.collectionGroup("variants").get(),
    adminDb.collection("linkedinStudioPosts").get(),
    adminDb.collection("jobApplications").get(),
    adminDb.collection("bookings").get(),
    adminDb.collection("bookingSettings").doc("default").get(),
    adminDb.collection("siteFeatureFlags").doc("default").get(),
    adminDb.collection("auditLogs").orderBy("createdAt", "desc").limit(15).get(),
    adminDb.collection("auditLogs").where("createdAt", ">=", last30d).get(),
    adminDb.collection("siteVersionSnapshots").count().get(),
    adminDb.collection("siteVersionSnapshots").orderBy("createdAt", "desc").limit(1).get()
  ]);

  const cmsProjects = toStatusBreakdown(projectsSnap.docs, { fallback: "draft" });
  const cmsBlog = toStatusBreakdown(blogSnap.docs, { fallback: "draft" });
  const cmsExperiences = toStatusBreakdown(experiencesSnap.docs, { fallback: "published" });
  const cmsServices = toStatusBreakdown(servicesSnap.docs, { fallback: "published" });
  const cmsCertificates = toStatusBreakdown(certificatesSnap.docs, { fallback: "published" });
  const cmsSocialLinks = toStatusBreakdown(socialLinksSnap.docs, { fallback: "published" });

  const creatorVisibility = {
    publicVariants: 0,
    unlistedVariants: 0,
    privateVariants: 0
  };
  const creatorPlatformMap = new Map<string, number>();

  variantsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const visibility = String(data.visibility ?? "private").trim().toLowerCase();
    if (visibility === "public") creatorVisibility.publicVariants += 1;
    else if (visibility === "unlisted") creatorVisibility.unlistedVariants += 1;
    else creatorVisibility.privateVariants += 1;

    const platform = String(data.platform ?? "unknown").trim().toLowerCase() || "unknown";
    creatorPlatformMap.set(platform, (creatorPlatformMap.get(platform) ?? 0) + 1);
  });

  const linkedin = linkedinPostsSnap.docs.reduce(
    (acc, doc) => {
      const data = doc.data();
      const status = String(data.status ?? "draft").trim().toLowerCase();
      const updatedAt = asIso(data.updatedAt);
      const publishedAt = asIso(data.publishedAt);
      const createdAt = asIso(data.createdAt);

      acc.total += 1;
      if (status === "published") acc.published += 1;
      else if (status === "scheduled") acc.scheduled += 1;
      else acc.drafts += 1;
      acc.lastActivityAt = latestIso(acc.lastActivityAt, updatedAt, publishedAt, createdAt);
      return acc;
    },
    { total: 0, drafts: 0, scheduled: 0, published: 0, lastActivityAt: "" }
  );

  const jobResponseMap = new Map<string, number>();
  const jobStageMap = new Map<string, number>();
  const jobs = jobsSnap.docs.reduce(
    (acc, doc) => {
      const data = doc.data();
      const response = String(data.response ?? "No response").trim() || "No response";
      const interviewStage = String(data.interviewStage ?? "None").trim() || "None";

      acc.total += 1;
      if (response.toLowerCase() === "offer") acc.offers += 1;
      if (response.toLowerCase() === "no response") acc.noResponse += 1;
      if (interviewStage.toLowerCase() !== "none") acc.interviews += 1;

      jobResponseMap.set(response, (jobResponseMap.get(response) ?? 0) + 1);
      jobStageMap.set(interviewStage, (jobStageMap.get(interviewStage) ?? 0) + 1);
      return acc;
    },
    { total: 0, offers: 0, interviews: 0, noResponse: 0 }
  );

  const bookings = bookingsSnap.docs.reduce(
    (acc, doc) => {
      const data = doc.data();
      const status = String(data.status ?? "confirmed").trim().toLowerCase();
      const startAt = safeDate(asIso(data.startAt));
      const isCancelled = status === "cancelled";

      acc.total += 1;
      if (isCancelled) acc.cancelled += 1;
      else acc.confirmed += 1;

      if (!isCancelled && startAt && startAt >= now) {
        acc.upcoming += 1;
      }
      if (!isCancelled && startAt && startAt < now) {
        acc.completed += 1;
      }
      return acc;
    },
    { total: 0, upcoming: 0, confirmed: 0, cancelled: 0, completed: 0 }
  );

  const bookingFlagFirestore = bookingSettingsSnap.data()?.enabled;
  const siteFlags = siteFlagsSnap.data() ?? {};

  const featureFlags: FeatureFlagRow[] = [
    {
      key: "bookingEnabled",
      label: "Booking System",
      enabled: typeof remoteFlags.bookingEnabled === "boolean" ? remoteFlags.bookingEnabled : Boolean(bookingFlagFirestore ?? true),
      source: typeof remoteFlags.bookingEnabled === "boolean" ? "remote-config" : "firestore"
    },
    {
      key: "pipelineStoryEnabled",
      label: "Pipeline Story",
      enabled:
        typeof remoteFlags.pipelineStoryEnabled === "boolean"
          ? remoteFlags.pipelineStoryEnabled
          : Boolean(siteFlags.pipelineStoryEnabled ?? true),
      source: typeof remoteFlags.pipelineStoryEnabled === "boolean" ? "remote-config" : "firestore"
    },
    {
      key: "featuredCarouselEnabled",
      label: "Featured Carousel",
      enabled:
        typeof remoteFlags.featuredCarouselEnabled === "boolean"
          ? remoteFlags.featuredCarouselEnabled
          : Boolean(siteFlags.featuredCarouselEnabled ?? true),
      source: typeof remoteFlags.featuredCarouselEnabled === "boolean" ? "remote-config" : "firestore"
    },
    {
      key: "experienceStoryEnabled",
      label: "Experience Story",
      enabled:
        typeof remoteFlags.experienceStoryEnabled === "boolean"
          ? remoteFlags.experienceStoryEnabled
          : Boolean(siteFlags.experienceStoryEnabled ?? true),
      source: typeof remoteFlags.experienceStoryEnabled === "boolean" ? "remote-config" : "firestore"
    }
  ];

  const enabledPages = pageSettings.filter((page) => page.enabled).length;
  const healthCounts = {
    healthy: health.features.filter((feature) => feature.status === "healthy").length,
    degraded: health.features.filter((feature) => feature.status === "degraded").length
  };

  const moduleCounter = [
    cmsProjects.total,
    cmsBlog.total,
    cmsExperiences.total,
    cmsServices.total,
    cmsCertificates.total,
    cmsSocialLinks.total,
    mediaAssetsSnap.size,
    contentItemsSnap.size,
    linkedin.total,
    jobs.total,
    bookings.total
  ];
  const activeCollections = moduleCounter.filter((count) => count > 0).length;

  let actions7d = 0;
  const topModuleMap = new Map<string, number>();
  audits30dSnap.docs.forEach((doc) => {
    const data = doc.data();
    const createdAt = safeDate(asIso(data.createdAt));
    if (createdAt && createdAt >= last7d) actions7d += 1;

    const module = String(data.module ?? "unknown");
    topModuleMap.set(module, (topModuleMap.get(module) ?? 0) + 1);
  });

  const recentAudit = auditsRecentSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      module: String(data.module ?? "unknown"),
      action: String(data.action ?? ""),
      summary: String(data.summary ?? ""),
      actorEmail: String(data.actorEmail ?? ""),
      createdAt: asIso(data.createdAt)
    } satisfies AuditActivityRow;
  });

  return {
    generatedAt: new Date().toISOString(),
    health,
    healthCounts,
    moduleTotals: {
      tracked: moduleCounter.length,
      activeCollections
    },
    cms: {
      projects: cmsProjects,
      blog: cmsBlog,
      experiences: cmsExperiences,
      services: cmsServices,
      certificates: cmsCertificates,
      socialLinks: cmsSocialLinks,
      mediaAssets: mediaAssetsSnap.size
    },
    creator: {
      contentItems: contentItemsSnap.size,
      variantsTotal: variantsSnap.size,
      publicVariants: creatorVisibility.publicVariants,
      unlistedVariants: creatorVisibility.unlistedVariants,
      privateVariants: creatorVisibility.privateVariants,
      byPlatform: toDistributionRows(creatorPlatformMap, 7).map((row) => ({ platform: row.label, count: row.count }))
    },
    linkedin,
    jobs: {
      ...jobs,
      byResponse: toDistributionRows(jobResponseMap),
      byStage: toDistributionRows(jobStageMap)
    },
    bookings,
    settings: {
      totalPages: pageSettings.length,
      enabledPages,
      hiddenPages: pageSettings.length - enabledPages,
      featureFlags
    },
    auditing: {
      actions7d,
      actions30d: audits30dSnap.size,
      topModules: Array.from(topModuleMap.entries())
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      recent: recentAudit
    },
    versioning: {
      totalSnapshots: snapshotsCountSnap.data().count,
      latestSnapshotAt: latestSnapshotSnap.docs[0] ? asIso(latestSnapshotSnap.docs[0].data().createdAt) : ""
    }
  };
}
