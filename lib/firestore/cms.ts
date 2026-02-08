import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import {
  BlogPostContent,
  CertificateContent,
  ExperienceContent,
  IntegrationSettings,
  MediaAsset,
  ProfileContent,
  ProjectContent,
  SeoDefaults,
  ServiceContent,
  SocialLinkContent
} from "@/types/cms";

function asIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export async function getProfileContent(): Promise<ProfileContent> {
  const snap = await adminDb.collection("siteContent").doc("profile").get();
  const data = snap.data() ?? {};

  return {
    name: data.name ?? "Saleh Abbaas",
    headline: data.headline ?? "Software Engineer",
    bio: data.bio ?? "",
    location: data.location ?? "",
    email: data.email ?? "",
    resumeUrl: data.resumeUrl ?? "",
    avatarUrl: data.avatarUrl ?? ""
  };
}

export async function getSeoDefaults(): Promise<SeoDefaults> {
  const snap = await adminDb.collection("siteContent").doc("seoDefaults").get();
  const data = snap.data() ?? {};

  return {
    titleTemplate: data.titleTemplate ?? "Saleh Abbaas | Software Engineer",
    defaultDescription: data.defaultDescription ??
      "Saleh Abbaas is a software engineer, Firebase architect, product designer, and growth engineer.",
    defaultOgImage: data.defaultOgImage ?? ""
  };
}

export async function getSocialLinks(): Promise<SocialLinkContent[]> {
  const snap = await adminDb.collection("socialLinks").orderBy("sortOrder", "asc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      label: data.label ?? "",
      url: data.url ?? "",
      sortOrder: data.sortOrder ?? 0,
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt)
    } satisfies SocialLinkContent;
  });
}

export async function getExperiences(): Promise<ExperienceContent[]> {
  const snap = await adminDb.collection("experiences").orderBy("sortOrder", "asc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      company: data.company ?? "",
      role: data.role ?? "",
      startDate: data.startDate ?? "",
      endDate: data.endDate ?? "",
      summary: data.summary ?? "",
      achievements: asArray(data.achievements),
      sortOrder: data.sortOrder ?? 0,
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt)
    } satisfies ExperienceContent;
  });
}

export async function getProjects(options?: { publishedOnly?: boolean }): Promise<ProjectContent[]> {
  let query = adminDb.collection("projects").orderBy("sortOrder", "asc");
  if (options?.publishedOnly) {
    query = query.where("status", "==", "published").orderBy("sortOrder", "asc");
  }

  const snap = await query.get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      slug: data.slug ?? doc.id,
      title: data.title ?? "",
      description: data.description ?? "",
      longDescription: data.longDescription ?? "",
      tags: asArray(data.tags),
      coverImage: data.coverImage ?? "",
      projectUrl: data.projectUrl ?? "",
      status: data.status ?? "draft",
      sortOrder: data.sortOrder ?? 0,
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt)
    } satisfies ProjectContent;
  });
}

export async function getProjectBySlug(slug: string): Promise<ProjectContent | null> {
  const snap = await adminDb.collection("projects").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return {
    id: snap.docs[0].id,
    slug: data.slug ?? slug,
    title: data.title ?? "",
    description: data.description ?? "",
    longDescription: data.longDescription ?? "",
    tags: asArray(data.tags),
    coverImage: data.coverImage ?? "",
    projectUrl: data.projectUrl ?? "",
    status: data.status ?? "draft",
    sortOrder: data.sortOrder ?? 0,
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt)
  } satisfies ProjectContent;
}

export async function getServices(): Promise<ServiceContent[]> {
  const snap = await adminDb.collection("services").orderBy("sortOrder", "asc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title ?? "",
      detail: data.detail ?? "",
      sortOrder: data.sortOrder ?? 0,
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt)
    } satisfies ServiceContent;
  });
}

export async function getCertificates(): Promise<CertificateContent[]> {
  const snap = await adminDb.collection("certificates").orderBy("sortOrder", "asc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title ?? "",
      issuer: data.issuer ?? "",
      year: data.year ?? "",
      credentialUrl: data.credentialUrl ?? "",
      imageUrl: data.imageUrl ?? "",
      sortOrder: data.sortOrder ?? 0,
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt)
    } satisfies CertificateContent;
  });
}

export async function getBlogPosts(options?: { publishedOnly?: boolean }): Promise<BlogPostContent[]> {
  const base = adminDb.collection("blogPosts");
  const query = options?.publishedOnly
    ? base.where("status", "==", "published").orderBy("publishedAt", "desc")
    : base.orderBy("updatedAt", "desc");

  const snap = await query.get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      slug: data.slug ?? doc.id,
      title: data.title ?? "",
      excerpt: data.excerpt ?? "",
      body: data.body ?? "",
      tags: asArray(data.tags),
      coverImage: data.coverImage ?? "",
      status: data.status ?? "draft",
      publishedAt: asIso(data.publishedAt),
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt),
      seoTitle: data.seoTitle ?? "",
      seoDesc: data.seoDesc ?? ""
    } satisfies BlogPostContent;
  });
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostContent | null> {
  const snap = await adminDb
    .collection("blogPosts")
    .where("slug", "==", slug)
    .where("status", "==", "published")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return {
    id: snap.docs[0].id,
    slug: data.slug ?? slug,
    title: data.title ?? "",
    excerpt: data.excerpt ?? "",
    body: data.body ?? "",
    tags: asArray(data.tags),
    coverImage: data.coverImage ?? "",
    status: data.status ?? "draft",
    publishedAt: asIso(data.publishedAt),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
    seoTitle: data.seoTitle ?? "",
    seoDesc: data.seoDesc ?? ""
  } satisfies BlogPostContent;
}

export async function getMediaAssets(): Promise<MediaAsset[]> {
  const snap = await adminDb.collection("mediaAssets").orderBy("createdAt", "desc").limit(100).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name ?? "",
      url: data.url ?? "",
      path: data.path ?? "",
      contentType: data.contentType ?? "",
      size: data.size ?? 0,
      createdAt: asIso(data.createdAt)
    } satisfies MediaAsset;
  });
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  const snap = await adminDb.collection("siteContent").doc("integrations").get();
  const data = snap.data() ?? {};

  return {
    emailProvider: data.emailProvider ?? "resend",
    senderEmail: data.senderEmail ?? "",
    senderName: data.senderName ?? "Saleh Abbaas",
    sendgridApiKeyPlaceholder: data.sendgridApiKeyPlaceholder ?? "",
    resendApiKeyPlaceholder: data.resendApiKeyPlaceholder ?? "",
    mailgunApiKeyPlaceholder: data.mailgunApiKeyPlaceholder ?? "",
    mailgunDomainPlaceholder: data.mailgunDomainPlaceholder ?? "",
    zohoEnabled: data.zohoEnabled ?? false,
    zohoClientIdPlaceholder: data.zohoClientIdPlaceholder ?? "",
    zohoClientSecretPlaceholder: data.zohoClientSecretPlaceholder ?? "",
    zohoRedirectUriPlaceholder: data.zohoRedirectUriPlaceholder ?? ""
  };
}
