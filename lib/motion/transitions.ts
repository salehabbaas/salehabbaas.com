export const easings = {
  // Similar to CSS `easeOutCubic` but slightly snappier.
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const
};

export const durations = {
  fast: 0.18,
  base: 0.32,
  slow: 0.55
} as const;

export const pageTransition = {
  duration: durations.base,
  ease: easings.out
} as const;

export const revealTransition = {
  duration: durations.slow,
  ease: easings.out
} as const;

export const layoutSpring = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.9
} as const;

