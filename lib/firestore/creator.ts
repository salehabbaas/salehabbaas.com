import "server-only";

import { CollectionReference, DocumentData, Query } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { ContentVariant, CreatorSettings } from "@/types/creator";

const VARIANT_VISIBILITIES_FOR_ROUTE = new Set(["public", "unlisted"]);

function asIso(input: unknown): string | undefined {
  if (!input) return undefined;
  if (typeof input === "string") return input;
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "object" && input && "toDate" in input && typeof input.toDate === "function") {
    return input.toDate().toISOString();
  }
  return undefined;
}

function mapVariant(id: string, data: DocumentData): ContentVariant {
  return {
    id,
    contentItemId: data.contentItemId ?? "",
    contentTitle: data.contentTitle ?? "",
    contentType: data.contentType ?? "post",
    platform: data.platform ?? "linkedin",
    slug: data.slug ?? "",
    visibility: data.visibility ?? "private",
    hook: data.hook ?? "",
    body: data.body ?? "",
    cta: data.cta ?? "",
    hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
    media: Array.isArray(data.media) ? data.media : [],
    scheduledAt: asIso(data.scheduledAt),
    publishedAt: asIso(data.publishedAt),
    externalUrl: data.externalUrl ?? "",
    seoTitle: data.seoTitle ?? "",
    seoDesc: data.seoDesc ?? "",
    ogImage: data.ogImage ?? "",
    pillar: data.pillar ?? "General",
    tags: Array.isArray(data.tags) ? data.tags : [],
    metrics: data.metrics ?? undefined,
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt)
  };
}

function variantsCollectionGroup() {
  return adminDb.collectionGroup("variants") as Query<DocumentData>;
}

function applyPublicFilters(
  query: Query<DocumentData>,
  filters: { pillar?: string; platform?: string; type?: string }
): Query<DocumentData> {
  let working = query.where("visibility", "==", "public");
  if (filters.platform) {
    working = working.where("platform", "==", filters.platform);
  }
  if (filters.pillar) {
    working = working.where("pillar", "==", filters.pillar);
  }
  if (filters.type) {
    working = working.where("contentType", "==", filters.type);
  }
  return working.orderBy("publishedAt", "desc");
}

export async function getCreatorSettings(): Promise<CreatorSettings> {
  const snap = await adminDb.collection("creatorSettings").doc("default").get();
  const data = snap.exists ? snap.data() : null;
  return {
    pillars: data?.pillars ?? ["Engineering", "Career", "Growth"],
    platforms: data?.platforms ?? ["linkedin", "youtube", "instagram", "tiktok", "x"],
    pinnedVariantSlugs: data?.pinnedVariantSlugs ?? [],
    newsletterEnabled: data?.newsletterEnabled ?? true,
    defaultVisibility: data?.defaultVisibility ?? "private",
    socialLinks:
      data?.socialLinks ?? [
        { label: "LinkedIn", url: "https://linkedin.com/in/salehabbaas" },
        { label: "YouTube", url: "https://youtube.com/@salehabbaas" },
        { label: "Instagram", url: "https://instagram.com/salehabbaas" },
        { label: "TikTok", url: "https://tiktok.com/@salehabbaas" },
        { label: "X", url: "https://x.com/salehabbaas" }
      ]
  };
}

export async function getPublicCreatorFeed(options: {
  page: number;
  pageSize: number;
  pillar?: string;
  platform?: string;
  type?: string;
}) {
  const { page, pageSize, pillar, platform, type } = options;

  const baseQuery = applyPublicFilters(variantsCollectionGroup(), { pillar, platform, type });

  const [docsSnap, countSnap] = await Promise.all([
    baseQuery.offset(Math.max(0, (page - 1) * pageSize)).limit(pageSize).get(),
    baseQuery.count().get()
  ]);

  const variants = docsSnap.docs.map((doc) => mapVariant(doc.id, doc.data()));
  const total = countSnap.data().count;

  return {
    items: variants,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getPublicCreatorTop(limit = 3) {
  const snap = await variantsCollectionGroup().where("visibility", "==", "public").orderBy("publishedAt", "desc").limit(limit).get();
  return snap.docs.map((doc) => mapVariant(doc.id, doc.data()));
}

export async function getFeaturedCreatorContent(limit = 3) {
  const settings = await getCreatorSettings();
  if (!settings.pinnedVariantSlugs.length) {
    return getPublicCreatorTop(limit);
  }

  const matches: ContentVariant[] = [];
  for (const slug of settings.pinnedVariantSlugs.slice(0, limit * 2)) {
    const variant = await getCreatorVariantBySlug(slug);
    if (variant?.visibility === "public") {
      matches.push(variant);
    }
    if (matches.length >= limit) break;
  }

  if (!matches.length) {
    return getPublicCreatorTop(limit);
  }

  return matches.slice(0, limit);
}

export async function getCreatorVariantBySlug(slug: string) {
  const snap = await variantsCollectionGroup().where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const mapped = mapVariant(snap.docs[0].id, snap.docs[0].data());
  if (!VARIANT_VISIBILITIES_FOR_ROUTE.has(mapped.visibility)) return null;
  if (!mapped.publishedAt) return null;
  return mapped;
}

export async function getRelatedCreatorContent(options: {
  currentSlug: string;
  pillar: string;
  tags: string[];
  limit?: number;
}) {
  const { currentSlug, pillar, tags, limit = 3 } = options;
  let query = variantsCollectionGroup().where("visibility", "==", "public").where("pillar", "==", pillar);
  if (tags.length) {
    query = query.where("tags", "array-contains-any", tags.slice(0, 10));
  }

  const snap = await query.orderBy("publishedAt", "desc").limit(10).get();
  return snap.docs
    .map((doc) => mapVariant(doc.id, doc.data()))
    .filter((item) => item.slug !== currentSlug)
    .slice(0, limit);
}

export async function getCreatorPillarSummary(limit = 30) {
  const snap = await variantsCollectionGroup().where("visibility", "==", "public").orderBy("publishedAt", "desc").limit(limit).get();
  const counts = new Map<string, number>();

  snap.docs.forEach((doc) => {
    const pillar = doc.data().pillar ?? "General";
    counts.set(pillar, (counts.get(pillar) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([pillar, count]) => ({ pillar, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getCreatorSitemapEntries() {
  const snap = await variantsCollectionGroup().where("visibility", "==", "public").orderBy("publishedAt", "desc").get();
  return snap.docs
    .map((doc) => mapVariant(doc.id, doc.data()))
    .filter((variant) => variant.slug && variant.publishedAt);
}

export function variantDocRef(contentItemId: string, variantId: string) {
  return adminDb.collection("contentItems").doc(contentItemId).collection("variants").doc(variantId);
}

export function contentItemsCollection() {
  return adminDb.collection("contentItems") as CollectionReference<DocumentData>;
}
