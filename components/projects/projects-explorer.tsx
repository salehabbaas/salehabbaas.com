"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Rows3, Search, X } from "lucide-react";

import type { ProjectContent } from "@/types/cms";
import { SharedElementCard } from "@/components/motion/SharedElementCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

type ViewMode = "bento" | "grid";
type SortMode = "featured" | "title";

function normalize(input: string) {
  return input.trim().toLowerCase();
}

export function ProjectsExplorer({ projects, initialQuery }: { projects: ProjectContent[]; initialQuery?: string }) {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("bento");
  const [sort, setSort] = useState<SortMode>("featured");

  const tags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const byQuery = q
      ? (p: ProjectContent) =>
          [p.title, p.description, p.longDescription ?? "", p.tags.join(" ")].some((field) => normalize(field).includes(q))
      : () => true;

    const byTag = activeTag ? (p: ProjectContent) => p.tags.includes(activeTag) : () => true;

    const items = projects.filter((p) => byQuery(p) && byTag(p));

    if (sort === "title") {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    return items;
  }, [activeTag, projects, query, sort]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[2rem] border border-border/70 bg-card/75 p-5 shadow-elev2 backdrop-blur md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full items-center gap-3 md:w-auto">
            <div className="relative w-full md:w-[22rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, tags, outcomes..."
                className="pl-9"
                aria-label="Search projects"
              />
            </div>
            {query ? (
              <Button variant="ghost" size="icon" onClick={() => setQuery("")} aria-label="Clear search">
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant={view === "bento" ? "secondary" : "outline"} size="icon" onClick={() => setView("bento")} aria-label="Bento view">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "grid" ? "secondary" : "outline"} size="icon" onClick={() => setView("grid")} aria-label="Grid view">
              <Rows3 className="h-4 w-4" />
            </Button>

            <Button variant={sort === "featured" ? "secondary" : "outline"} size="sm" onClick={() => setSort("featured")}>
              Featured
            </Button>
            <Button variant={sort === "title" ? "secondary" : "outline"} size="sm" onClick={() => setSort("title")}>
              A-Z
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={!activeTag ? "secondary" : "outline"}
            size="sm"
            onClick={() => setActiveTag(null)}
            className="rounded-full"
          >
            All
          </Button>
          {tags.slice(0, 14).map((tag) => (
            <Button
              key={tag}
              variant={activeTag === tag ? "secondary" : "outline"}
              size="sm"
              onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
              className="rounded-full"
            >
              {tag}
            </Button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Showing <span className="text-foreground">{filtered.length}</span> of <span className="text-foreground">{projects.length}</span>
        </p>
      </div>

      <motion.div
        layout
        className={cn(
          "grid gap-4",
          view === "bento" ? "md:grid-cols-6 md:auto-rows-[18rem]" : "md:grid-cols-2 lg:grid-cols-3"
        )}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
      >
        <AnimatePresence initial={false}>
          {filtered.map((project, index) => {
            const cardSpan =
              view === "bento"
                ? index === 0
                  ? "md:col-span-4 md:row-span-2"
                  : index === 1
                    ? "md:col-span-2 md:row-span-2"
                    : "md:col-span-2"
                : "";

            return (
              <motion.div
                key={project.id}
                layout
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
                className={cn(cardSpan)}
              >
                <SharedElementCard
                  href={`/projects/${project.slug}`}
                  layoutId={`project-card-${project.slug}`}
                  className={cn(
                    "h-full",
                    view === "bento" ? "p-0" : "p-0",
                    "hover:border-border/80 hover:bg-card/90"
                  )}
                >
                  <div className={cn("relative h-full", view === "bento" ? "grid md:grid-cols-[1.1fr_0.9fr]" : "grid")}>
                    <motion.div
                      layoutId={`project-cover-${project.slug}`}
                      className={cn(
                        "relative overflow-hidden",
                        view === "bento" ? "h-56 rounded-b-none md:h-full md:rounded-l-3xl md:rounded-r-none" : "h-48 rounded-t-3xl"
                      )}
                    >
                      {project.coverImage ? (
                        <Image
                          src={project.coverImage}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                        />
                      ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.25),transparent_55%),radial-gradient(circle_at_70%_10%,hsl(var(--accent-strong)/0.22),transparent_55%),linear-gradient(135deg,hsl(var(--surface-925)),hsl(var(--surface-950)))]" />
                      )}
                      <div className="absolute inset-0 opacity-40 noise-overlay" aria-hidden />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
                    </motion.div>

                    <div className={cn("flex h-full flex-col p-6", view === "bento" ? "" : "")}>
                      <motion.h3
                        layoutId={`project-title-${project.slug}`}
                        className="text-balance text-xl font-semibold tracking-tight text-foreground md:text-2xl"
                      >
                        {project.title}
                      </motion.h3>
                      <p className="mt-3 text-sm leading-7 text-foreground/75">{project.description}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {project.tags.slice(0, 4).map((tag) => (
                          <Badge key={`${project.id}-${tag}`} variant="secondary" className="rounded-full">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-auto pt-6 text-sm font-medium text-foreground/90">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 shadow-elev1 transition group-hover:bg-card/95">
                          Open case study
                          <span className="text-muted-foreground">↗</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </SharedElementCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {!filtered.length ? (
        <div className="rounded-[2rem] border border-border/70 bg-card/75 p-8 text-center text-sm text-muted-foreground shadow-elev2">
          No projects match your filters. Try removing a tag or clearing search.
        </div>
      ) : null}
    </div>
  );
}
