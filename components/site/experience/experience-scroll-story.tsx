"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, CheckCircle2 } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import type { ExperienceContent } from "@/types/cms";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";

type Step = ExperienceContent & { periodLabel: string };

export function ExperienceScrollStory({
  experiences,
  className
}: {
  experiences: ExperienceContent[];
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const steps = useMemo<Step[]>(
    () =>
      experiences.slice(0, 6).map((exp) => ({
        ...exp,
        periodLabel: [exp.startDate, exp.endDate].filter(Boolean).join(" - ")
      })),
    [experiences]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  useLayoutEffect(() => {
    if (reducedMotion) return;
    if (!sectionRef.current || !pinRef.current) return;
    if (steps.length < 2) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
      gsap.set(items, { opacity: 0.35, y: 14 });

      const tl = gsap.timeline({ defaults: { ease: "none" } });
      items.forEach((item, idx) => {
        tl.to(item, { opacity: 1, y: 0, duration: 0.8 }, idx);
      });

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

  if (!steps.length) return null;

  if (reducedMotion || steps.length < 2) {
    return (
      <section className={cn("rounded-[2rem] border border-border/70 bg-card/75 p-6 shadow-elev2", className)}>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
            <BriefcaseBusiness className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Experience</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Timeline</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {steps.map((step) => (
            <div key={step.id} className="rounded-3xl border border-border/70 bg-card/75 p-5 shadow-elev1">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {step.role} · {step.company}
              </p>
              {step.periodLabel ? <p className="mt-1 text-xs text-muted-foreground">{step.periodLabel}</p> : null}
              <p className="mt-3 text-sm leading-7 text-foreground/75">{step.summary}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const active = steps[activeIndex];

  return (
    <section
      ref={sectionRef}
      className={cn("relative isolate overflow-hidden rounded-[2.25rem] border border-border/70 bg-card/75 shadow-elev3", className)}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 noise-overlay" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 10% 0%, hsl(var(--accent) / 0.20), transparent 50%), radial-gradient(circle at 90% 10%, hsl(var(--primary) / 0.14), transparent 46%)"
        }}
        aria-hidden
      />

      <div ref={pinRef} className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scroll Story</p>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Experience timeline</h2>
            </div>
          </div>

          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={step.id}
                  ref={(node) => {
                    itemRefs.current[idx] = node;
                  }}
        className={cn(
          "rounded-3xl border border-border/70 bg-card/75 p-4 shadow-elev1 transition",
          isActive ? "bg-card/90" : "opacity-90"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {step.role} · {step.company}
            </p>
            {step.periodLabel ? <p className="mt-1 text-xs text-muted-foreground">{step.periodLabel}</p> : null}
          </div>
          <span
            className={cn(
              "inline-flex h-7 items-center rounded-full border border-border/70 bg-card/80 px-3 text-xs uppercase tracking-[0.16em]",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {String(idx + 1).padStart(2, "0")}
          </span>
        </div>
      </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">Scroll to highlight milestones.</p>
        </div>

          <div className="rounded-3xl border border-border/70 bg-card/75 p-6 shadow-elev1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active milestone</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{active.role}</h3>
          <p className="mt-1 text-sm text-foreground/75">{active.company}</p>
          {active.periodLabel ? <p className="mt-2 text-xs text-muted-foreground">{active.periodLabel}</p> : null}

          <p className="mt-5 text-sm leading-7 text-foreground/75">{active.summary}</p>

          {active.achievements?.length ? (
            <ul className="mt-6 space-y-2 text-sm text-foreground/75">
              {active.achievements.slice(0, 6).map((a) => (
                <li key={a} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" aria-hidden />
                  <span className="leading-7">{a}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
