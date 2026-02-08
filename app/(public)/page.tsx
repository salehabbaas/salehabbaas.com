import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CreatorFromHome } from "@/components/creator/creator-from-home";
import { PageHero } from "@/components/site/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { projects } from "@/lib/data/resume";
import { safeGetPublicTop } from "@/lib/firestore/public";

export const revalidate = 300;

export default async function HomePage() {
  const latestCreator = await safeGetPublicTop(3);

  return (
    <>
      <PageHero />

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

        <div className="grid gap-4 md:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.slug} className="border-border/70 bg-white/80">
              <CardHeader>
                <CardTitle className="text-xl">{project.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{project.description}</p>
                <Link href={`/projects/${project.slug}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                  View project
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {latestCreator.length ? <CreatorFromHome items={latestCreator} /> : null}

      <section className="container pb-20">
        <div className="rounded-[2rem] border border-border/70 bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white md:p-10">
          <h2 className="font-serif text-3xl">Let&apos;s build your next growth-ready product.</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-200">
            From architecture to polished launch, I build systems that convert strategy into measurable outcomes.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900"
          >
            Start now
          </Link>
        </div>
      </section>
    </>
  );
}
