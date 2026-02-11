import type { Variants } from "framer-motion";

export const homeViewport = {
  once: true,
  amount: 0.2
};

export const homeFadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export const homeStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

export const homeSlowFloat: Variants = {
  initial: { x: 0, y: 0, opacity: 0.8 },
  animate: {
    x: [0, 24, -14, 0],
    y: [0, -20, 16, 0],
    opacity: [0.8, 1, 0.9, 0.8],
    transition: {
      duration: 16,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut"
    }
  }
};
