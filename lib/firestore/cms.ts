import "server-only";

import { DocumentData, Query } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
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

function asDeleted(value: unknown) {
  return value === true;
}

function asPublishedStatus(value: unknown, fallback: "published" | "hidden" = "published") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "hidden") return "hidden";
  if (normalized === "published") return "published";
  return fallback;
}

export async function getProfileContent(): Promise<ProfileContent> {
  const snap = await adminDb.collection("siteContent").doc("profile").get();
  const data = snap.data() ?? {};

  return {
    name: data.name ?? "Saleh Abbaas",
    headline: data.headline ?? BRAND_TAGLINE,
    bio: data.bio ?? BRAND_DESCRIPTION,
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
    titleTemplate: data.titleTemplate ?? BRAND_NAME,
    defaultDescription: data.defaultDescription ?? BRAND_DESCRIPTION,
    defaultOgImage: data.defaultOgImage ?? ""
  };
}

export async function getSocialLinks(): Promise<SocialLinkContent[]> {
  const snap = await adminDb.collection("socialLinks").orderBy("sortOrder", "asc").get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        label: data.label ?? "",
        url: data.url ?? "",
        sortOrder: data.sortOrder ?? 0,
        status: asPublishedStatus(data.status),
        isDeleted: asDeleted(data.isDeleted),
        deletedAt: asIso(data.deletedAt),
        deletedBy: String(data.deletedBy ?? ""),
        createdAt: asIso(data.createdAt),
        updatedAt: asIso(data.updatedAt)
      } satisfies SocialLinkContent;
    })
    .filter((item) => item.status === "published" && item.isDeleted !== true);
}

export async function getExperiences(): Promise<ExperienceContent[]> {
  const snap = await adminDb.collection("experiences").orderBy("sortOrder", "asc").get();
  return snap.docs
    .map((doc) => {
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
        status: asPublishedStatus(data.status),
        isDeleted: asDeleted(data.isDeleted),
        deletedAt: asIso(data.deletedAt),
        deletedBy: String(data.deletedBy ?? ""),
        createdAt: asIso(data.createdAt),
        updatedAt: asIso(data.updatedAt)
      } satisfies ExperienceContent;
    })
    .filter((item) => item.status === "published" && item.isDeleted !== true);
}

export async function getProjects(options?: { publishedOnly?: boolean }): Promise<ProjectContent[]> {
  let query: Query<DocumentData> = adminDb.collection("projects");
  if (options?.publishedOnly) {
    query = query.where("status", "==", "published");
  } else {
    query = query.where("status", "in", ["draft", "published", "hidden"]);
  }

  const snap = await query.orderBy("sortOrder", "asc").get();
  return snap.docs
    .map((doc) => {
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
        isDeleted: asDeleted(data.isDeleted),
        deletedAt: asIso(data.deletedAt),
        deletedBy: String(data.deletedBy ?? ""),
        createdAt: asIso(data.createdAt),
        updatedAt: asIso(data.updatedAt)
      } satisfies ProjectContent;
    })
    .filter((item) => (options?.publishedOnly ? item.isDeleted !== true : true));
}

export async function getProjectBySlug(slug: string): Promise<ProjectContent | null> {
  const snap = await adminDb.collection("projects").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  const mapped = {
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
    isDeleted: asDeleted(data.isDeleted),
    deletedAt: asIso(data.deletedAt),
    deletedBy: String(data.deletedBy ?? ""),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt)
  } satisfies ProjectContent;
  if (mapped.status !== "published" || mapped.isDeleted === true) return null;
  return mapped;
}

export async function getServices(): Promise<ServiceContent[]> {
  const snap = await adminDb.collection("services").orderBy("sortOrder", "asc").get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title ?? "",
        detail: data.detail ?? "",
        sortOrder: data.sortOrder ?? 0,
        status: asPublishedStatus(data.status),
        isDeleted: asDeleted(data.isDeleted),
        deletedAt: asIso(data.deletedAt),
        deletedBy: String(data.deletedBy ?? ""),
        createdAt: asIso(data.createdAt),
        updatedAt: asIso(data.updatedAt)
      } satisfies ServiceContent;
    })
    .filter((item) => item.status === "published" && item.isDeleted !== true);
}

export async function getCertificates(): Promise<CertificateContent[]> {
  const snap = await adminDb.collection("certificates").orderBy("sortOrder", "asc").get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title ?? "",
        issuer: data.issuer ?? "",
        year: data.year ?? "",
        credentialUrl: data.credentialUrl ?? "",
        imageUrl: data.imageUrl ?? "",
        sortOrder: data.sortOrder ?? 0,
        status: asPublishedStatus(data.status),
        isDeleted: asDeleted(data.isDeleted),
        deletedAt: asIso(data.deletedAt),
        deletedBy: String(data.deletedBy ?? ""),
        createdAt: asIso(data.createdAt),
        updatedAt: asIso(data.updatedAt)
      } satisfies CertificateContent;
    })
    .filter((item) => item.status === "published" && item.isDeleted !== true);
}

export async function getBlogPosts(options?: { publishedOnly?: boolean }): Promise<BlogPostContent[]> {
  const base = adminDb.collection("blogPosts");
  const query = options?.publishedOnly
    ? base.where("status", "==", "published").orderBy("publishedAt", "desc")
    : base.orderBy("updatedAt", "desc");

  const snap = await query.get();
  return snap.docs
    .map((doc) => {
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
        isDeleted: asDeleted(data.isDeleted),
        deletedAt: asIso(data.deletedAt),
        deletedBy: String(data.deletedBy ?? ""),
        createdAt: asIso(data.createdAt),
        updatedAt: asIso(data.updatedAt),
        seoTitle: data.seoTitle ?? "",
        seoDesc: data.seoDesc ?? ""
      } satisfies BlogPostContent;
    })
    .filter((item) => (options?.publishedOnly ? item.isDeleted !== true : true));
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
  const mapped = {
    id: snap.docs[0].id,
    slug: data.slug ?? slug,
    title: data.title ?? "",
    excerpt: data.excerpt ?? "",
    body: data.body ?? "",
    tags: asArray(data.tags),
    coverImage: data.coverImage ?? "",
    status: data.status ?? "draft",
    publishedAt: asIso(data.publishedAt),
    isDeleted: asDeleted(data.isDeleted),
    deletedAt: asIso(data.deletedAt),
    deletedBy: String(data.deletedBy ?? ""),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
    seoTitle: data.seoTitle ?? "",
    seoDesc: data.seoDesc ?? ""
  } satisfies BlogPostContent;
  if (mapped.isDeleted === true || mapped.status !== "published") return null;
  return mapped;
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
