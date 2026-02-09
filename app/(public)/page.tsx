import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Metadata } from "next";

import { CreatorFromHome } from "@/components/creator/creator-from-home";
import { HomeHero } from "@/components/site/home-hero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { highlights, keywords } from "@/lib/data/resume";
import { safeGetPublicTop } from "@/lib/firestore/public";
import { safeCertificates, safeExperiences, safeProfile, safeProjects, safeServices } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

export const revalidate = 300;

const homeMetadata = buildPageMetadata({
  title: "Home",
  description:
    "Software engineer specializing in healthcare interoperability, HL7/FHIR integrations, and clinical data platforms.",
  path: "/"
});

export const metadata: Metadata = {
  ...homeMetadata,
  title: { absolute: "Saleh Abbaas | Software Engineer" }
};

export default async function HomePage() {
  const [latestCreator, projects, profile, services, experiences, certificates] = await Promise.all([
    safeGetPublicTop(3),
    safeProjects({ publishedOnly: true }),
    safeProfile(),
    safeServices(),
    safeExperiences(),
    safeCertificates()
  ]);

  const webPageJsonLd = pageSchema({
    title: "Saleh Abbaas | Software Engineer",
    description:
      "Official personal website of Saleh Abbaas with healthcare interoperability, clinical data platforms, and professional services.",
    path: "/"
  });

  const stats = [
    { label: "Experience", value: "5+ years" },
    { label: "Healthcare focus", value: "4+ years" },
    { label: "Accuracy gains", value: "98%" },
    { label: "Users supported", value: "3,000+" }
  ];

  return (
    <>
      <HomeHero
        name={profile.name || "Saleh Abbaas"}
        headline={profile.headline || "Software Engineer"}
        bio={profile.bio || "I design and build secure healthcare integrations and data platforms."}
        location={profile.location}
        resumeUrl={profile.resumeUrl}
        avatarUrl={profile.avatarUrl}
        highlights={highlights}
        stats={stats}
        keywords={keywords}
      />

      <section className="container py-14">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-primary/80">About</p>
            <h2 className="font-serif text-3xl">Healthcare interoperability with product-grade execution</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {profile.bio ||
                "I help healthcare teams connect data across clinical systems, automate laboratory workflows, and ship analytics that improve decision-making and patient outcomes."}
            </p>
            <div className="flex flex-wrap gap-2">
              {keywords.slice(0, 8).map((keyword) => (
                <Badge key={keyword} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">Core impact</p>
            <p className="mt-4 text-lg leading-relaxed text-cyan-50/90">
              From HL7/FHIR interfaces to clinical analytics, I translate regulated requirements into resilient systems that ship and scale.
            </p>
            <div className="mt-6 grid gap-3">
              {highlights.map((highlight) => (
                <div key={highlight} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
                  {highlight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-primary/80">Experience</p>
            <h2 className="mt-2 font-serif text-3xl">Clinical systems, public health, and interoperability</h2>
          </div>
          <Link href="/experience" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
            Full timeline <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-4">
          {experiences.map((experience) => (
            <Card key={experience.id} className="rounded-3xl border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle className="text-xl">
                  {experience.role} · {experience.company}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {experience.startDate || ""} {experience.endDate ? `- ${experience.endDate}` : ""}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/85">{experience.summary}</p>
                {!!experience.achievements.length && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {experience.achievements.slice(0, 4).map((achievement) => (
                      <li key={achievement}>{achievement}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container pb-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-primary/80">Featured Projects</p>
            <h2 className="mt-2 font-serif text-3xl">Platforms built for accuracy and scale</h2>
          </div>
          <Link href="/projects" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {projects.slice(0, 4).map((project) => (
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
              <h2 className="mt-2 font-serif text-3xl">Engineering that meets clinical-grade reliability</h2>
            </div>
            <Link href="/services" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
              All services <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {services.slice(0, 4).map((service) => (
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

      {certificates.length ? (
        <section className="container pb-16">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.22em] text-primary/80">Credentials</p>
            <h2 className="mt-2 font-serif text-3xl">Certifications and training</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.slice(0, 4).map((certificate) => (
              <Card key={certificate.id} className="rounded-3xl border-border/70 bg-card/85">
                <CardHeader>
                  <CardTitle className="text-lg">{certificate.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{certificate.issuer}</p>
                  {certificate.year ? <p className="mt-1">{certificate.year}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {latestCreator.length ? <CreatorFromHome items={latestCreator} /> : null}

      <section className="container pb-20">
        <div className="rounded-[2rem] border border-border/70 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-8 text-white md:p-10">
          <h2 className="font-serif text-3xl">Let&apos;s build your next clinical-grade system.</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-200">
            I help healthcare teams move data securely, automate workflows, and ship analytics that drive measurable outcomes.
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
