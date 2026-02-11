"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResumeDownloadLink } from "@/components/site/resume-download-link";

interface HeroStat {
  label: string;
  value: string;
}

const DEFAULT_AVATAR = "/SalehAbbaas.jpeg";
const ALLOWED_REMOTE_HOSTS = new Set([
  "i.ytimg.com",
  "images.unsplash.com",
  "media.licdn.com",
  "firebasestorage.googleapis.com"
]);

function resolveAvatarUrl(avatarUrl?: string) {
  const trimmed = avatarUrl?.trim();
  if (!trimmed) return DEFAULT_AVATAR;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (ALLOWED_REMOTE_HOSTS.has(parsed.hostname)) {
      return parsed.toString();
    }
  } catch {
    // Fall back to local if the URL is malformed or not allowed.
  }

  return DEFAULT_AVATAR;
}

export function HomeHero({
  name,
  headline,
  bio,
  location,
  resumeUrl,
  avatarUrl,
  highlights,
  stats,
  keywords
}: {
  name: string;
  headline: string;
  bio: string;
  location?: string;
  resumeUrl?: string;
  avatarUrl?: string;
  highlights: string[];
  stats: HeroStat[];
  keywords: string[];
}) {
  const resolvedAvatarUrl = resolveAvatarUrl(avatarUrl);
  const shouldSkipOptimization = resolvedAvatarUrl.startsWith("/");

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-white via-slate-50 to-white py-16 dark:from-slate-950 dark:via-slate-900/40 dark:to-slate-950">
      <div className="absolute -top-32 left-1/2 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-500/15" />
      <div className="absolute bottom-0 right-[-12rem] h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-500/10" />
      <div className="container relative grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
              Healthcare interoperability
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
              Clinical data platforms
            </Badge>
          </div>
          <h1 className="mt-6 font-serif text-4xl leading-tight tracking-tight md:text-6xl">
            {name}
            <span className="mt-3 block font-sans text-xl font-medium text-foreground/70 md:text-2xl">{headline}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/75 md:text-lg">{bio}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/contact">Book a call</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/services">View services</Link>
            </Button>
            <ResumeDownloadLink url={resumeUrl} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {location ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {location}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              HIPAA/PHIPA-ready delivery
            </span>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          <div className="relative mx-auto max-w-sm overflow-hidden rounded-[2.5rem] border border-border/70 bg-white/80 p-4 shadow-lg dark:bg-slate-900/70">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
              <Image
                src={resolvedAvatarUrl}
                alt={name}
                fill
                priority
                sizes="(max-width: 768px) 80vw, 35vw"
                unoptimized={shouldSkipOptimization}
                className="object-cover"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {keywords.slice(0, 6).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {highlights.slice(0, 3).map((highlight) => (
              <div key={highlight} className="rounded-2xl border border-border/60 bg-background/85 px-4 py-3 text-sm text-foreground/80">
                {highlight}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
