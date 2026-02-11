"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Activity, DatabaseZap, ShieldCheck, SplitSquareVertical } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";

type Step = {
  key: string;
  title: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function PipelineStory({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const steps = useMemo<Step[]>(
    () => [
      {
        key: "ingest",
        title: "Ingest",
        summary: "HL7 v2, FHIR APIs, device feeds, and batch extracts arrive with inconsistent shape and reliability.",
        icon: Activity
      },
      {
        key: "normalize",
        title: "Normalize",
        summary: "Map, validate, and enrich clinical data into a stable internal model with clear ownership.",
        icon: SplitSquareVertical
      },
      {
        key: "quality",
        title: "Data Quality",
        summary: "Guardrails: schema checks, deduplication, drift detection, and audit-friendly traceability.",
        icon: ShieldCheck
      },
      {
        key: "deliver",
        title: "Deliver",
        summary: "Serve downstream workflows: analytics, dashboards, EHR integrations, and operational alerting.",
        icon: DatabaseZap
      }
    ],
    []
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  useLayoutEffect(() => {
    if (reducedMotion) return;
    if (!sectionRef.current || !pinRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      const path = pathRef.current;

      gsap.set(cards, { opacity: 0.32, y: 18 });

      const tl = gsap.timeline({ defaults: { ease: "none" } });

      cards.forEach((card, index) => {
        tl.to(
          card,
          {
            opacity: 1,
            y: 0,
            duration: 0.8
          },
          index
        );
      });

      if (path) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length);
        tl.to(
          path,
          {
            strokeDashoffset: 0,
            duration: steps.length
          },
          0
        );
      }

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: `+=${steps.length * 520}`,
        scrub: 1,
        pin: pinRef.current,
        pinSpacing: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const next = Math.min(steps.length - 1, Math.round(self.progress * (steps.length - 1)));
          if (activeIndexRef.current === next) return;
          activeIndexRef.current = next;
          setActiveIndex(next);
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion, steps.length]);

  return (
    <section
      ref={sectionRef}
      className={cn("relative isolate overflow-hidden border-y border-primary/20 bg-background py-24", className)}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30 noise-overlay" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,hsl(var(--primary)/0.25),transparent_55%),radial-gradient(circle_at_90%_10%,hsl(var(--secondary)/0.18),transparent_50%),radial-gradient(circle_at_50%_100%,rgba(0,0,0,0.65),transparent_55%)]" />

      <div className="container relative">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-5">
            <p className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-foreground">
              Scroll Story
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Clinical Data Pipeline, end-to-end.
            </h2>
            <p className="max-w-xl text-pretty text-base leading-8 text-foreground/75">
              A calm, standards-aware path from noisy integration inputs to reliable clinical workflows.
            </p>
            <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5 text-sm text-foreground/75">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">What I optimize for</p>
              <ul className="mt-3 grid gap-2 font-mono text-xs">
                <li className="flex items-center justify-between rounded-2xl border border-primary/20 bg-black/30 px-4 py-3">
                  <span>Operational reliability</span>
                  <span className="text-foreground">SLO-driven</span>
                </li>
                <li className="flex items-center justify-between rounded-2xl border border-primary/20 bg-black/30 px-4 py-3">
                  <span>Data quality</span>
                  <span className="text-foreground">Traceable</span>
                </li>
                <li className="flex items-center justify-between rounded-2xl border border-primary/20 bg-black/30 px-4 py-3">
                  <span>Security posture</span>
                  <span className="text-foreground">Least privilege</span>
                </li>
              </ul>
            </div>
          </div>

          <div ref={pinRef} className="relative">
            <div className="relative overflow-hidden rounded-[2.25rem] border border-primary/20 bg-primary/10 p-6 shadow-elev3 md:p-8">
              <div className="absolute inset-0 opacity-40 noise-overlay" aria-hidden />

              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Interoperability Journey</p>
                  <p className="text-xs text-foreground">
                    Step <span className="text-foreground">{activeIndex + 1}</span> / {steps.length}
                  </p>
                </div>

                <div className="mt-6 grid gap-3">
                  <svg
                    className="absolute left-7 top-20 hidden h-[calc(100%-7.5rem)] w-10 text-primary opacity-80"
                    viewBox="0 0 48 420"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      ref={pathRef}
                      d="M24 10 C24 90, 24 90, 24 170 C24 250, 24 250, 24 330 C24 390, 24 390, 24 410"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>

                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const active = index === activeIndex;
                    return (
                      <div
                        key={step.key}
                        ref={(node) => {
                          cardRefs.current[index] = node;
                        }}
                        className={cn(
                          "relative rounded-3xl border border-primary/20 bg-primary/10 p-5 transition md:pl-16",
                          active ? "bg-primary/20 shadow-elev2" : "opacity-90"
                        )}
                      >
                        <div className="absolute left-5 top-5 hidden h-9 w-9 items-center justify-center rounded-2xl border border-primary/20 bg-black/30 md:inline-flex">
                          <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-foreground/75")} />
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-foreground">{step.title}</p>
                            <p className="text-sm leading-7 text-foreground/75">{step.summary}</p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex h-7 items-center rounded-full border border-primary/20 bg-black/25 px-3 text-xs uppercase tracking-[0.16em]",
                              active ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-6 text-xs text-muted-foreground">
                  {reducedMotion ? "Reduced motion enabled." : "Scroll to scrub through the pipeline."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
