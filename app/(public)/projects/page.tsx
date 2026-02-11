import { Metadata } from "next";
import { FolderKanban, Sparkles, Tags, Workflow } from "lucide-react";

import { ProjectsExplorer } from "@/components/projects/projects-explorer";
import { safeProjects } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

const PROJECTS_DESCRIPTION =
  "View projects by Saleh Abbaas (Saleh Abbas), including healthcare integrations, AI workflows, and production cloud engineering case studies.";

export const metadata: Metadata = buildPageMetadata({
  title: "Projects",
  description: PROJECTS_DESCRIPTION,
  path: "/projects"
});

export const revalidate = 300;

function normalizeSearchParam(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams;
  const initialQuery = normalizeSearchParam(input.q);
  const projects = await safeProjects({ publishedOnly: true });

  const webPageJsonLd = pageSchema({
    title: "Projects",
    description: PROJECTS_DESCRIPTION,
    path: "/projects"
  });

  return (
    <section className="container py-16 md:py-20">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="space-y-5">
          <p className="w-fit rounded-full border border-border/70 bg-card/80 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-foreground/75">
            Projects
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Case studies for clinical platforms, integrations, and data systems.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-foreground/75">
            Production-first work across HL7/FHIR interoperability, pipeline reliability, and measurable outcomes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/75 p-5 shadow-elev1">
            <FolderKanban className="h-5 w-5 text-[hsl(var(--accent))]" aria-hidden />
            <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">Case studies</p>
            <p className="mt-1 text-sm text-foreground/75">Architecture, delivery, and impact</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card/75 p-5 shadow-elev1">
            <Tags className="h-5 w-5 text-[hsl(var(--accent))]" aria-hidden />
            <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">Tags + filters</p>
            <p className="mt-1 text-sm text-foreground/75">Find work by domain and stack</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card/75 p-5 shadow-elev1">
            <Workflow className="h-5 w-5 text-[hsl(var(--accent))]" aria-hidden />
            <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">Interoperability</p>
            <p className="mt-1 text-sm text-foreground/75">Standards-aware integrations</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card/75 p-5 shadow-elev1">
            <Sparkles className="h-5 w-5 text-[hsl(var(--accent))]" aria-hidden />
            <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">Motion-first UI</p>
            <p className="mt-1 text-sm text-foreground/75">Animated reflow and transitions</p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        {projects.length ? (
          <ProjectsExplorer projects={projects} initialQuery={initialQuery} />
        ) : (
          <div className="rounded-[2rem] border border-border/70 bg-card/75 p-8 text-center text-sm text-muted-foreground shadow-elev2">
            Add projects from the admin CMS to populate this page.
          </div>
        )}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </section>
  );
}
