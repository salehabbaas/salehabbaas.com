"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
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
import { auth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import type { PublicPagePath, PublicPageSettings } from "@/types/site-settings";

type NavItem = {
  path: PublicPagePath;
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const routeIconMap: Record<PublicPagePath, React.ComponentType<{ className?: string }>> = {
  "/": Home,
  "/ai-news": Newspaper,
  "/projects": FolderKanban,
  "/services": Wrench,
  "/experience": BriefcaseBusiness,
  "/blog": BookOpenText,
  "/creator": Clapperboard,
  "/about": User,
  "/certificates": Award,
  "/public-statement": BookOpenText,
  "/book-meeting": CalendarDays,
  "/contact": Mail
};

function isActive(pathname: string, path: string) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function SiteHeader({ pageSettings }: { pageSettings: PublicPageSettings }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAdminPanelLink, setShowAdminPanelLink] = useState(false);
  const enabledPages = useMemo(
    () =>
      pageSettings
        .filter((item) => item.enabled)
        .sort((a, b) => a.menuOrder - b.menuOrder || a.name.localeCompare(b.name) || a.path.localeCompare(b.path)),
    [pageSettings]
  );

  const homePage = useMemo(() => enabledPages.find((item) => item.path === "/"), [enabledPages]);
  const bookMeetingPage = useMemo(() => enabledPages.find((item) => item.path === "/book-meeting"), [enabledPages]);

  const menuLinks = useMemo<NavItem[]>(
    () =>
      enabledPages
        .filter((item) => item.path !== "/book-meeting")
        .map((item) => ({
          path: item.path,
          href: item.link,
          label: item.name,
          description: item.description,
          icon: routeIconMap[item.path]
        })),
    [enabledPages]
  );

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (!user) {
        setShowAdminPanelLink(false);
        return;
      }

      try {
        const existingSession = await fetch("/api/admin/session", { method: "GET", cache: "no-store" });
        if (existingSession.ok) {
          if (!active) return;
          setShowAdminPanelLink(true);
          return;
        }

        const idToken = await user.getIdToken();
        const sessionRepair = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken })
        });
        if (!active) return;
        setShowAdminPanelLink(sessionRepair.ok);
      } catch {
        if (!active) return;
        setShowAdminPanelLink(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

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
          <Link
            href={homePage?.link || "/"}
            className="group inline-flex shrink-0 items-center gap-2 rounded-full px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-card/85 shadow-elev1">
              <Image src="/SA-Logo.svg" alt={`${BRAND_NAME} logo`} fill sizes="36px" className="object-contain" priority />
            </span>
            <span className="hidden bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 bg-clip-text font-mono text-[11px] font-black uppercase tracking-[0.18em] text-transparent sm:inline">
              SalehAbbaas.com
            </span>
          </Link>

          <nav className="no-scrollbar hidden max-w-[56vw] items-center gap-1 overflow-x-auto whitespace-nowrap lg:flex">
            {menuLinks.map((item) => {
              const active = isActive(pathname, item.path);
              return (
                <Link
                  key={item.path}
                  href={item.href}
                  title={item.description || undefined}
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
            {showAdminPanelLink ? (
              <Button asChild variant="outline" size="sm" className="h-9 rounded-full px-4 font-mono text-[10px] font-black uppercase tracking-[0.2em]">
                <Link href="/admin">Admin Panel</Link>
              </Button>
            ) : null}
            {bookMeetingPage ? (
              <Button asChild size="sm" className="h-9 rounded-full px-4 font-mono text-[10px] font-black uppercase tracking-[0.2em]">
                <Link href={bookMeetingPage.link}>Let&apos;s Build</Link>
              </Button>
            ) : null}
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
                    <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-lg bg-card/80">
                      <Image src="/SA-Logo.svg" alt={`${BRAND_NAME} logo`} fill sizes="32px" className="object-contain" />
                    </span>
                    {BRAND_NAME}
                  </SheetTitle>
                </SheetHeader>

                <div className="grid gap-2 px-6 pb-6 pt-4">
                  {menuLinks.map((item) => {
                    const active = isActive(pathname, item.path);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={`${item.path}-${item.label}`}
                        href={item.href}
                        title={item.description || undefined}
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

                {showAdminPanelLink || bookMeetingPage ? (
                  <div className="px-6 pb-6">
                    <div className="space-y-2">
                      {showAdminPanelLink ? (
                        <Button asChild variant="outline" className="w-full">
                          <Link href="/admin" onClick={() => setMobileOpen(false)}>
                            Admin Panel
                          </Link>
                        </Button>
                      ) : null}
                      {bookMeetingPage ? (
                        <Button asChild variant="cta" className="w-full">
                          <Link href={bookMeetingPage.link} onClick={() => setMobileOpen(false)}>
                            <CalendarDays className="h-4 w-4" />
                            Let&apos;s Build
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.nav>
    </>
  );
}
