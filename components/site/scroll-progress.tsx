"use client";

import { motion, useScroll, useSpring } from "framer-motion";

import { useReducedMotion } from "@/lib/motion/useReducedMotion";

export function ScrollProgress() {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 38, mass: 0.2 });

  if (reducedMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[linear-gradient(90deg,hsl(var(--accent-strong)),hsl(var(--accent)))] opacity-90"
      style={{ scaleX }}
    />
  );
}

