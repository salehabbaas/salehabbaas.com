"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Binary, Database, GitBranch, Stethoscope } from "lucide-react";

import { homeFadeUp, homeStagger, homeViewport } from "@/lib/motion/home";
import type { HomeServicesProps } from "@/components/site/home/types";

const serviceIcons = [Stethoscope, Database, Binary, GitBranch];

export function Services({ services }: HomeServicesProps) {
  if (!services.length) return null;

  return (
    <section className="bg-background pb-20">
      <div className="container">
        <motion.div variants={homeStagger} initial="hidden" whileInView="visible" viewport={homeViewport} className="space-y-10">
          <motion.div variants={homeFadeUp} className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Services</p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Outcomes focused on resilient healthcare delivery.
              </h2>
            </div>
            <Link href="/services" className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition hover:text-foreground">
              See all services
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div variants={homeStagger} className="grid gap-4 md:grid-cols-2">
            {services.slice(0, 4).map((service, index) => {
              const Icon = serviceIcons[index % serviceIcons.length];
              return (
                <motion.article
                  key={service.id}
                  variants={homeFadeUp}
                  whileHover={{ y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
                  className="rounded-3xl border border-primary/20 bg-primary/10 p-6 shadow-[0_18px_60px_-35px_rgba(0,128,128,0.5)] transition-shadow hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-xl font-medium text-foreground">{service.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-foreground/75">{service.detail}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
