import type { Variants } from "framer-motion";

import { pageTransition, revealTransition } from "@/lib/motion/transitions";

export const viewport = {
  once: true,
  amount: 0.22
} as const;

export function pageVariants(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: pageTransition },
      exit: { opacity: 1 }
    };
  }

  return {
    initial: { opacity: 0, y: 10, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: pageTransition },
    exit: { opacity: 0, y: -6, filter: "blur(10px)", transition: pageTransition }
  };
}

export function fadeUp(reducedMotion: boolean, delay = 0): Variants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1, transition: { ...revealTransition, delay } }
    };
  }

  return {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { ...revealTransition, delay } }
  };
}

export function fadeIn(reducedMotion: boolean, delay = 0): Variants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1, transition: { ...revealTransition, delay } }
    };
  }

  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { ...revealTransition, delay } }
  };
}

export function stagger(reducedMotion: boolean, staggerChildren = 0.09, delayChildren = 0.05): Variants {
  if (reducedMotion) {
    return {
      hidden: {},
      visible: { transition: { delayChildren } }
    };
  }

  return {
    hidden: {},
    visible: {
      transition: {
        delayChildren,
        staggerChildren
      }
    }
  };
}

