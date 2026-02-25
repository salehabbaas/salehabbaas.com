import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BookOpenText } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/firestore/cms";
import { ensurePublicPageVisible } from "@/lib/firestore/public-page-guard";
import { buildPageMetadata, defaultRobotsMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { formatDate, resolveAbsoluteUrl } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return buildPageMetadata({
      title: "Blog Post Not Found",
      path: `/blog/${slug}`,
      robots: defaultRobotsMetadata(false)
    });
  }

  return buildPageMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDesc || post.excerpt,
    path: `/blog/${slug}`,
    image: post.coverImage,
    type: "article"
  });
}

export default async function BlogPostPage({ params }: Props) {
  await ensurePublicPageVisible("/blog");
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const related = (await getBlogPosts({ publishedOnly: true }))
    .filter((entry) => entry.slug !== slug)
    .filter((entry) => entry.tags.some((tag) => post.tags.includes(tag)))
    .slice(0, 3);

  const canonical = resolveAbsoluteUrl(`/blog/${post.slug}`);
  const webPageJsonLd = pageSchema({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`
  });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@id": "https://salehabbaas.com/#person" },
    publisher: { "@id": "https://salehabbaas.com/#person" },
    image: post.coverImage ? [post.coverImage] : [resolveAbsoluteUrl(`/api/og/page?title=${encodeURIComponent(post.title)}`)],
    mainEntityOfPage: canonical
  };

  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Blog", url: resolveAbsoluteUrl("/blog") },
    { name: post.title, url: canonical }
  ]);

  return (
    <article className="container pb-16 pt-20 md:pb-20 md:pt-24">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-foreground/90">
          <BookOpenText className="h-3.5 w-3.5" aria-hidden />
          Blog
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          {post.title}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDate(post.publishedAt)}</p>
        <p className="text-lg text-foreground/75">{post.excerpt}</p>

        {post.coverImage ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-border/70 bg-card/75">
            <Image
              src={post.coverImage}
              alt={`${post.title} cover image`}
              fill
              sizes="(max-width: 900px) 100vw, 900px"
              unoptimized={!post.coverImage.startsWith("/")}
              className="object-cover"
              priority
            />
          </div>
        ) : null}

        <section className="prose-custom whitespace-pre-wrap rounded-3xl border border-border/70 bg-card/75 p-6 text-foreground/90">
          {post.body}
        </section>

        {related.length ? (
          <section className="space-y-3">
            <h2 className="font-serif text-2xl text-foreground">Related posts</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {related.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/blog/${entry.slug}`}
                  className="rounded-2xl border border-border/70 bg-card/75 p-4 text-sm text-foreground/90 transition hover:border-[hsl(var(--accent))]"
                >
                  <p className="font-semibold text-foreground">{entry.title}</p>
                  <p className="mt-2 text-muted-foreground">{entry.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <Link href="/blog" className="inline-flex text-sm font-medium text-[hsl(var(--accent-strong))] hover:underline">
          Back to Blog
        </Link>
      </div>
      <JsonLd id="schema-blog-post-page" data={webPageJsonLd} />
      <JsonLd id="schema-blog-post-article" data={articleJsonLd} />
      <JsonLd id="schema-blog-post-breadcrumb" data={breadcrumbJsonLd} />
    </article>
  );
}
