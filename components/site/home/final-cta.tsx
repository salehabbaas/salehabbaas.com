"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { homeFadeUp, homeStagger, homeViewport } from "@/lib/motion/home";

export function FinalCTA() {
  return (
    <section className="bg-background pb-24">
      <div className="container">
        <motion.div
          variants={homeStagger}
          initial="hidden"
          whileInView="visible"
          viewport={homeViewport}
          className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-primary/10 px-7 py-10 shadow-[0_30px_90px_-45px_rgba(0,128,128,0.7)] md:px-12 md:py-14"
        >
          <motion.div
            variants={homeFadeUp}
            className="pointer-events-none absolute right-[-7rem] top-[-8rem] h-60 w-60 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.2),transparent_70%)] blur-3xl"
          />
          <motion.div variants={homeFadeUp} className="relative z-10 max-w-3xl space-y-6">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Let&apos;s build healthcare systems that scale and last.
            </h2>
            <p className="text-base leading-8 text-foreground/75">
              Partner with Saleh Abbaas to design secure integrations, improve clinical data reliability, and deliver production-ready systems
              trusted by healthcare teams.
            </p>
            <Button asChild size="lg" variant="cta" className="rounded-full px-7">
              <Link href="/book-meeting">
                Book a Meeting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
