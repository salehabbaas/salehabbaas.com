import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Network,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { safeExperiences } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

const EXPERIENCE_DESCRIPTION =
  "Professional experience of Saleh Abbaas (Saleh Abbas), a software engineer delivering HL7/FHIR integrations, clinical platforms, and AI-driven systems in Ottawa.";

export const metadata: Metadata = buildPageMetadata({
  title: "Experience",
  description: EXPERIENCE_DESCRIPTION,
  path: "/experience"
});

export const revalidate = 300;

type DomainItem = {
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
};

const domainItems: DomainItem[] = [
  {
    title: "Healthcare Interoperability",
    detail: "HL7/FHIR integration patterns, HIS/LIS workflows, and clinical system connectivity.",
    icon: Network
  },
  {
    title: "Production Operations",
    detail: "Incident response, service reliability, and measurable system-health visibility.",
    icon: Activity
  },
  {
    title: "Secure Delivery",
    detail: "Security-conscious architecture in regulated clinical and public-sector environments.",
    icon: ShieldCheck
  },
  {
    title: "Platform Modernization",
    detail: "Data platforms, automation, and practical modernization across legacy + cloud systems.",
    icon: Sparkles
  }
];

export default async function ExperiencePage() {
  const experiences = await safeExperiences();

  const rolesCount = experiences.length;
  const companiesCount = new Set(experiences.map((item) => item.company).filter(Boolean)).size;
  const years = experiences.flatMap((item) => [...extractYears(item.startDate), ...extractYears(item.endDate)]);
  const startYear = years.length ? Math.min(...years) : undefined;
  const endYear = years.length ? Math.max(...years) : undefined;

  const webPageJsonLd = pageSchema({
    title: "Experience",
    description: EXPERIENCE_DESCRIPTION,
    path: "/experience"
  });

  return (
    <section className="relative isolate overflow-hidden py-14 md:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(56,189,248,0.14),transparent_40%),radial-gradient(circle_at_88%_0%,rgba(16,185,129,0.12),transparent_36%),radial-gradient(circle_at_45%_100%,rgba(99,102,241,0.1),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.16]" />

      <div className="container relative z-10 space-y-10">
        <header className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-foreground/90">
              <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden />
              Experience
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Software Engineering Experience Across Healthcare, AI, and Secure Systems
            </h1>
            <p className="max-w-3xl text-base leading-8 text-foreground/75 md:text-lg">
              End-to-end delivery across hospitals, public-health programs, and enterprise platforms, with a focus on interoperability,
              reliability, and measurable outcomes.
            </p>
          </div>

          <Card className="border-border/70 bg-card/80 shadow-elev2 backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/75">Career Snapshot</p>
              <div className="grid gap-3 text-sm text-foreground/90 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-card/75 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Roles</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{rolesCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/75 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Companies</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{companiesCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/75 px-4 py-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Timeline</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {startYear && endYear ? `${startYear} - ${endYear}` : "Professional timeline"}
                  </p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/book-meeting">
                  Discuss a project
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {domainItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-border/70 bg-card/80 shadow-elev1">
                <CardContent className="space-y-3 p-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/90">
                    <Icon className="h-5 w-5 text-cyan-300" aria-hidden />
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">{item.title}</h2>
                  <p className="text-sm leading-7 text-foreground/75">{item.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Full Timeline</h2>
            <p className="text-sm text-muted-foreground">Ordered by most recent impact and delivery scope.</p>
          </div>

          {experiences.length ? (
            <div className="space-y-4">
              {experiences.map((experience, index) => {
                const period = [experience.startDate, experience.endDate].filter(Boolean).join(" - ");
                return (
                  <article
                    key={experience.id}
                    className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-5 shadow-elev1 backdrop-blur md:p-6"
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-cyan-300/75 via-blue-400/40 to-emerald-300/70" />

                    <div className="flex flex-wrap items-start justify-between gap-4 pl-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-border/80 text-foreground/90">
                            #{String(index + 1).padStart(2, "0")}
                          </Badge>
                          {period ? (
                            <Badge variant="secondary" className="border-border/70 bg-card/80 text-foreground">
                              <CalendarDays className="mr-1 h-3.5 w-3.5" aria-hidden />
                              {period}
                            </Badge>
                          ) : null}
                        </div>

                        <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                          {experience.role}
                        </h3>
                        <p className="inline-flex items-center gap-2 text-sm font-medium text-cyan-200">
                          <Building2 className="h-4 w-4" aria-hidden />
                          {experience.company}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4 pl-3">
                      <p className="text-sm leading-7 text-foreground/75 md:text-base">{experience.summary}</p>

                      {experience.achievements.length ? (
                        <ul className="grid gap-2 text-sm text-foreground/90 md:grid-cols-2">
                          {experience.achievements.map((achievement) => (
                            <li
                              key={achievement}
                              className="rounded-2xl border border-border/70 bg-card/75 px-3 py-2.5 leading-6 text-foreground/75"
                            >
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <Card className="border-border/70 bg-card/80">
              <CardContent className="p-6 text-sm text-muted-foreground">No experience entries yet. Add records from the admin CMS.</CardContent>
            </Card>
          )}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </section>
  );
}

function extractYears(value?: string) {
  if (!value) return [] as number[];
  const matches = value.match(/\b(19|20)\d{2}\b/g);
  if (!matches) return [] as number[];
  return matches.map((item) => Number(item));
}
