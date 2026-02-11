export function PrismBackground() {
  // Pure CSS animation (no JS) so it stays cheap and respects reduced-motion via media query.
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 prism-slate" />

      {/* Animated blobs */}
      <div className="prism-blob prism-blob-1" />
      <div className="prism-blob prism-blob-2" />
      <div className="prism-blob prism-blob-3" />

      {/* Subtle grain */}
      <div className="absolute inset-0 noise-overlay" />

      {/* Vignette for contrast */}
      <div className="absolute inset-0 prism-vignette" />
    </div>
  );
}

