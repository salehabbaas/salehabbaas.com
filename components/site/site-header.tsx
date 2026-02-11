"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  Clapperboard,
  FolderKanban,
  Home,
  Mail,
  Menu,
  Newspaper,
  User,
  Wrench
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [introHeaderVisible, setIntroHeaderVisible] = useState(!isHome);

  const primary = useMemo<NavItem[]>(
    () => [
      { href: "/", label: "Home", icon: Home },
      { href: "/ai-news", label: "AI News", icon: Newspaper },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/services", label: "Services", icon: Wrench },
      { href: "/experience", label: "Experience", icon: BriefcaseBusiness },
      { href: "/knowledge", label: "Blog", icon: BookOpenText },
      { href: "/creator", label: "Creator", icon: Clapperboard }
    ],
    []
  );

  const secondary = useMemo<NavItem[]>(
    () => [
      { href: "/about", label: "About", icon: User },
      { href: "/certificates", label: "Certificates", icon: Award },
      { href: "/contact", label: "Contact", icon: Mail }
    ],
    []
  );

  const desktopLinks = useMemo(() => [...primary.slice(1), ...secondary], [primary, secondary]);

  useEffect(() => {
    if (!isHome) {
      setIntroHeaderVisible(true);
      return;
    }

    setIntroHeaderVisible(false);
    const showHeader = () => setIntroHeaderVisible(true);
    const timeout = window.setTimeout(showHeader, 7000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isHome]);

  if (isHome && !introHeaderVisible) {
    return null;
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-elev2 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="glass fixed left-3 top-4 z-[60] w-auto max-w-[calc(100vw-1.25rem)] rounded-[1.8rem] px-3 py-2 shadow-elev2 sm:left-5 sm:top-5 sm:px-4"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="group inline-flex shrink-0 items-center gap-2 rounded-full px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-card/85 shadow-elev1">
              <Image src="/SA-Logo.png" alt={`${BRAND_NAME} logo`} fill sizes="36px" className="object-contain p-0.5" priority />
            </span>
            <span className="hidden bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 bg-clip-text font-mono text-[11px] font-black uppercase tracking-[0.18em] text-transparent sm:inline">
              SalehAbbaas.com
            </span>
          </Link>

          <nav className="no-scrollbar hidden max-w-[56vw] items-center gap-1 overflow-x-auto whitespace-nowrap lg:flex">
            {desktopLinks.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-primary" : "text-foreground/90 hover:text-primary"
                  )}
                >
                  <AnimatePresence initial={false}>
                    {active ? <motion.span layoutId="left-nav-active" className="absolute inset-0 rounded-full border border-border/80 bg-card/80" /> : null}
                  </AnimatePresence>
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-1 lg:flex">
            <ThemeToggle />
            <Button asChild size="sm" className="h-9 rounded-full px-4 font-mono text-[10px] font-black uppercase tracking-[0.2em]">
              <Link href="/book-meeting">Let&apos;s Build</Link>
            </Button>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu" className="h-9 w-9 rounded-full border-border/80 bg-card/80 text-foreground hover:bg-card/90">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="p-0">
                <SheetHeader className="px-6 pt-6">
                  <SheetTitle className="inline-flex items-center gap-2 font-display text-base font-bold tracking-tight">
                    <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-lg border border-border/70 bg-card/80">
                      <Image src="/SA-Logo.png" alt={`${BRAND_NAME} logo`} fill sizes="32px" className="object-contain p-0.5" />
                    </span>
                    {BRAND_NAME}
                  </SheetTitle>
                </SheetHeader>

                <div className="grid gap-2 px-6 pb-6 pt-4">
                  {[...primary, ...secondary].map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm shadow-elev1 transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active ? "border-primary/30 bg-primary/20 text-foreground" : "text-foreground/90"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="font-medium">{item.label}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{active ? "Active" : ""}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="px-6 pb-6">
                  <Button asChild variant="cta" className="w-full">
                    <Link href="/book-meeting" onClick={() => setMobileOpen(false)}>
                      <CalendarDays className="h-4 w-4" />
                      Let&apos;s Build
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.nav>
    </>
  );
}
