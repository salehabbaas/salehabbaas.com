"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FeaturedProjectsCarousel } from "@/components/site/home/featured-projects-carousel";
import { homeFadeUp, homeStagger, homeViewport } from "@/lib/motion/home";
import type { HomeFeaturedProjectsProps } from "@/components/site/home/types";

function resolveProjectDomain(tags: string[]) {
  const normalized = tags.map((tag) => tag.toLowerCase());
  if (normalized.some((tag) => ["hl7", "fhir", "healthcare", "lis", "his"].includes(tag))) {
    return "Healthcare Integration";
  }
  if (normalized.some((tag) => ["analytics", "data-platform", "postgresql"].includes(tag))) {
    return "Clinical Data";
  }
  return "Platform Engineering";
}

export function FeaturedProjects({ projects, enableCarousel }: HomeFeaturedProjectsProps) {
  if (!projects.length) return null;

  return (
    <section className="bg-background pb-20">
      <div className="container">
        <motion.div variants={homeStagger} initial="hidden" whileInView="visible" viewport={homeViewport} className="space-y-10">
          <motion.div variants={homeFadeUp} className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Featured Projects</p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Selected work delivering reliability for clinical operations.
              </h2>
            </div>
            <Link href="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition hover:text-foreground">
              Explore all projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div variants={homeStagger} className="grid gap-5 md:grid-cols-2">
            {projects.slice(0, 4).map((project) => (
              <motion.article
                key={project.id}
                variants={homeFadeUp}
                whileHover={{ y: -5, transition: { duration: 0.35, ease: "easeOut" } }}
                className="group rounded-3xl border border-primary/20 bg-primary/10 p-6 shadow-[0_22px_70px_-40px_rgba(0,128,128,0.5)] transition-shadow hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{resolveProjectDomain(project.tags)}</p>
                <h3 className="mt-3 text-xl font-medium text-foreground">{project.title}</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/75">{project.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {project.tags.slice(0, 3).map((tag) => (
                    <Badge key={`${project.id}-${tag}`} variant="secondary" className="rounded-full border border-primary/20 bg-primary/10 text-foreground/75">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Link
                  href={`/projects/${project.slug}`}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary transition group-hover:text-foreground"
                >
                  Open case study
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.article>
            ))}
          </motion.div>

          {enableCarousel ? (
            <motion.div variants={homeFadeUp}>
              <FeaturedProjectsCarousel projects={projects} className="mt-2" />
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
