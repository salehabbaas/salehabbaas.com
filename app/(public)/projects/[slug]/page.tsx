import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorContentCard } from "@/components/creator/content-card";
import { SectionShell } from "@/components/site/section-shell";
import { projects } from "@/lib/data/resume";
import { safeGetRelatedContent } from "@/lib/firestore/public";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((entry) => entry.slug === slug);
  if (!project) {
    return { title: "Project not found | Saleh Abbaas" };
  }

  return {
    title: `${project.title} | Projects | Saleh Abbaas`,
    description: project.description
  };
}

export default async function ProjectDetailsPage({ params }: Props) {
  const { slug } = await params;
  const project = projects.find((entry) => entry.slug === slug);
  if (!project) {
    notFound();
  }

  const relatedPosts = await safeGetRelatedContent({
    currentSlug: "",
    pillar: "Engineering",
    tags: project.tags,
    limit: 3
  });

  return (
    <SectionShell title={project.title} description={project.description}>
      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <p className="text-foreground/85">
            This project combines pragmatic architecture, product design, and analytics instrumentation to ensure measurable
            outcomes. It was designed to remain maintainable while scaling traffic and operational complexity.
          </p>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-sm">
                {tag}
              </span>
            ))}
          </div>
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
    </SectionShell>
  );
}
