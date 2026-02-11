import Link from "next/link";
import type { Metadata } from "next";

import { CreatorContentCard } from "@/components/creator/content-card";
import { SectionShell } from "@/components/site/section-shell";
import { Button } from "@/components/ui/button";
import { safeGetCreatorFeed } from "@/lib/firestore/public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

export const revalidate = 300;

const AI_NEWS_DESCRIPTION =
  "AI news and explainers by Saleh Abbaas (Saleh Abbas), with short-form updates on AI tools, trends, and practical engineering takeaways.";

export const metadata: Metadata = buildPageMetadata({
  title: "AI News",
  description: AI_NEWS_DESCRIPTION,
  path: "/ai-news"
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

export default async function AINewsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams;
  const page = Number(normalizeSearchParam(input.page) ?? "1");

  const feed = await safeGetCreatorFeed({
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 12,
    pillar: "AI"
  });

  const previousPage = feed.page > 1 ? feed.page - 1 : null;
  const nextPage = feed.page < feed.totalPages ? feed.page + 1 : null;

  const webPageJsonLd = pageSchema({
    title: "AI News",
    description: AI_NEWS_DESCRIPTION,
    path: "/ai-news"
  });

  return (
    <SectionShell
      title="AI News"
      description="Short, high-signal AI updates republished from my creator workflow. Each post links back to the full creator entry."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground/75">
            Want the full feed across pillars?{" "}
            <Link href="/creator" className="font-medium text-[hsl(var(--accent-strong))] hover:underline">
              Creator hub
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {feed.items.length ? (
            feed.items.map((item) => <CreatorContentCard key={item.id} item={item} />)
          ) : (
            <p className="text-sm text-muted-foreground">No public AI posts yet.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {previousPage ? (
            <Button variant="outline" asChild>
              <Link href={buildHref("/ai-news", { page: String(previousPage) })}>Previous</Link>
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
              <Link href={buildHref("/ai-news", { page: String(nextPage) })}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Next
            </Button>
          )}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </SectionShell>
  );
}
