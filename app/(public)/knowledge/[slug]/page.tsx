import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { breadcrumbSchema } from "@/lib/seo/schema";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/firestore/cms";
import { formatDate, resolveAbsoluteUrl } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return buildPageMetadata({ title: "Blog Post Not Found", path: `/knowledge/${slug}` });
  }

  return buildPageMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDesc || post.excerpt,
    path: `/knowledge/${slug}`,
    image: post.coverImage,
    type: "article"
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const related = (await getBlogPosts({ publishedOnly: true }))
    .filter((entry) => entry.slug !== slug)
    .filter((entry) => entry.tags.some((tag) => post.tags.includes(tag)))
    .slice(0, 3);

  const canonical = resolveAbsoluteUrl(`/knowledge/${post.slug}`);
  const webPageJsonLd = pageSchema({
    title: post.title,
    description: post.excerpt,
    path: `/knowledge/${post.slug}`
  });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      "@type": "Person",
      name: "Saleh Abbaas"
    },
    publisher: {
      "@type": "Person",
      name: "Saleh Abbaas"
    },
    image: post.coverImage ? [post.coverImage] : [resolveAbsoluteUrl(`/api/og/page?title=${encodeURIComponent(post.title)}`)],
    mainEntityOfPage: canonical
  };

  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Knowledge", url: resolveAbsoluteUrl("/knowledge") },
    { name: post.title, url: canonical }
  ]);

  return (
    <article className="container py-16 md:py-20">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{post.title}</h1>
        <p className="text-sm text-muted-foreground">{formatDate(post.publishedAt)}</p>
        <p className="text-lg text-foreground/80">{post.excerpt}</p>

        <section className="prose-custom whitespace-pre-wrap rounded-3xl border border-border/70 bg-card/80 p-6">{post.body}</section>

        {related.length ? (
          <section className="space-y-3">
            <h2 className="font-serif text-2xl">Related posts</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {related.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/knowledge/${entry.slug}`}
                  className="rounded-2xl border border-border/70 bg-card/80 p-4 text-sm hover:border-primary"
                >
                  <p className="font-semibold">{entry.title}</p>
                  <p className="mt-2 text-muted-foreground">{entry.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <Link href="/knowledge" className="inline-flex text-sm font-medium text-primary hover:underline">
          Back to Knowledge
        </Link>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </article>
  );
}
