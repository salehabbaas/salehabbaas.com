"use client";

import { Children, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export function HomeSectionsShowcase({ children }: { children: React.ReactNode }) {
  const sections = useMemo(() => Children.toArray(children).filter(Boolean), [children]);
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root || !sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const topEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!topEntry) return;
        const index = Number((topEntry.target as HTMLDivElement).dataset.homeSectionIndex || "0");
        setActiveIndex(index);
      },
      {
        root,
        rootMargin: "-28% 0px -38% 0px",
        threshold: [0.2, 0.35, 0.5, 0.75]
      }
    );

    refs.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, [sections.length]);

  const scrollToSection = (index: number) => {
    refs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative">
      <aside className="pointer-events-none fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
        <div className="pointer-events-auto rounded-full border border-border/75 bg-black/30 px-2 py-3 backdrop-blur-xl">
          <div className="relative flex flex-col items-center gap-3">
            <motion.span
              className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_14px_rgba(45,212,191,0.8)]"
              animate={{ y: activeIndex * 22 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            />
            {sections.map((_, index) => (
              <button
                key={`home-dot-${index}`}
                type="button"
                onClick={() => scrollToSection(index)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full border border-border/85 bg-card/90 transition hover:bg-white/40",
                  index === activeIndex ? "opacity-0" : "opacity-100"
                )}
                aria-label={`Scroll to section ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </aside>

      <div id="home-scroll-root" ref={scrollRootRef} className="no-scrollbar h-[100dvh] snap-y snap-mandatory overflow-y-auto scroll-smooth">
        {sections.map((section, index) => (
          <motion.div
            key={`home-section-${index}`}
            ref={(element) => {
              refs.current[index] = element;
            }}
            data-home-section-index={index}
            className="snap-start"
            initial={{ opacity: 0, y: 64, scale: 0.985 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ root: scrollRootRef, once: false, amount: 0.28 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex min-h-[100dvh] w-full items-center">
              <div className="w-full">{section}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
