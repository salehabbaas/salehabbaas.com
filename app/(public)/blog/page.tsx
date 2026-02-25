import Link from "next/link";
import { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { SectionShell } from "@/components/site/section-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ensurePublicPageVisible } from "@/lib/firestore/public-page-guard";
import { safeBlogPosts } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema, collectionPageSchema } from "@/lib/seo/schema";
import { formatDate, resolveAbsoluteUrl } from "@/lib/utils";

const BLOG_DESCRIPTION =
  "Blog by Saleh Abbaas on software engineering, AI delivery, healthcare interoperability, and practical systems architecture.";

export const metadata: Metadata = buildPageMetadata({
  title: "Saleh Abbaas Blog | Software Engineering Insights",
  description: BLOG_DESCRIPTION,
  path: "/blog"
});

export const revalidate = 300;

function normalizeSearchParam(value: string | string[] | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export default async function BlogPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensurePublicPageVisible("/blog");
  const input = await searchParams;
  const q = normalizeSearchParam(input.q).trim().toLowerCase();
  const blogPosts = await safeBlogPosts({ publishedOnly: true });
  const filteredPosts = q
    ? blogPosts.filter((post) =>
        [post.title, post.excerpt, ...(post.tags || [])].join(" ").toLowerCase().includes(q)
      )
    : blogPosts;

  const webPageJsonLd = pageSchema({
    title: "Blog",
    description: BLOG_DESCRIPTION,
    path: "/blog"
  });

  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Blog", url: resolveAbsoluteUrl("/blog") }
  ]);
  const collectionJsonLd = collectionPageSchema({
    path: "/blog",
    name: "Saleh Abbaas Blog",
    description: BLOG_DESCRIPTION
  });

  return (
    <SectionShell
      path="/blog"
      title="Blog by Saleh Abbaas"
      description="Technical writing on software engineering, AI systems, and healthcare interoperability from Ottawa, Ontario, Canada."
    >
      <div className="mb-6 rounded-2xl border border-border/70 bg-card/75 p-4 text-sm text-foreground/80">
        <p className="font-medium text-foreground">Explore related pages:</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/about" className="text-[hsl(var(--accent-strong))] hover:underline">
            About
          </Link>
          <Link href="/projects" className="text-[hsl(var(--accent-strong))] hover:underline">
            Projects
          </Link>
          <Link href="/services" className="text-[hsl(var(--accent-strong))] hover:underline">
            Services
          </Link>
        </div>
      </div>

      {q ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Search results for <span className="font-medium text-foreground">{q}</span>: {filteredPosts.length}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filteredPosts.length ? (
          filteredPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden bg-card/75">
              {post.coverImage ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border/70">
                  <Image
                    src={post.coverImage}
                    alt={`${post.title} cover image`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized={!post.coverImage.startsWith("/")}
                    className="object-cover"
                  />
                </div>
              ) : null}
              <CardHeader>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Blog Post</p>
                <CardTitle className="font-serif text-3xl leading-tight tracking-tight text-foreground">{post.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{formatDate(post.publishedAt || post.updatedAt)}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground/75">{post.excerpt}</p>
                <div className="flex flex-wrap gap-2">
                  {(post.tags || []).slice(0, 3).map((tag) => (
                    <Badge key={`${post.id}-${tag}`} variant="secondary" className="rounded-full border border-border/70 bg-card/80 text-foreground/75">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--accent-muted))] transition hover:text-[hsl(var(--accent-strong))]">
                  Read article
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No published blog posts yet. Publish posts from admin CMS.</p>
        )}
      </div>
      <JsonLd id="schema-blog-page" data={webPageJsonLd} />
      <JsonLd id="schema-blog-breadcrumb" data={breadcrumbJsonLd} />
      <JsonLd id="schema-blog-collection" data={collectionJsonLd} />
    </SectionShell>
  );
}
