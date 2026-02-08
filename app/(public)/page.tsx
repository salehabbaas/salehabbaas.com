import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Metadata } from "next";

import { CreatorFromHome } from "@/components/creator/creator-from-home";
import { PageHero } from "@/components/site/page-hero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeGetPublicTop } from "@/lib/firestore/public";
import { safeProfile, safeProjects, safeServices } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

export const revalidate = 300;

const homeMetadata = buildPageMetadata({
  title: "Home",
  description:
    "Saleh Abbaas is a software engineer, Firebase architect, and growth engineer building premium product systems.",
  path: "/"
});

export const metadata: Metadata = {
  ...homeMetadata,
  title: { absolute: "Saleh Abbaas | Software Engineer" }
};

export default async function HomePage() {
  const [latestCreator, projects, profile, services] = await Promise.all([
    safeGetPublicTop(3),
    safeProjects({ publishedOnly: true }),
    safeProfile(),
    safeServices()
  ]);

  const webPageJsonLd = pageSchema({
    title: "Saleh Abbaas | Software Engineer",
    description:
      "Official personal website of Saleh Abbaas with projects, creator content, services, and contact information.",
    path: "/"
  });

  return (
    <>
      <PageHero
        name={profile.name || "Saleh Abbaas"}
        headline={profile.headline || "Software Engineer"}
        bio={profile.bio}
        location={profile.location}
        resumeUrl={profile.resumeUrl}
      />

      <section className="container pb-10">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl border-border/70 bg-card/80 backdrop-blur">
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Projects</p>
              <p className="mt-2 text-3xl font-semibold">{projects.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Production systems across product, creator, and growth operations.</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border/70 bg-card/80 backdrop-blur">
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Service Lines</p>
              <p className="mt-2 text-3xl font-semibold">{services.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Engineering, architecture, and SEO-focused delivery.</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border/70 bg-card/80 backdrop-blur">
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Creator Feed</p>
              <p className="mt-2 text-3xl font-semibold">{latestCreator.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Latest public content connected directly to measurable outcomes.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container pb-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-primary/80">Featured Projects</p>
            <h2 className="mt-2 font-serif text-3xl">Systems built for scale and visibility</h2>
          </div>
          <Link href="/projects" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {projects.slice(0, 3).map((project) => (
            <Card
              key={project.id}
              className="group rounded-3xl border-border/70 bg-gradient-to-b from-card/95 to-card/70 transition hover:-translate-y-1 hover:border-primary/40"
            >
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl">{project.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {(project.tags || []).slice(0, 3).map((tag) => (
                    <Badge key={`${project.id}-${tag}`} variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{project.description}</p>
                <Link
                  href={`/projects/${project.slug}`}
                  className="mt-5 inline-flex items-center text-sm font-medium text-primary transition group-hover:translate-x-0.5"
                >
                  View project
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {services.length ? (
        <section className="container pb-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-primary/80">Core Services</p>
              <h2 className="mt-2 font-serif text-3xl">Engineering that ships with measurable impact</h2>
            </div>
            <Link href="/services" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
              All services <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {services.slice(0, 3).map((service) => (
              <Card key={service.id} className="rounded-3xl border-border/70 bg-card/85">
                <CardHeader>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{service.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {latestCreator.length ? <CreatorFromHome items={latestCreator} /> : null}

      <section className="container pb-20">
        <div className="rounded-[2rem] border border-border/70 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 p-8 text-white md:p-10">
          <h2 className="font-serif text-3xl">Let&apos;s build your next growth-ready product.</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-200">
            From architecture to polished launch, I build systems that convert strategy into measurable outcomes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900">
              Start now
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white"
            >
              View services
            </Link>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </>
  );
}
