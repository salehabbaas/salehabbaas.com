"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { animated, useSpring } from "@react-spring/web";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { ProjectContent } from "@/types/cms";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function FeaturedProjectsCarousel({ projects, className }: { projects: ProjectContent[]; className?: string }) {
  const reducedMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  const [metrics, setMetrics] = useState({ viewport: 0, rail: 0, snap: 360 });

  const bounds = useMemo(() => {
    const maxScroll = Math.max(0, metrics.rail - metrics.viewport);
    return { min: -maxScroll, max: 0 };
  }, [metrics.rail, metrics.viewport]);

  const [{ x }, api] = useSpring(() => ({
    x: 0,
    config: {
      tension: 320,
      friction: 34,
      mass: 0.9
    }
  }));

  useEffect(() => {
    if (!viewportRef.current || !railRef.current) return;

    const viewport = viewportRef.current;
    const rail = railRef.current;

    function measure() {
      const viewportWidth = viewport.getBoundingClientRect().width;
      const railWidth = rail.getBoundingClientRect().width;

      const first = rail.querySelector<HTMLElement>("[data-card='true']");
      const second = first?.nextElementSibling as HTMLElement | null;
      const snap =
        first && second ? Math.max(280, Math.round(second.getBoundingClientRect().left - first.getBoundingClientRect().left)) : 360;

      setMetrics({ viewport: viewportWidth, rail: railWidth, snap });
      api.start({ x: clamp(x.get(), -(Math.max(0, railWidth - viewportWidth)), 0) });
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(rail);

    return () => observer.disconnect();
  }, [api, x]);

  const drag = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startOffset: 0
  });

  function snapToNearest(nextX: number) {
    const snap = metrics.snap || 360;
    const position = -nextX;
    const index = Math.round(position / snap);
    const snapped = -index * snap;
    return clamp(snapped, bounds.min, bounds.max);
  }

  function nudge(direction: -1 | 1) {
    const snap = metrics.snap || 360;
    const next = snapToNearest(x.get() - direction * snap);
    api.start({ x: next });
  }

  if (!projects.length) return null;

  if (reducedMotion) {
    return (
      <section className={cn("rounded-[2rem] border border-border/70 bg-card/75 p-6 shadow-elev2 backdrop-blur", className)}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Featured Projects</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Explore case studies</h3>
          </div>
          <Button asChild variant="outline">
            <Link href="/projects">All projects</Link>
          </Button>
        </div>

        <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2">
          {projects.slice(0, 8).map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="min-w-[min(18rem,82vw)] snap-start rounded-3xl border border-border/70 bg-card/70 p-5 shadow-elev1"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Case study</p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">{project.title}</p>
              <p className="mt-2 text-sm leading-7 text-foreground/75">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.tags.slice(0, 3).map((tag) => (
                  <Badge key={`${project.id}-${tag}`} variant="secondary" className="rounded-full">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cn("rounded-[2rem] border border-border/70 bg-card/75 p-6 shadow-elev2 backdrop-blur", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Featured Projects</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Drag to explore case studies</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous" onClick={() => nudge(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next" onClick={() => nudge(1)}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button asChild variant="outline" className="ml-2 hidden sm:inline-flex">
            <Link href="/projects">All projects</Link>
          </Button>
        </div>
      </div>

      <div ref={viewportRef} className="mt-6 overflow-hidden">
        <animated.div
          ref={railRef}
          style={{ x }}
          className="flex gap-4 will-change-transform"
          onPointerDown={(e) => {
            if (!viewportRef.current) return;
            drag.current.active = true;
            drag.current.pointerId = e.pointerId;
            drag.current.startX = e.clientX;
            drag.current.startOffset = x.get();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;
            const dx = e.clientX - drag.current.startX;
            api.start({ x: clamp(drag.current.startOffset + dx, bounds.min, bounds.max), immediate: true });
          }}
          onPointerUp={(e) => {
            if (drag.current.pointerId !== e.pointerId) return;
            drag.current.active = false;
            const snapped = snapToNearest(x.get());
            api.start({ x: snapped, immediate: false });
          }}
          onPointerCancel={() => {
            drag.current.active = false;
            api.start({ x: snapToNearest(x.get()), immediate: false });
          }}
          aria-label="Featured projects carousel"
        >
          {projects.slice(0, 10).map((project) => (
            <article
              key={project.id}
              data-card="true"
              className="w-[min(18rem,82vw)] shrink-0 overflow-hidden rounded-3xl border border-border/70 bg-card/70 shadow-elev1"
            >
              <Link href={`/projects/${project.slug}`} className="block p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Case study</p>
                    <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">{project.title}</p>
                  </div>
                  {project.coverImage ? (
                    <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-border/70 bg-card/80">
                      <Image src={project.coverImage} alt="" fill className="object-cover" sizes="48px" />
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-7 text-foreground/75">{project.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.slice(0, 3).map((tag) => (
                    <Badge key={`${project.id}-${tag}`} variant="secondary" className="rounded-full">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Link>
            </article>
          ))}
        </animated.div>
      </div>
    </section>
  );
}
