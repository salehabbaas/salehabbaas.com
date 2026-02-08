"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

export function PageHero() {
  return (
    <section className="container py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-border/70 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-8 shadow-sm md:p-14"
      >
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-accent/15 blur-2xl" />
        <div className="relative max-w-3xl space-y-6">
          <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Firebase-first product engineering
          </p>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-6xl">
            Saleh Abbaas builds elegant digital systems that scale content, product, and growth.
          </h1>
          <p className="max-w-2xl text-lg text-foreground/75">
            Senior full-stack engineer + Firebase architect + product designer + growth/SEO specialist.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/contact">Start a Project</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/creator">Explore Creator Content</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
