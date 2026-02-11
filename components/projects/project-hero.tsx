"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, ShieldCheck, Workflow } from "lucide-react";

import type { ProjectContent } from "@/types/cms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

function deriveFocus(tags: string[]) {
  const normalized = tags.map((t) => t.toLowerCase());
  const has = (value: string) => normalized.includes(value);

  if (has("hl7") || has("fhir") || has("rhapsody") || has("mirth")) return "Interoperability";
  if (has("data-platform") || has("analytics") || has("postgresql")) return "Clinical Data Platform";
  if (has("observability") || has("power-bi")) return "Operational Analytics";
  return "Platform Engineering";
}

export function ProjectHero({ project, className }: { project: ProjectContent; className?: string }) {
  const reducedMotion = useReducedMotion();
  const focus = deriveFocus(project.tags);

  return (
    <motion.section
      layout
      layoutId={`project-card-${project.slug}`}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}
      className={cn("relative overflow-hidden rounded-[2.25rem] border border-border/70 bg-card/75 shadow-elev3", className)}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 noise-overlay" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--accent)/0.22),transparent_55%),radial-gradient(circle_at_85%_0%,hsl(var(--primary)/0.18),transparent_52%)]" aria-hidden />

      <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border border-border/70 bg-card/80 text-foreground/90" variant="secondary">
              {focus}
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {project.status}
            </Badge>
          </div>

          <motion.h1
            layoutId={`project-title-${project.slug}`}
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }}
            className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl"
          >
            {project.title}
          </motion.h1>
          <p className="max-w-2xl text-lg leading-8 text-foreground/75">{project.description}</p>

          <div className="flex flex-wrap gap-2">
            {project.tags.slice(0, 8).map((tag) => (
              <Badge key={`${project.id}-${tag}`} variant="secondary" className="rounded-full">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
            {project.projectUrl ? (
              <Button asChild variant="cta">
                <Link href={project.projectUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Visit project
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <motion.div
          layoutId={`project-cover-${project.slug}`}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }}
          className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/75 shadow-elev2"
        >
          <div className="pointer-events-none absolute inset-0 opacity-40 noise-overlay" aria-hidden />
          {project.coverImage ? (
            <div className="relative aspect-[4/3]">
              <Image
                src={project.coverImage}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </div>
          ) : (
            <div className="aspect-[4/3] bg-[radial-gradient(circle_at_20%_30%,hsl(var(--accent)/0.28),transparent_55%),radial-gradient(circle_at_90%_10%,hsl(var(--primary)/0.22),transparent_55%),linear-gradient(135deg,hsl(var(--surface-925)),hsl(var(--surface-950)))]" />
          )}

          <div className="grid gap-3 border-t border-border/70 bg-card/70 p-5 backdrop-blur">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-elev1">
                <Workflow className="h-4 w-4 text-[hsl(var(--accent))]" aria-hidden />
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Scope</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Systems delivery</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-elev1">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--accent))]" aria-hidden />
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Posture</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Security-first</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-elev1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mode</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Production</p>
                <p className="mt-1 text-xs text-muted-foreground">Reliable + observable</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
