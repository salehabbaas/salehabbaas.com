import Link from "next/link";
import { Metadata } from "next";

import { CreatorContentCard } from "@/components/creator/content-card";
import { CreatorFilters } from "@/components/creator/creator-filters";
import { FollowBlock } from "@/components/creator/follow-block";
import { NewsletterForm } from "@/components/creator/newsletter-form";
import { SectionShell } from "@/components/site/section-shell";
import { Button } from "@/components/ui/button";
import { safeGetCreatorFeed, safeGetCreatorSettings, safeGetFeatured } from "@/lib/firestore/public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

export const revalidate = 300;

const CREATOR_DESCRIPTION =
  "Creator hub for Saleh Abbaas (Saleh Abbas): engineering insights, AI content, and platform-native growth systems.";

export const metadata: Metadata = buildPageMetadata({
  title: "Creator",
  description: CREATOR_DESCRIPTION,
  path: "/creator"
});

function normalizeSearchParam(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(path: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export default async function CreatorPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams;
  const page = Number(normalizeSearchParam(input.page) ?? "1");
  const pillar = normalizeSearchParam(input.pillar);
  const platform = normalizeSearchParam(input.platform);
  const type = normalizeSearchParam(input.type);

  const [settings, featured, feed] = await Promise.all([
    safeGetCreatorSettings(),
    safeGetFeatured(3),
    safeGetCreatorFeed({
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: 9,
      pillar,
      platform,
      type
    })
  ]);

  const previousPage = feed.page > 1 ? feed.page - 1 : null;
  const nextPage = feed.page < feed.totalPages ? feed.page + 1 : null;

  const webPageJsonLd = pageSchema({
    title: "Creator",
    description: CREATOR_DESCRIPTION,
    path: "/creator"
  });

  return (
    <SectionShell
      title="Creator"
      description="Saleh Abbaas content creator system: practical breakdowns on full-stack execution, Firebase architecture, and growth loops."
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-2xl text-foreground">Featured Content</h2>
            <p className="text-sm text-foreground/75">Pinned highlights from across platforms.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.length ? (
              featured.map((item) => <CreatorContentCard key={item.id} item={item} />)
            ) : (
              <p className="text-sm text-muted-foreground">No featured public content yet.</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-2xl text-foreground">Latest Content</h2>
            <p className="text-sm text-foreground/75">Filter by pillar, platform, and content type.</p>
          </div>
          <CreatorFilters
            activePillar={pillar}
            activePlatform={platform}
            activeType={type}
            pillars={settings.pillars}
            platforms={settings.platforms}
            types={["short_video", "carousel", "post", "thread", "article"]}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {feed.items.length ? (
              feed.items.map((item) => <CreatorContentCard key={item.id} item={item} />)
            ) : (
              <p className="text-sm text-muted-foreground">No public content found for this filter combination.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {previousPage ? (
              <Button variant="outline" asChild>
                <Link
                  href={buildHref("/creator", {
                    page: String(previousPage),
                    pillar,
                    platform,
                    type
                  })}
                >
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Previous
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              Page {feed.page} of {feed.totalPages}
            </p>
            {nextPage ? (
              <Button variant="outline" asChild>
                <Link
                  href={buildHref("/creator", {
                    page: String(nextPage),
                    pillar,
                    platform,
                    type
                  })}
                >
                  Next
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Next
              </Button>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {settings.newsletterEnabled ? <NewsletterForm /> : <div />}
          <FollowBlock socialLinks={settings.socialLinks} />
        </section>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </SectionShell>
  );
}
