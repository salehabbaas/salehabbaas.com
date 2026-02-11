"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { fadeUp, viewport } from "@/lib/motion/variants";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";

export function Reveal({
  className,
  children,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={fadeUp(reducedMotion, delay)}
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

