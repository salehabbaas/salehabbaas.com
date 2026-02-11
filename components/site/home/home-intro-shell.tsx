"use client";

import Image from "next/image";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Clapperboard,
  Database,
  Globe,
  Hospital,
  Newspaper,
  ShieldCheck,
  Sparkles,
  User,
  Workflow,
  Wrench,
  BriefcaseBusiness
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HOME_INTRO_PROGRESS_EVENT } from "@/lib/home-intro";

type HomeIntroShellProps = {
  profileLocation?: string;
  companies: string[];
  socialLinks: { label: string; url: string }[];
};

type SlideFeature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
};

type IntroSlide = {
  kicker: string;
  title: string;
  description: string;
  bullets: string[];
  icon: React.ComponentType<{ className?: string }>;
  features: SlideFeature[];
};

const SLIDE_DURATION_MS = 5600;
const MENU_FALLBACK_MS = 1800;
const HERO_IMAGE = "/SalehAbbaasCricle.jpeg";

export function HomeIntroShell({ profileLocation, companies, socialLinks }: HomeIntroShellProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 140]);

  const companiesLine = useMemo(() => companies.slice(0, 4).join(" · "), [companies]);
  const socialLine = useMemo(() => socialLinks.slice(0, 4).map((item) => item.label).join(" · "), [socialLinks]);
  const locationLine = profileLocation?.trim() ? profileLocation : "Ottawa, ON, Canada";

  const slides = useMemo<IntroSlide[]>(
    () => [
      {
        kicker: "Slide 1",
        title: "Introduce Myself: Saleh Abbaas",
        description:
          "I am Saleh Abbaas, a Software Engineer focused on building practical, reliable, and production-ready systems.",
        bullets: ["Saleh Abbaas", "Software Engineer", "Production Delivery", "Applied AI"],
        icon: User,
        features: [
          {
            icon: User,
            title: "Who I Am",
            detail: "Engineer with strong execution, clear communication, and a focus on real-world impact."
          },
          {
            icon: Workflow,
            title: "How I Work",
            detail: "From planning to deployment with clean architecture and practical outcomes."
          },
          {
            icon: Globe,
            title: "Base",
            detail: `Based in ${locationLine}.`
          }
        ]
      },
      {
        kicker: "Slide 2",
        title: "My Experience: Software Engineer for 5 Years",
        description: companiesLine
          ? `I have 5 years of software engineering experience, with delivery across ${companiesLine}.`
          : "I have 5 years of software engineering experience across healthcare and enterprise projects.",
        bullets: ["5 Years Experience", "The Ottawa Hospital", "Arab Hospitals Group", "World Health Organization"],
        icon: BriefcaseBusiness,
        features: [
          {
            icon: Hospital,
            title: "Healthcare Integrations",
            detail: "Hands-on work in hospital interoperability and production operations."
          },
          {
            icon: Database,
            title: "Data + Reporting",
            detail: "Built dashboards and analytics to monitor system performance and outcomes."
          },
          {
            icon: ShieldCheck,
            title: "Quality + Reliability",
            detail: "Delivered secure and stable systems in regulated and mission-critical environments."
          }
        ]
      },
      {
        kicker: "Slide 3",
        title: "My Social Media + Next Step: AI News Content Creator",
        description: socialLine
          ? `I publish practical AI content across ${socialLine}, and my next step is growing as an AI News Content Creator.`
          : "I publish practical AI content, and my next step is growing as an AI News Content Creator.",
        bullets: ["Social Media", "AI News", "Content Creator", "Next Step"],
        icon: Clapperboard,
        features: [
          {
            icon: Clapperboard,
            title: "Content Workflow",
            detail: "Create short, useful AI explainers with clear takeaways."
          },
          {
            icon: Newspaper,
            title: "AI News Coverage",
            detail: "Track model/tool updates and turn them into practical updates."
          },
          {
            icon: Sparkles,
            title: "Growth Direction",
            detail: "Build a trusted AI content brand with consistent, high-signal updates."
          }
        ]
      },
      {
        kicker: "Slide 4",
        title: "My Services in Canada",
        description:
          "I provide direct services in Canada as an expert in AI Agent engineering, Healthcare Systems, and Software Engineering.",
        bullets: ["Canada", "AI Agents", "Healthcare Systems", "Software Engineering"],
        icon: Wrench,
        features: [
          {
            icon: Wrench,
            title: "AI Agent Expert",
            detail: "Design and implementation of practical AI agents for real business workflows."
          },
          {
            icon: Hospital,
            title: "Healthcare Systems Expert",
            detail: "Interoperability-focused delivery across clinical and operational systems."
          },
          {
            icon: User,
            title: "Software Engineering Expert",
            detail: "End-to-end architecture, development, and deployment with production reliability."
          }
        ]
      }
    ],
    [companiesLine, locationLine, socialLine]
  );

  const revealMenu = useCallback(() => setMenuVisible(true), []);
  const scrollToNextSection = useCallback(() => {
    const root = document.getElementById("home-scroll-root");
    if (!root) return;
    root.scrollBy({ top: root.clientHeight, behavior: "smooth" });
  }, []);

  const nextSlide = useCallback(() => {
    setActiveSlide((previous) => (previous + 1) % slides.length);
    revealMenu();
  }, [revealMenu, slides.length]);

  const previousSlide = useCallback(() => {
    setActiveSlide((previous) => (previous - 1 + slides.length) % slides.length);
    revealMenu();
  }, [revealMenu, slides.length]);

  useEffect(() => {
    if (!menuVisible) return;
    window.dispatchEvent(new Event(HOME_INTRO_PROGRESS_EVENT));
  }, [menuVisible]);

  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(nextSlide, SLIDE_DURATION_MS);
    return () => window.clearInterval(interval);
  }, [nextSlide, paused]);

  useEffect(() => {
    const menuTimer = window.setTimeout(revealMenu, MENU_FALLBACK_MS);
    return () => {
      window.clearTimeout(menuTimer);
    };
  }, [revealMenu]);

  const active = slides[activeSlide];

  return (
    <section className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden pb-8 pt-6 md:pt-10">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="blob pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-cyan-400/28 animate-pulse md:h-80 md:w-80" />
      <div className="blob pointer-events-none absolute -right-20 bottom-16 h-72 w-72 rounded-full bg-emerald-400/22 animate-pulse md:h-96 md:w-96" />
      <div className="bg-noise pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.14),transparent_38%),radial-gradient(circle_at_82%_20%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_55%_85%,rgba(45,212,191,0.16),transparent_52%)]" />

      <motion.div
        aria-hidden
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="pointer-events-none absolute -top-28 left-1/2 h-[clamp(18rem,68vw,35rem)] w-[clamp(18rem,68vw,35rem)] -translate-x-1/2 rounded-full border border-border/70"
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="relative w-full overflow-hidden"
      >
        <div className="relative grid gap-6 px-4 md:px-8 lg:gap-8 lg:px-10">
          <motion.div style={{ y: y1 }} className="mx-auto w-full max-w-6xl space-y-5 px-4 md:px-8 lg:px-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, y: 26, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(5px)" }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="space-y-3"
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/90">{active.kicker}</p>
                <h1 className="text-balance font-display text-4xl leading-[1.02] tracking-tight text-foreground md:text-[4rem]">{active.title}</h1>
                <p className="max-w-2xl text-base leading-7 text-foreground/85 md:text-lg">{active.description}</p>
              </motion.div>
            </AnimatePresence>

            {activeSlide === 0 ? (
              <div className="flex justify-center py-2">
                <div className="relative h-36 w-36 rounded-full bg-[conic-gradient(from_160deg,rgba(56,189,248,0.65),rgba(16,185,129,0.55),rgba(59,130,246,0.65),rgba(56,189,248,0.65))] p-[3px] shadow-elev2 md:h-44 md:w-44 lg:h-52 lg:w-52">
                  <div className="relative h-full w-full overflow-hidden rounded-full border border-border/80 bg-slate-950/80 ring-2 ring-white/10">
                    <Image
                      src={HERO_IMAGE}
                      alt="Saleh Abbaas profile picture"
                      fill
                      priority
                      sizes="(min-width: 1024px) 208px, (min-width: 768px) 176px, 144px"
                      className="scale-[1.12] object-cover object-center"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2.5">
              {active.bullets.map((bullet) => (
                <span
                  key={bullet}
                  className="rounded-full border border-border/80 bg-card/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground"
                >
                  {bullet}
                </span>
              ))}
            </div>

            <div className="grid gap-2.5 md:grid-cols-3">
              {active.features.map((feature) => {
                const FeatureIcon = feature.icon;
                return (
                  <div key={feature.title} className="rounded-2xl border border-border/75 bg-card/80 p-3.5">
                    <FeatureIcon className="h-4.5 w-4.5 text-foreground" />
                    <p className="mt-2 text-sm font-semibold text-foreground">{feature.title}</p>
                    <p className="mt-1 text-xs leading-5 text-foreground/75 md:text-sm">{feature.detail}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </motion.div>

      <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={previousSlide}
          aria-label="Previous slide"
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-black/40 text-white backdrop-blur transition hover:scale-105 hover:bg-black/60"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-black/40 text-white backdrop-blur transition hover:scale-105 hover:bg-black/60"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <motion.button
        type="button"
        onClick={scrollToNextSection}
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: [0, 7, 0] }}
        transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute bottom-4 right-4 inline-flex items-center justify-center rounded-full border border-border/80 bg-black/35 px-4 py-2 text-foreground/90 md:right-6"
        aria-label="Scroll down"
      >
        <ChevronDown className="h-4 w-4" />
      </motion.button>
    </section>
  );
}
