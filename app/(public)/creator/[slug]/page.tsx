import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorItemAnalytics } from "@/components/creator/creator-item-analytics";
import { CreatorMediaEmbed } from "@/components/creator/media-embed";
import { CreatorContentCard } from "@/components/creator/content-card";
import { ExternalPostLink } from "@/components/creator/external-post-link";
import { ShareActions } from "@/components/creator/share-actions";
import { Badge } from "@/components/ui/badge";
import { safeGetCreatorBySlug, safeGetRelatedContent } from "@/lib/firestore/public";
import { breadcrumbSchema, creatorArticleSchema } from "@/lib/seo/schema";
import { buildPageMetadata, normalizePageTitle, pageSchema } from "@/lib/seo/metadata";
import { formatDate, resolveAbsoluteUrl } from "@/lib/utils";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await safeGetCreatorBySlug(slug);

  if (!item) {
    return buildPageMetadata({
      title: "Creator Content Not Found",
      path: `/creator/${slug}`
    });
  }

  const title = normalizePageTitle(item.seoTitle || `${item.contentTitle} | Creator`);
  const description = item.seoDesc || item.hook || item.body.slice(0, 150);
  const ogImage = item.ogImage || resolveAbsoluteUrl(`/api/og/creator?title=${encodeURIComponent(item.contentTitle)}&platform=${item.platform}`);
  const metadata = buildPageMetadata({
    title,
    description,
    path: `/creator/${item.slug}`,
    image: ogImage,
    type: "article",
    keywords: item.tags
  });

  return {
    ...metadata,
    robots: item.visibility === "unlisted" ? { index: false, follow: false } : undefined,
    openGraph: {
      ...(metadata.openGraph ?? {}),
      type: "article",
      publishedTime: item.publishedAt || undefined,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }]
    }
  };
}

export default async function CreatorItemPage({ params }: Props) {
  const { slug } = await params;
  const item = await safeGetCreatorBySlug(slug);

  if (!item) {
    notFound();
  }

  const related = await safeGetRelatedContent({
    currentSlug: item.slug,
    pillar: item.pillar,
    tags: item.tags,
    limit: 3
  });

  const canonical = resolveAbsoluteUrl(`/creator/${item.slug}`);
  const articleJsonLd = creatorArticleSchema({
    title: item.seoTitle || item.contentTitle,
    description: item.seoDesc || item.hook || item.body.slice(0, 150),
    slug: item.slug,
    publishedAt: item.publishedAt || new Date().toISOString(),
    updatedAt: item.updatedAt,
    image: item.ogImage,
    keywords: item.tags
  });

  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Creator", url: resolveAbsoluteUrl("/creator") },
    { name: item.contentTitle, url: canonical }
  ]);
  const webPageJsonLd = pageSchema({
    title: item.contentTitle,
    description: item.seoDesc || item.hook || item.body.slice(0, 150),
    path: `/creator/${item.slug}`
  });

  return (
    <article className="container py-16 md:py-20">
      <CreatorItemAnalytics slug={item.slug} platform={item.platform} />
      <div className="max-w-4xl space-y-8">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{item.platform}</Badge>
            <Badge variant="secondary">{item.pillar}</Badge>
            <Badge variant="outline">{item.contentType}</Badge>
          </div>
          <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">{item.contentTitle}</h1>
          <p className="text-sm text-muted-foreground">Published {formatDate(item.publishedAt)}</p>
          <ShareActions url={canonical} title={item.contentTitle} />
        </div>

        <CreatorMediaEmbed externalUrl={item.externalUrl} media={item.media} />

        {item.visibility === "public" ? (
          <section className="prose-custom space-y-6 rounded-3xl border border-border/70 bg-card/75 p-6 text-foreground/90">
            {item.hook ? (
              <div>
                <h2>Hook</h2>
                <p>{item.hook}</p>
              </div>
            ) : null}
            {item.body ? (
              <div>
                <h2>Body / Script</h2>
                <p>{item.body}</p>
              </div>
            ) : null}
            {item.cta ? (
              <div>
                <h2>CTA</h2>
                <p>{item.cta}</p>
              </div>
            ) : null}
            {item.hashtags.length ? (
              <p className="text-sm text-muted-foreground">{item.hashtags.map((tag) => `#${tag}`).join(" ")}</p>
            ) : null}
          </section>
        ) : (
          <section className="rounded-3xl border border-border/70 bg-card/75 p-6">
            <p className="text-sm text-muted-foreground">
              This content is unlisted. Full script content is hidden from public listings.
            </p>
          </section>
        )}

        {item.externalUrl ? <ExternalPostLink url={item.externalUrl} platform={item.platform} /> : null}

        <section className="space-y-4">
          <h2 className="font-serif text-3xl text-foreground">Related Content</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {related.length ? (
              related.map((entry) => <CreatorContentCard key={entry.id} item={entry} />)
            ) : (
              <p className="text-sm text-muted-foreground">No related items yet.</p>
            )}
          </div>
        </section>

        <Link href="/creator" className="inline-flex text-sm font-medium text-[hsl(var(--accent-strong))] hover:underline">
          Back to creator feed
        </Link>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </article>
  );
}
