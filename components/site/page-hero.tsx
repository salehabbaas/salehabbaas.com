"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, MapPin, Gauge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResumeDownloadLink } from "@/components/site/resume-download-link";

export function PageHero({
  name,
  headline,
  bio,
  location,
  resumeUrl
}: {
  name: string;
  headline: string;
  bio?: string;
  location?: string;
  resumeUrl?: string;
}) {
  return (
    <section className="container py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-[2.25rem] border border-border/70 bg-gradient-to-br from-white via-slate-50 to-cyan-50/80 px-6 py-8 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40 md:px-12 md:py-12"
      >
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute -bottom-20 left-24 h-52 w-52 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-500/10" />
        <div className="relative grid gap-8 md:grid-cols-[1.6fr_1fr] md:items-end">
          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Firebase-first product engineering
            </p>
            <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-6xl">
              {name}
              <span className="mt-2 block font-sans text-xl font-medium text-foreground/70 md:text-2xl">{headline}</span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-foreground/75 md:text-lg">
              {bio || "I build premium digital systems that merge product engineering, creator growth, and measurable SEO performance."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/contact">Start a Project</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/creator">Explore Creator Content</Link>
              </Button>
              <ResumeDownloadLink url={resumeUrl} />
            </div>
            {location ? (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {location}
              </p>
            ) : null}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-3"
          >
            <div className="rounded-2xl border border-border/70 bg-background/85 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Delivery</p>
              <p className="mt-1 text-lg font-semibold">Product + Growth + Content</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/85 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Focus Regions</p>
              <p className="mt-1 text-lg font-semibold">Canada & USA</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/85 p-4 backdrop-blur">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Gauge className="h-4 w-4" />
                Current Mode
              </p>
              <p className="mt-1 text-lg font-semibold">Selective high-impact builds</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
