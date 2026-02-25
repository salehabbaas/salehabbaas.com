import "server-only";

import { adminDb } from "@/lib/firebase/admin";

type EventRecord = {
  id: string;
  name: string;
  path: string;
  source: string;
  referrer: string;
  sessionId: string;
  deviceType: string;
  country: string;
  userAgent: string;
  browser: string;
  createdAt: string;
};

type ProjectPerf = {
  id: string;
  slug: string;
  title: string;
  status: string;
  views: number;
  lastViewedAt: string;
};

type SeoIssue = {
  type: "project" | "blog";
  path: string;
  title: string;
  missing: string[];
};

type AuditRow = {
  id: string;
  module: string;
  action: string;
  summary: string;
  actorEmail: string;
  createdAt: string;
};

type SnapshotRow = {
  id: string;
  createdAt: string;
  createdByEmail: string;
  note: string;
  counts: {
    projects: number;
    blogPosts: number;
    creatorItems: number;
    bookings: number;
    jobApplications: number;
    linkedinPosts: number;
  };
};

type AccessRow = {
  id: string;
  eventType: "login" | "logout";
  actorEmail: string;
  actorUid: string;
  deviceType: string;
  browser: string;
  country: string;
  city: string;
  ipMasked: string;
  createdAt: string;
};

type ProfileSyncSummary = {
  websiteName: string;
  websiteHeadline: string;
  linkedinDisplayName: string;
  linkedinHeadline: string;
  fieldsAligned: number;
  totalCompared: number;
  alignmentPercent: number;
  lastLinkedinUpdateAt: string;
};

export type ControlCenterSummary = {
  traffic: {
    events30d: number;
    pageViews30d: number;
    uniquePaths30d: number;
    uniqueSessions30d: number;
    returningSessions30d: number;
    topPages: Array<{ path: string; views: number }>;
    eventMix: Array<{ name: string; count: number }>;
    byDay: Array<{ day: string; events: number; pageViews: number }>;
    byDevice: Array<{ device: string; count: number }>;
    byBrowser: Array<{ browser: string; count: number }>;
    bySource: Array<{ source: string; count: number }>;
    byCountry: Array<{ country: string; count: number }>;
  };
  projects: {
    total: number;
    withTraffic: number;
    topProjects: ProjectPerf[];
    linkedinStudio: {
      totalPosts: number;
      scheduled: number;
      published: number;
      drafts: number;
    };
  };
  seo: {
    issuesCount: number;
    issues: SeoIssue[];
  };
  auditing: {
    actions7d: number;
    actions30d: number;
    byModule: Array<{ module: string; count: number }>;
    recent: AuditRow[];
  };
  adminAccess: {
    events7d: number;
    loginEvents30d: number;
    byDevice: Array<{ device: string; count: number }>;
    byBrowser: Array<{ browser: string; count: number }>;
    byCountry: Array<{ country: string; count: number }>;
    recent: AccessRow[];
  };
  versioning: {
    totalSnapshots: number;
    latestSnapshotAt: string;
    snapshots: SnapshotRow[];
  };
  profileSync: ProfileSyncSummary;
  modules: {
    cmsProjects: number;
    blogPosts: number;
    creatorItems: number;
    bookingsUpcoming: number;
    jobsTotal: number;
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

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseProjectSlug(path: string) {
  const match = path.match(/^\/projects\/([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function deriveSource(event: { source?: unknown; referrer?: unknown }) {
  const fromBody = String(event.source ?? "").trim();
  if (fromBody) return fromBody;

  const referrer = String(event.referrer ?? "").trim();
  if (!referrer) return "direct";

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || "referral";
  } catch {
    return "referral";
  }
}

function deriveBrowser(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (!ua) return "unknown";
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "opera";
  if (ua.includes("firefox/")) return "firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "safari";
  if (ua.includes("chrome/")) return "chrome";
  return "unknown";
}

function safeDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function getControlCenterSummary(): Promise<ControlCenterSummary> {
  const now = new Date();
  const last7d = new Date(now);
  last7d.setDate(last7d.getDate() - 7);

  const last30d = new Date(now);
  last30d.setDate(last30d.getDate() - 30);

  const last90d = new Date(now);
  last90d.setDate(last90d.getDate() - 90);

  const [
    analyticsSnap,
    projectsSnap,
    blogSnap,
    creatorSnap,
    bookingsUpcomingSnap,
    jobsSnap,
    linkedinPostsSnap,
    auditSnap,
    accessSnap,
    snapshotsSnap,
    websiteProfileSnap,
    linkedinProfileSnap
  ] = await Promise.all([
    adminDb.collection("analyticsEvents").where("createdAt", ">=", last90d).get(),
    adminDb.collection("projects").get(),
    adminDb.collection("blogPosts").get(),
    adminDb.collection("contentItems").get(),
    adminDb.collection("bookings").where("startAt", ">=", now).get(),
    adminDb.collection("jobApplications").get(),
    adminDb.collection("linkedinStudioPosts").get(),
    adminDb.collection("auditLogs").orderBy("createdAt", "desc").limit(80).get(),
    adminDb.collection("adminAccessLogs").orderBy("createdAt", "desc").limit(120).get(),
    adminDb.collection("siteVersionSnapshots").orderBy("createdAt", "desc").limit(20).get(),
    adminDb.collection("siteContent").doc("profile").get(),
    adminDb.collection("linkedinStudioProfiles").doc("default").get()
  ]);

  const events: EventRecord[] = analyticsSnap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: String(data.name ?? "unknown"),
        path: String(data.path ?? ""),
        source: deriveSource(data),
        referrer: String(data.referrer ?? ""),
        sessionId: String(data.sessionId ?? data.fingerprint ?? ""),
        deviceType: String(data.deviceType ?? "unknown"),
        country: String(data.country ?? "Unknown"),
        userAgent: String(data.userAgent ?? ""),
        browser: String(data.browser ?? deriveBrowser(String(data.userAgent ?? ""))),
        createdAt: asIso(data.createdAt)
      };
    })
    .filter((event) => Boolean(event.createdAt));

  const events30d = events.filter((event) => {
    const parsed = safeDate(event.createdAt);
    return parsed ? parsed >= last30d : false;
  });

  const pageViews30d = events30d.filter((event) => event.name === "page_view");
  const uniquePaths = new Set(pageViews30d.map((event) => event.path || "/"));
  const uniqueSessions = new Set(
    events30d
      .map((event) => event.sessionId)
      .filter(Boolean)
  );

  const topPageMap = new Map<string, number>();
  const eventMixMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const browserMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const sessionEventMap = new Map<string, number>();

  for (const event of events30d) {
    eventMixMap.set(event.name, (eventMixMap.get(event.name) ?? 0) + 1);
    deviceMap.set(event.deviceType || "unknown", (deviceMap.get(event.deviceType || "unknown") ?? 0) + 1);
    browserMap.set(event.browser || "unknown", (browserMap.get(event.browser || "unknown") ?? 0) + 1);
    sourceMap.set(event.source || "direct", (sourceMap.get(event.source || "direct") ?? 0) + 1);
    countryMap.set(event.country || "Unknown", (countryMap.get(event.country || "Unknown") ?? 0) + 1);
    if (event.sessionId) {
      sessionEventMap.set(event.sessionId, (sessionEventMap.get(event.sessionId) ?? 0) + 1);
    }

    if (event.name === "page_view") {
      const path = event.path || "/";
      topPageMap.set(path, (topPageMap.get(path) ?? 0) + 1);
    }
  }

  const byDayMap = new Map<string, { events: number; pageViews: number }>();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    byDayMap.set(dayKey(date), { events: 0, pageViews: 0 });
  }

  for (const event of events30d) {
    const created = safeDate(event.createdAt);
    if (!created) continue;
    const key = dayKey(created);
    if (!byDayMap.has(key)) continue;
    const entry = byDayMap.get(key)!;
    entry.events += 1;
    if (event.name === "page_view") {
      entry.pageViews += 1;
    }
  }

  const topPages = Array.from(topPageMap.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const eventMix = Array.from(eventMixMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const byDevice = Array.from(deviceMap.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  const byBrowser = Array.from(browserMap.entries())
    .map(([browser, count]) => ({ browser, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const bySource = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const byCountry = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const returningSessions30d = Array.from(sessionEventMap.values()).filter((count) => count >= 2).length;

  const projectViewMap = new Map<string, { views: number; lastViewedAt: string }>();
  for (const event of events) {
    if (event.name !== "page_view") continue;
    const slug = parseProjectSlug(event.path || "");
    if (!slug) continue;

    const existing = projectViewMap.get(slug) ?? { views: 0, lastViewedAt: "" };
    existing.views += 1;
    if (!existing.lastViewedAt || event.createdAt > existing.lastViewedAt) {
      existing.lastViewedAt = event.createdAt;
    }
    projectViewMap.set(slug, existing);
  }

  const topProjects: ProjectPerf[] = projectsSnap.docs
    .map((doc) => {
      const data = doc.data();
      const slug = String(data.slug ?? doc.id).toLowerCase();
      const perf = projectViewMap.get(slug) ?? { views: 0, lastViewedAt: "" };
      return {
        id: doc.id,
        slug: String(data.slug ?? doc.id),
        title: String(data.title ?? doc.id),
        status: String(data.status ?? "draft"),
        views: perf.views,
        lastViewedAt: perf.lastViewedAt
      };
    })
    .sort((a, b) => b.views - a.views);

  const withTraffic = topProjects.filter((project) => project.views > 0).length;

  const linkedinStats = linkedinPostsSnap.docs.reduce(
    (acc, doc) => {
      const status = String(doc.data().status ?? "draft");
      acc.totalPosts += 1;
      if (status === "scheduled") acc.scheduled += 1;
      else if (status === "published") acc.published += 1;
      else acc.drafts += 1;
      return acc;
    },
    { totalPosts: 0, scheduled: 0, published: 0, drafts: 0 }
  );

  const seoIssues: SeoIssue[] = [];

  projectsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const missing: string[] = [];
    if (!String(data.description ?? "").trim()) missing.push("description");
    if (!String(data.longDescription ?? "").trim()) missing.push("longDescription");
    if (!String(data.coverImage ?? "").trim()) missing.push("coverImage");
    if (!Array.isArray(data.tags) || data.tags.length === 0) missing.push("tags");

    if (missing.length) {
      seoIssues.push({
        type: "project",
        path: `/projects/${data.slug ?? doc.id}`,
        title: String(data.title ?? doc.id),
        missing
      });
    }
  });

  blogSnap.docs.forEach((doc) => {
    const data = doc.data();
    const missing: string[] = [];
    if (!String(data.excerpt ?? "").trim()) missing.push("excerpt");
    if (!String(data.coverImage ?? "").trim()) missing.push("coverImage");
    if (!String(data.seoTitle ?? "").trim()) missing.push("seoTitle");
    if (!String(data.seoDesc ?? "").trim()) missing.push("seoDesc");

    if (missing.length) {
      seoIssues.push({
        type: "blog",
        path: `/blog/${data.slug ?? doc.id}`,
        title: String(data.title ?? doc.id),
        missing
      });
    }
  });

  seoIssues.sort((a, b) => b.missing.length - a.missing.length);

  const auditRows: AuditRow[] = auditSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      module: String(data.module ?? "unknown"),
      action: String(data.action ?? ""),
      summary: String(data.summary ?? ""),
      actorEmail: String(data.actorEmail ?? ""),
      createdAt: asIso(data.createdAt)
    };
  });

  const moduleMap = new Map<string, number>();
  let actions7d = 0;
  let actions30d = 0;

  for (const row of auditRows) {
    moduleMap.set(row.module, (moduleMap.get(row.module) ?? 0) + 1);

    const created = safeDate(row.createdAt);
    if (!created) continue;
    if (created >= last30d) actions30d += 1;
    if (created >= last7d) actions7d += 1;
  }

  const byModule = Array.from(moduleMap.entries())
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const accessRows: AccessRow[] = accessSnap.docs.map((doc) => {
    const data = doc.data();
    const eventType = String(data.eventType ?? "login") === "logout" ? "logout" : "login";
    return {
      id: doc.id,
      eventType,
      actorEmail: String(data.actorEmail ?? ""),
      actorUid: String(data.actorUid ?? ""),
      deviceType: String(data.deviceType ?? "unknown"),
      browser: String(data.browser ?? "unknown"),
      country: String(data.country ?? "Unknown"),
      city: String(data.city ?? ""),
      ipMasked: String(data.ipMasked ?? ""),
      createdAt: asIso(data.createdAt)
    };
  });

  const accessDeviceMap = new Map<string, number>();
  const accessBrowserMap = new Map<string, number>();
  const accessCountryMap = new Map<string, number>();

  let accessEvents7d = 0;
  let loginEvents30d = 0;

  for (const row of accessRows) {
    accessDeviceMap.set(row.deviceType, (accessDeviceMap.get(row.deviceType) ?? 0) + 1);
    accessBrowserMap.set(row.browser, (accessBrowserMap.get(row.browser) ?? 0) + 1);
    accessCountryMap.set(row.country || "Unknown", (accessCountryMap.get(row.country || "Unknown") ?? 0) + 1);

    const created = safeDate(row.createdAt);
    if (!created) continue;
    if (created >= last7d) accessEvents7d += 1;
    if (created >= last30d && row.eventType === "login") loginEvents30d += 1;
  }

  const accessByDevice = Array.from(accessDeviceMap.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const accessByBrowser = Array.from(accessBrowserMap.entries())
    .map(([browser, count]) => ({ browser, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const accessByCountry = Array.from(accessCountryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const websiteProfile = websiteProfileSnap.data() ?? {};
  const linkedinProfile = linkedinProfileSnap.data() ?? {};

  const websiteName = String(websiteProfile.name ?? "");
  const websiteHeadline = String(websiteProfile.headline ?? "");
  const linkedinDisplayName = String(linkedinProfile.profile?.displayName ?? "");
  const linkedinHeadline = String(linkedinProfile.profile?.headline ?? "");

  const comparedFields = [
    [websiteName, linkedinDisplayName],
    [websiteHeadline, linkedinHeadline]
  ].filter(([left, right]) => left || right);

  const fieldsAligned = comparedFields.filter(
    ([left, right]) => left.trim().toLowerCase() === right.trim().toLowerCase()
  ).length;

  const totalCompared = comparedFields.length;
  const alignmentPercent = totalCompared ? Math.round((fieldsAligned / totalCompared) * 100) : 0;

  const snapshots: SnapshotRow[] = snapshotsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      createdAt: asIso(data.createdAt),
      createdByEmail: String(data.createdBy?.email ?? ""),
      note: String(data.note ?? ""),
      counts: {
        projects: Number(data.counts?.projects ?? 0),
        blogPosts: Number(data.counts?.blogPosts ?? 0),
        creatorItems: Number(data.counts?.creatorItems ?? 0),
        bookings: Number(data.counts?.bookings ?? 0),
        jobApplications: Number(data.counts?.jobApplications ?? 0),
        linkedinPosts: Number(data.counts?.linkedinPosts ?? 0)
      }
    };
  });

  return {
    traffic: {
      events30d: events30d.length,
      pageViews30d: pageViews30d.length,
      uniquePaths30d: uniquePaths.size,
      uniqueSessions30d: uniqueSessions.size,
      returningSessions30d,
      topPages,
      eventMix,
      byDay: Array.from(byDayMap.entries()).map(([day, values]) => ({ day, ...values })),
      byDevice,
      byBrowser,
      bySource,
      byCountry
    },
    projects: {
      total: projectsSnap.size,
      withTraffic,
      topProjects: topProjects.slice(0, 12),
      linkedinStudio: linkedinStats
    },
    seo: {
      issuesCount: seoIssues.length,
      issues: seoIssues.slice(0, 20)
    },
    auditing: {
      actions7d,
      actions30d,
      byModule,
      recent: auditRows.slice(0, 15)
    },
    adminAccess: {
      events7d: accessEvents7d,
      loginEvents30d,
      byDevice: accessByDevice,
      byBrowser: accessByBrowser,
      byCountry: accessByCountry,
      recent: accessRows.slice(0, 15)
    },
    versioning: {
      totalSnapshots: snapshotsSnap.size,
      latestSnapshotAt: snapshots[0]?.createdAt ?? "",
      snapshots
    },
    profileSync: {
      websiteName,
      websiteHeadline,
      linkedinDisplayName,
      linkedinHeadline,
      fieldsAligned,
      totalCompared,
      alignmentPercent,
      lastLinkedinUpdateAt: asIso(linkedinProfile.updatedAt)
    },
    modules: {
      cmsProjects: projectsSnap.size,
      blogPosts: blogSnap.size,
      creatorItems: creatorSnap.size,
      bookingsUpcoming: bookingsUpcomingSnap.size,
      jobsTotal: jobsSnap.size
    }
  };
}
