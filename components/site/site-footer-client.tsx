"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const quickLinks = [
  { href: "/ai-news", label: "AI News" },
  { href: "/projects", label: "Projects" },
  { href: "/services", label: "Services" },
  { href: "/knowledge", label: "Blog" },
  { href: "/creator", label: "Creator" },
  { href: "/contact", label: "Contact" }
];

type SiteFooterClientProps = {
  socialLinks: Array<{
    label: string;
    url: string;
  }>;
  embedded?: boolean;
};

export function SiteFooterClient({ socialLinks, embedded = false }: SiteFooterClientProps) {
  const pathname = usePathname();
  const [hiddenOnScrollUp, setHiddenOnScrollUp] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (embedded) return;
    lastScrollYRef.current = window.scrollY;

    const onScroll = () => {
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollYRef.current;

      // Ignore tiny jitter from trackpads and momentum.
      if (Math.abs(delta) < 6) return;

      if (delta < 0 && nextScrollY > 140) {
        setHiddenOnScrollUp(true);
      } else {
        setHiddenOnScrollUp(false);
      }

      lastScrollYRef.current = nextScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [embedded]);

  if (!embedded && pathname === "/") {
    return null;
  }

  return (
    <footer
      className={cn(
        "relative border-t border-border/70 bg-[hsla(var(--surface-950),0.94)] text-foreground backdrop-blur-lg transition-all duration-300",
        embedded ? "mt-0 overflow-hidden rounded-[2rem] border border-border/70" : "mt-24",
        hiddenOnScrollUp ? "pointer-events-none translate-y-8 opacity-0" : "translate-y-0 opacity-100"
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.12),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.12),transparent_50%)]" />

      <div className="container relative grid gap-10 py-12 md:grid-cols-[1.1fr_0.9fr_1fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3">
            <span className="relative inline-flex h-10 w-10 overflow-hidden rounded-xl border border-border/80 bg-card/80">
              <Image src="/SA-Logo.png" alt={`${BRAND_NAME} logo`} fill sizes="40px" className="object-contain p-0.5" />
            </span>
            <p className="font-display text-xl font-bold tracking-tight text-foreground">{BRAND_NAME}</p>
          </div>
          <p className="max-w-md text-sm text-foreground/70">{BRAND_TAGLINE}</p>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Ship fast. Explain clearly.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center justify-between rounded-2xl border border-border/70 bg-card/75 px-4 py-3 text-sm text-foreground/85 shadow-elev1 transition hover:border-primary/30 hover:text-foreground"
            >
              <span>{link.label}</span>
              <span className="text-xs text-foreground/50">→</span>
            </Link>
          ))}
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">Connect</p>
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((link) => (
              <Link
                key={`${link.label}-${link.url}`}
                href={link.url}
                className="rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm text-foreground transition hover:border-primary/40 hover:bg-primary/15 hover:text-foreground"
                target="_blank"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/75 p-4 text-sm text-foreground/70 shadow-elev1">
            <p className="font-semibold text-foreground">Book a build</p>
            <p className="mt-1 text-foreground/70">Need the Prism look on your product? Let’s scope a sprint.</p>
            <Link href="/book-meeting" className="mt-3 inline-flex items-center text-sm font-medium text-primary hover:text-primary/80">
              Book a meeting →
            </Link>
          </div>
        </div>
      </div>

      <div className="relative border-t border-border/70 bg-card/70">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-foreground/60">
          <span>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</span>
          <div className="flex gap-3">
            <Link href="/contact" className="hover:text-foreground">
              Contact
            </Link>
            <Link href="/book-meeting" className="hover:text-foreground">
              Book a meeting
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
