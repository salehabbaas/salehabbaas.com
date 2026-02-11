"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { homeFadeUp, homeSlowFloat, homeStagger, homeViewport } from "@/lib/motion/home";
import type { HomeHeroProps } from "@/components/site/home/types";
import { BRAND_TAGLINE } from "@/lib/brand";

const defaultAvatar = "/SalehAbbaas.jpeg";

function resolveAvatarUrl(avatarUrl?: string) {
  const trimmed = avatarUrl?.trim();
  if (!trimmed) return defaultAvatar;
  return trimmed.startsWith("/") ? trimmed : defaultAvatar;
}

export function Hero({ profile, keywords, stats }: HomeHeroProps) {
  const avatarUrl = resolveAvatarUrl(profile.avatarUrl);
  const readiness = ["HL7 v2 + FHIR enabled", "Audit-grade traceability", "SLO-backed delivery"];

  return (
    <section className="relative isolate overflow-hidden border-b border-primary/20 bg-background">
      <motion.div
        variants={homeSlowFloat}
        initial="initial"
        animate="animate"
        className="pointer-events-none absolute inset-x-0 top-[-18rem] z-0 mx-auto h-[30rem] w-[70rem] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.2),transparent_65%)] blur-3xl"
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(120deg,hsl(var(--background)/0.94),hsl(var(--background)/0.99)_45%,hsl(var(--background)/0.92))]" />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--primary)/0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary)/0.1) 1px, transparent 1px)",
          backgroundSize: "72px 72px"
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 noise-overlay" aria-hidden />

      <div className="container relative z-10 py-20 md:py-28">
        <motion.div variants={homeStagger} initial="hidden" whileInView="visible" viewport={homeViewport} className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <motion.p
              variants={homeFadeUp}
              className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-foreground"
            >
              SalehAbbaas.com
            </motion.p>
            <motion.h1
              variants={homeFadeUp}
              className="text-balance text-[clamp(2.2rem,5vw,4.6rem)] font-display font-bold leading-[1.02] tracking-[-0.03em] text-foreground"
            >
              <span className="text-gradient">{BRAND_TAGLINE}</span>
            </motion.h1>
            <motion.p variants={homeFadeUp} className="max-w-2xl text-pretty text-base leading-8 text-foreground/75 md:text-lg">
              I design and ship production-ready healthcare systems across HL7/FHIR integrations, laboratory connectivity, and
              secure clinical data platforms with measurable reliability and operational impact.
            </motion.p>
            <motion.div variants={homeFadeUp} className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="cta" className="px-7">
                <Link href="/book-meeting">
                  Book a Meeting
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-7 text-foreground hover:bg-primary/20">
                <Link href="/projects">View Projects</Link>
              </Button>
            </motion.div>
            <motion.div variants={homeFadeUp} className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground/75">
              {profile.location ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {profile.location}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2 text-foreground/75">
                Trusted for regulated healthcare delivery and interoperability platforms
              </span>
            </motion.div>
            <motion.ul variants={homeFadeUp} className="grid gap-2 text-sm text-foreground/75 sm:grid-cols-3">
              {readiness.map((item) => (
                <li key={item} className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
                  {item}
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.div variants={homeFadeUp} className="mx-auto w-full max-w-md space-y-5">
            <div className="rounded-[2.25rem] border border-primary/20 bg-primary/10 p-5 shadow-[0_25px_90px_-40px_rgba(0,128,128,0.5)] backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>Identity Node</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.6rem] text-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                  Active
                </span>
              </div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem]">
                <Image src={avatarUrl} alt={`${profile.name} portrait`} fill priority sizes="(max-width: 1024px) 85vw, 35vw" className="object-contain object-center" unoptimized />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {keywords.slice(0, 6).map((keyword) => (
                  <span key={keyword} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-foreground/75">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 backdrop-blur">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-lg font-medium text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
