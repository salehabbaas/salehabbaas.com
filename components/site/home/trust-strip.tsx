"use client";

import { motion } from "framer-motion";
import { Clapperboard, Cloud, Cpu, Sparkles } from "lucide-react";

import { homeFadeUp, homeStagger, homeViewport } from "@/lib/motion/home";
import type { HomeTrustStripProps } from "@/components/site/home/types";

const trustDomains = [
  { label: "Software Engineering", icon: Cpu },
  { label: "Content Creation", icon: Clapperboard },
  { label: "AI News", icon: Sparkles },
  { label: "Cloud & Data", icon: Cloud }
];

export function TrustStrip({ stats }: HomeTrustStripProps) {
  return (
    <section className="border-b border-primary/20 bg-background">
      <div className="container py-7">
        <motion.div
          variants={homeStagger}
          initial="hidden"
          whileInView="visible"
          viewport={homeViewport}
          className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-center"
        >
          <motion.div variants={homeFadeUp} className="flex flex-wrap gap-3">
            {trustDomains.map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-foreground"
                >
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                  {item.label}
                </span>
              );
            })}
          </motion.div>
          <motion.ul variants={homeFadeUp} className="grid gap-2 text-sm text-foreground/75 sm:grid-cols-2">
            {stats.map((stat) => (
              <li
                key={stat.label}
                className="inline-flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 px-3 py-2"
              >
                <span>{stat.label}</span>
                <strong className="font-medium text-foreground">{stat.value}</strong>
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  );
}
