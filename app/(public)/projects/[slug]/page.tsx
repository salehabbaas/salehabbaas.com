import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarDays } from "lucide-react";

import { CreatorContentCard } from "@/components/creator/content-card";
import { ProjectHero } from "@/components/projects/project-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeGetRelatedContent } from "@/lib/firestore/public";
import { safeBlogPosts, safeProjectBySlug, safeProjects } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { formatDate, resolveAbsoluteUrl, truncate } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

function hasOverlap(a: string[], b: string[]) {
  const set = new Set(a.map((t) => t.toLowerCase()));
  return b.some((t) => set.has(t.toLowerCase()));
}

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

  const [relatedPosts, projects, knowledge] = await Promise.all([
    safeGetRelatedContent({
      currentSlug: project.slug,
      pillar: "Software",
      tags: project.tags,
      limit: 3
    }),
    safeProjects({ publishedOnly: true }),
    safeBlogPosts({ publishedOnly: true })
  ]);

  const relatedProjects = projects
    .filter((p) => p.slug !== project.slug)
    .filter((p) => hasOverlap(project.tags, p.tags))
    .slice(0, 3);

  const relatedKnowledge = knowledge
    .filter((post) => hasOverlap(project.tags, post.tags || []))
    .slice(0, 3);

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
    <section className="container py-16 md:py-20">
      <ProjectHero project={project} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <Card className="bg-card/75">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl text-foreground">Overview</CardTitle>
              <p className="text-sm text-foreground/75">
                What was built, why it matters, and how it performs in production.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-8 text-foreground/75">
                {project.longDescription?.trim()
                  ? project.longDescription
                  : "A production-first build focused on reliability, data quality, and standards-aware interoperability workflows."}
              </p>

              <div className="flex flex-wrap gap-2">
                {project.tags.slice(0, 10).map((tag) => (
                  <Badge key={`${project.id}-${tag}`} variant="secondary" className="rounded-full">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card/75">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Problem</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-foreground/75">
                  Clinical data arrives fragmented across systems with inconsistent formats, incomplete context, and workflow-critical timing.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/75">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Approach</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-foreground/75">
                  Define a canonical model, validate aggressively, make pipelines replay-safe, and ship observability that operators can trust.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/75">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-foreground/75">
                  Higher confidence in downstream workflows through traceability, error isolation, and consistent delivery patterns across integrations.
                </p>
              </CardContent>
            </Card>
          </section>

          <Card className="bg-card/75">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Architecture Highlights</CardTitle>
              <p className="text-sm text-foreground/75">Patterns I default to for interoperability and clinical platforms.</p>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 text-sm text-foreground/75 md:grid-cols-2">
                <li className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-elev1">
                  Canonical mapping + validation with safe error routing and replay support.
                </li>
                <li className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-elev1">
                  Idempotent processing with audit-friendly traceability and data quality guardrails.
                </li>
                <li className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-elev1">
                  Least-privilege boundaries and secure integration patterns suitable for regulated environments.
                </li>
                <li className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-elev1">
                  Operator-grade observability: dashboards, alerting, and actionable failure modes.
                </li>
              </ul>
            </CardContent>
          </Card>

          {relatedKnowledge.length ? (
            <Card className="bg-card/75">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">Related Knowledge</CardTitle>
                <p className="text-sm text-foreground/75">Articles connected by domain and tags.</p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {relatedKnowledge.map((post) => (
                  <Link
                    key={post.id}
                    href={`/knowledge/${post.slug}`}
                    className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-elev1 transition hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-sm font-semibold tracking-tight text-foreground">{post.title}</p>
                    <p className="mt-2 text-sm leading-7 text-foreground/75">{truncate(post.excerpt, 120)}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{formatDate(post.publishedAt || post.updatedAt)}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Card className="bg-card/75">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Related Creator Posts</CardTitle>
              <p className="text-sm text-foreground/75">Short-form breakdowns and platform notes.</p>
            </CardHeader>
            <CardContent className="grid gap-4">
              {relatedPosts.length ? (
                relatedPosts.map((item) => <CreatorContentCard key={item.id} item={item} />)
              ) : (
                <p className="text-sm text-muted-foreground">No related public creator posts yet.</p>
              )}
            </CardContent>
          </Card>

          {relatedProjects.length ? (
            <Card className="bg-card/75">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Related Projects</CardTitle>
                <p className="text-sm text-foreground/75">More case studies with similar tags.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-card/75 p-4 shadow-elev1 transition hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div>
                      <p className="text-sm font-semibold tracking-tight text-foreground">{p.title}</p>
                      <p className="mt-1 text-sm text-foreground/75">{truncate(p.description, 110)}</p>
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 text-muted-foreground" aria-hidden />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="bg-card/75">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Build With Me</CardTitle>
              <p className="text-sm text-foreground/75">Need interoperability or clinical platform support?</p>
            </CardHeader>
            <CardContent>
              <Button asChild variant="cta" className="w-full">
                <Link href="/book-meeting">
                  <CalendarDays className="h-4 w-4" />
                  Book a Meeting
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </section>
  );
}
