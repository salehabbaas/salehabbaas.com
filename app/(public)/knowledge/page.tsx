import Link from "next/link";
import { Metadata } from "next";

import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeBlogPosts } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = buildPageMetadata({
  title: "Knowledge",
  description: "Knowledge base and blog posts by Saleh Abbaas.",
  path: "/knowledge"
});

export const revalidate = 300;

export default async function KnowledgePage() {
  const blogPosts = await safeBlogPosts({ publishedOnly: true });

  const webPageJsonLd = pageSchema({
    title: "Knowledge",
    description: "Knowledge base and blog posts by Saleh Abbaas.",
    path: "/knowledge"
  });

  return (
    <SectionShell title="Knowledge / Blog" description="Thoughts on engineering systems, growth strategy, and creator workflows.">
      <div className="space-y-4">
        {blogPosts.length ? (
          blogPosts.map((post) => (
            <Card key={post.id} className="bg-card/85">
              <CardHeader>
                <CardTitle className="text-2xl">{post.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{formatDate(post.publishedAt || post.updatedAt)}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                <Link href={`/knowledge/${post.slug}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                  Read article
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
