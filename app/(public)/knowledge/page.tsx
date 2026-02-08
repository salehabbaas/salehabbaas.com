import Link from "next/link";
import { Metadata } from "next";

import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { blogPosts } from "@/lib/data/blog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Knowledge | Saleh Abbaas",
  description: "Knowledge base and blog posts by Saleh Abbaas."
};

export default function KnowledgePage() {
  return (
    <SectionShell title="Knowledge / Blog" description="Thoughts on engineering systems, growth strategy, and creator workflows.">
      <div className="space-y-4">
        {blogPosts.map((post) => (
          <Card key={post.slug} className="bg-white/85">
            <CardHeader>
              <CardTitle className="text-2xl">{post.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{formatDate(post.date)}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{post.excerpt}</p>
              <Link href={`/knowledge#${post.slug}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                Read article
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}
