"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, CircuitBoard, Database, ShieldCheck } from "lucide-react";

import { homeFadeUp, homeStagger, homeViewport } from "@/lib/motion/home";
import type { HomeExperienceSnapshotProps } from "@/components/site/home/types";

const expertiseItems = [
  {
    title: "Healthcare Systems",
    icon: Building2,
    summary: "Built and supported mission-critical flows for hospitals, laboratories, and public health organizations."
  },
  {
    title: "Clinical Integrations",
    icon: CircuitBoard,
    summary: "Delivered HL7/FHIR and analyzer integrations that improved data quality and reduced workflow friction."
  },
  {
    title: "Data Platforms",
    icon: Database,
    summary: "Engineered reliable pipelines and dashboards for high-volume clinical and operational visibility."
  },
  {
    title: "Architecture & Leadership",
    icon: ShieldCheck,
    summary: "Defined secure implementation patterns and guided delivery in regulated healthcare environments."
  }
];

export function ExperienceSnapshot({ experiences }: HomeExperienceSnapshotProps) {
  const feed = [
    "FHIR Observation normalized · queue=clinical-events",
    "HL7 ADT^A08 mapped · pid=4f2a",
    "Lab interface ACK received · latency=82ms",
    "Device feed deduped · drift=0.2%",
    "Audit log sealed · hash=7b91"
  ];

  return (
    <section className="bg-background py-20">
      <div className="container">
        <motion.div variants={homeStagger} initial="hidden" whileInView="visible" viewport={homeViewport} className="space-y-10">
          <motion.div variants={homeFadeUp} className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Experience Snapshot</p>
              <h2 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Built across hospitals, laboratories, and clinical data ecosystems.
              </h2>
            </div>
            <Link href="/experience" className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition hover:text-foreground">
              View full timeline
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div variants={homeStagger} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 md:grid-cols-2">
              {expertiseItems.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    variants={homeFadeUp}
                    className="rounded-3xl border border-primary/20 bg-primary/10 p-6 shadow-[0_18px_60px_-35px_rgba(0,128,128,0.5)]"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-foreground/75">{item.summary}</p>
                  </motion.article>
                );
              })}
            </div>

            <div className="space-y-4">
              {experiences.length ? (
                <motion.div variants={homeFadeUp} className="rounded-3xl border border-primary/20 bg-primary/10 p-6 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Recent Roles</p>
                  <ul className="mt-4 grid gap-3 text-sm text-foreground/75">
                    {experiences.slice(0, 3).map((experience) => (
                      <li key={experience.id} className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
                        <p className="font-medium text-foreground">{experience.role}</p>
                        <p className="mt-1 text-foreground/75">{experience.company}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {experience.startDate || ""} {experience.endDate ? `- ${experience.endDate}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}

              <motion.div variants={homeFadeUp} className="rounded-3xl border border-primary/20 bg-primary/10 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Live Integration Feed</p>
                  <span className="inline-flex items-center gap-2 text-xs text-foreground">
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
                    Streaming
                  </span>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-black/30 font-mono text-xs text-foreground/75">
                  <div className="animate-ticker-vertical space-y-2 px-4 py-3">
                    {feed.concat(feed).map((line, index) => (
                      <div key={`${line}-${index}`} className="flex items-center justify-between gap-3">
                        <span className="truncate">{line}</span>
                        <span className="text-primary/70">ok</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
