"use client";

import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/lib/motion/useReducedMotion";

function isInteractiveTarget(target: Element | null) {
  if (!target) return false;
  return Boolean(
    target.closest(
      "a,button,input,textarea,select,summary,label,[role='button'],[role='link'],[data-cursor='interactive'],[data-cursor='magnetic']"
    )
  );
}

export function PointerGlow() {
  const reducedMotion = useReducedMotion();
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    if (typeof window === "undefined") return;

    const prefersFinePointer = window.matchMedia?.("(pointer: fine)")?.matches ?? false;
    const supportsHover = window.matchMedia?.("(hover: hover)")?.matches ?? false;
    if (!prefersFinePointer || !supportsHover) return;

    const dotEl = dotRef.current;
    const ringEl = ringRef.current;
    if (!dotEl || !ringEl) return;

    // Capture non-null element references for the lifetime of this effect.
    const dot = dotEl;
    const ring = ringEl;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let down = false;
    let interactive = false;

    const dotHalf = 3;
    const ringHalf = 18;

    let raf = 0;

    function render() {
      // A small amount of easing keeps movement smooth without lagging too far behind.
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;

      const ringScale = down ? 0.88 : interactive ? 1.28 : 1.0;

      dot.style.transform = `translate3d(${Math.round(currentX - dotHalf)}px, ${Math.round(currentY - dotHalf)}px, 0)`;
      ring.style.transform = `translate3d(${Math.round(currentX - ringHalf)}px, ${Math.round(currentY - ringHalf)}px, 0) scale(${ringScale})`;

      raf = window.requestAnimationFrame(render);
    }

    function updateInteractiveFromPoint(x: number, y: number) {
      const el = document.elementFromPoint(x, y);
      const next = isInteractiveTarget(el);
      if (next === interactive) return;
      interactive = next;
      ring.style.opacity = interactive ? "0.95" : "0.7";
    }

    function onMove(event: PointerEvent) {
      targetX = event.clientX;
      targetY = event.clientY;
      updateInteractiveFromPoint(targetX, targetY);
    }

    function onDown() {
      down = true;
    }

    function onUp() {
      down = false;
    }

    raf = window.requestAnimationFrame(render);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [reducedMotion]);

  // Fixed-position elements are cheaper to animate when updated via transforms.
  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[52] h-9 w-9 rounded-full border border-[hsl(var(--accent-strong)/0.35)] bg-[radial-gradient(circle_at_30%_30%,hsl(var(--accent-strong)/0.16),transparent_60%)] opacity-70 shadow-[0_0_60px_-18px_hsl(var(--accent-strong)/0.65)]"
        style={{ transform: "translate3d(-999px,-999px,0)" }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[52] h-[6px] w-[6px] rounded-full bg-[hsl(var(--accent-strong))] opacity-85 shadow-[0_0_25px_hsl(var(--accent-strong)/0.75)]"
        style={{ transform: "translate3d(-999px,-999px,0)" }}
      />
    </>
  );
}
