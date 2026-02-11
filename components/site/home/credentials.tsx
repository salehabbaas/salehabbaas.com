"use client";

import { motion } from "framer-motion";
import { Award, BadgeCheck } from "lucide-react";

import { homeFadeUp, homeStagger, homeViewport } from "@/lib/motion/home";
import type { HomeCredentialsProps } from "@/components/site/home/types";

export function Credentials({ certificates }: HomeCredentialsProps) {
  if (!certificates.length) return null;

  return (
    <section className="bg-background pb-20">
      <div className="container">
        <motion.div variants={homeStagger} initial="hidden" whileInView="visible" viewport={homeViewport} className="space-y-8">
          <motion.div variants={homeFadeUp} className="space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">Credentials & Certifications</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Trusted credentials for healthcare and cloud delivery.
            </h2>
          </motion.div>
          <motion.div variants={homeStagger} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {certificates.slice(0, 4).map((certificate) => (
              <motion.article
                key={certificate.id}
                variants={homeFadeUp}
                className="rounded-3xl border border-primary/20 bg-primary/10 p-5 shadow-[0_18px_60px_-35px_rgba(0,128,128,0.5)] transition-shadow hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  {certificate.year ? (
                    <BadgeCheck className="h-5 w-5 text-primary" aria-hidden />
                  ) : (
                    <Award className="h-5 w-5 text-primary" aria-hidden />
                  )}
                </div>
                <h3 className="mt-4 text-base font-medium text-foreground">{certificate.title}</h3>
                <p className="mt-2 text-sm text-foreground/75">{certificate.issuer}</p>
                {certificate.year ? <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{certificate.year}</p> : null}
              </motion.article>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
