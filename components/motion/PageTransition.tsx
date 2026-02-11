"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

import { pageVariants } from "@/lib/motion/variants";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";

export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <LayoutGroup id="route">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pathname}
          variants={pageVariants(reducedMotion)}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn("min-h-[60vh]", className)}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </LayoutGroup>
  );
}

