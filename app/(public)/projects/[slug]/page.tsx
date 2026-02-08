import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorContentCard } from "@/components/creator/content-card";
import { SectionShell } from "@/components/site/section-shell";
import { safeGetRelatedContent } from "@/lib/firestore/public";
import { safeProjectBySlug } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await safeProjectBySlug(slug);
  if (!project) {
    return buildPageMetadata({ title: "Project Not Found", path: `/projects/${slug}` });
  }

  return buildPageMetadata({
    title: project.title,
    description: project.description,
    path: `/projects/${project.slug}`,
    image: project.coverImage
  });
}

export default async function ProjectDetailsPage({ params }: Props) {
  const { slug } = await params;
  const project = await safeProjectBySlug(slug);
  if (!project || project.status !== "published") {
    notFound();
  }

  const relatedPosts = await safeGetRelatedContent({
    currentSlug: "",
    pillar: "Software",
    tags: project.tags,
    limit: 3
  });

  const webPageJsonLd = pageSchema({
    title: project.title,
    description: project.description,
    path: `/projects/${project.slug}`
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Projects", url: resolveAbsoluteUrl("/projects") },
    { name: project.title, url: resolveAbsoluteUrl(`/projects/${project.slug}`) }
  ]);

  return (
    <SectionShell title={project.title} description={project.description}>
      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <p className="text-foreground/85">
            {project.longDescription ||
              "This project combines pragmatic architecture, product design, and analytics instrumentation to ensure measurable outcomes."}
          </p>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-sm">
                {tag}
              </span>
            ))}
          </div>
          {project.projectUrl ? (
            <Link href={project.projectUrl} target="_blank" className="inline-flex text-sm font-medium text-primary hover:underline">
              Visit project
            </Link>
          ) : null}
          <Link href="/projects" className="inline-flex text-sm font-medium text-primary hover:underline">
            Back to projects
          </Link>
        </div>
        <div className="space-y-3">
          <h2 className="font-serif text-2xl">Related creator posts</h2>
          {relatedPosts.length ? (
            relatedPosts.map((item) => <CreatorContentCard key={item.id} item={item} />)
          ) : (
            <p className="text-sm text-muted-foreground">No related public creator posts yet.</p>
          )}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </SectionShell>
  );
}
