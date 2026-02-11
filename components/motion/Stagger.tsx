"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { stagger, viewport } from "@/lib/motion/variants";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";

export function Stagger({
  className,
  children,
  staggerChildren = 0.09,
  delayChildren = 0.05,
  ...props
}: HTMLMotionProps<"div"> & { staggerChildren?: number; delayChildren?: number }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={stagger(reducedMotion, staggerChildren, delayChildren)}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

