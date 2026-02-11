import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { safeBlogPosts } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils";

const KNOWLEDGE_DESCRIPTION =
  "Technical blog by Saleh Abbaas (Saleh Abbas) on software engineering, healthcare interoperability, AI systems, and product delivery.";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog",
  description: KNOWLEDGE_DESCRIPTION,
  path: "/knowledge"
});

export const revalidate = 300;

export default async function KnowledgePage() {
  const blogPosts = await safeBlogPosts({ publishedOnly: true });

  const webPageJsonLd = pageSchema({
    title: "Blog",
    description: KNOWLEDGE_DESCRIPTION,
    path: "/knowledge"
  });

  return (
    <SectionShell title="Blog / Knowledge" description="Thoughts on engineering systems, growth strategy, and creator workflows.">
      <div className="grid gap-4 md:grid-cols-2">
        {blogPosts.length ? (
          blogPosts.map((post) => (
            <Card key={post.id} className="bg-card/75">
              <CardHeader>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Blog Post</p>
                <CardTitle className="text-2xl text-foreground">{post.title}</CardTitle>
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
                <Link href={`/knowledge/${post.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--accent-muted))] transition hover:text-[hsl(var(--accent-strong))]">
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </SectionShell>
  );
}
