"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "framer-motion";

import { layoutSpring } from "@/lib/motion/transitions";
import { cn } from "@/lib/utils";

export function SharedElementCard({
  href,
  layoutId,
  className,
  children,
  ...props
}: HTMLMotionProps<"article"> & { href?: string; layoutId: string }) {
  const card = (
    <motion.article
      layout
      layoutId={layoutId}
      transition={layoutSpring}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/70 bg-card/75 shadow-elev1 backdrop-blur-xl",
        className
      )}
      {...props}
    >
      {children}
    </motion.article>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {card}
    </Link>
  );
}
