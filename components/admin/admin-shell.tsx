"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarRange,
  ChevronsLeft,
  ChevronsRight,
  CircleUserRound,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  Link2,
  Linkedin,
  ExternalLink,
  Settings,
  ShieldAlert,
  Radar,
  Menu,
  UserRound,
  type LucideIcon
} from "lucide-react";
import { signInWithCustomToken } from "firebase/auth";

import { AdminLogoutButton } from "@/components/auth/admin-logout-button";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { auth } from "@/lib/firebase/client";
import { adminNavigation, adminNavigationSections, type AdminNavIcon, type AdminNavSectionId } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";

const navIconMap: Record<AdminNavIcon, LucideIcon> = {
  overview: LayoutDashboard,
  "dashboard-stats": Radar,
  "dashboard-systems": BarChart3,
  cms: BookOpenCheck,
  "cms-profile": UserRound,
  "cms-projects": FolderKanban,
  "cms-blog": BookOpen,
  "cms-experience": CircleUserRound,
  "cms-services": ActivitySquare,
  "cms-certificates": BookOpenCheck,
  "cms-social": Link2,
  "cms-media": ActivitySquare,
  creator: ActivitySquare,
  linkedin: Linkedin,
  "project-management": FolderKanban,
  "job-tracker": BriefcaseBusiness,
  bookings: CalendarRange,
  settings: Settings,
  "settings-integrations": Settings,
  "settings-visibility": ShieldAlert,
  "settings-health": ShieldAlert
};

const sectionIconMap: Record<AdminNavSectionId, LucideIcon> = {
  overview: LayoutDashboard,
  content: BookOpenCheck,
  operations: BriefcaseBusiness,
  settings: Settings
};

type NavTone = "primary" | "accent" | "warning" | "success";

const sectionToneMap: Record<AdminNavSectionId, NavTone> = {
  overview: "primary",
  content: "accent",
  operations: "warning",
  settings: "success"
};

const navIconToneMap: Record<AdminNavIcon, NavTone> = {
  overview: "primary",
  "dashboard-stats": "primary",
  "dashboard-systems": "primary",
  cms: "accent",
  "cms-profile": "accent",
  "cms-projects": "accent",
  "cms-blog": "accent",
  "cms-experience": "accent",
  "cms-services": "accent",
  "cms-certificates": "accent",
  "cms-social": "accent",
  "cms-media": "accent",
  creator: "accent",
  linkedin: "warning",
  "project-management": "warning",
  "job-tracker": "warning",
  bookings: "warning",
  settings: "success",
  "settings-integrations": "success",
  "settings-visibility": "success",
  "settings-health": "success"
};

const navToneStyles: Record<
  NavTone,
  {
    sectionButton: string;
    sectionIcon: string;
    chevron: string;
    activeItem: string;
    hoverItem: string;
    activeIcon: string;
    idleIcon: string;
  }
> = {
  primary: {
    sectionButton: "border-primary/35 bg-primary/10 hover:border-primary/55",
    sectionIcon: "border-primary/35 bg-primary/15 text-primary",
    chevron: "text-primary",
    activeItem: "border-primary/45 bg-primary/10",
    hoverItem: "hover:border-primary/40",
    activeIcon: "border-primary/45 bg-primary/15 text-primary",
    idleIcon: "border-primary/25 bg-primary/10 text-primary/80"
  },
  accent: {
    sectionButton: "border-accent/35 bg-accent/10 hover:border-accent/55",
    sectionIcon: "border-accent/35 bg-accent/15 text-accent",
    chevron: "text-accent",
    activeItem: "border-accent/45 bg-accent/10",
    hoverItem: "hover:border-accent/40",
    activeIcon: "border-accent/45 bg-accent/15 text-accent",
    idleIcon: "border-accent/25 bg-accent/10 text-accent/85"
  },
  warning: {
    sectionButton: "border-warning/35 bg-warning/10 hover:border-warning/55",
    sectionIcon: "border-warning/35 bg-warning/15 text-warning",
    chevron: "text-warning",
    activeItem: "border-warning/45 bg-warning/10",
    hoverItem: "hover:border-warning/40",
    activeIcon: "border-warning/45 bg-warning/15 text-warning",
    idleIcon: "border-warning/25 bg-warning/10 text-warning/85"
  },
  success: {
    sectionButton: "border-success/35 bg-success/10 hover:border-success/55",
    sectionIcon: "border-success/35 bg-success/15 text-success",
    chevron: "text-success",
    activeItem: "border-success/45 bg-success/10",
    hoverItem: "hover:border-success/40",
    activeIcon: "border-success/45 bg-success/15 text-success",
    idleIcon: "border-success/25 bg-success/10 text-success/85"
  }
};

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavigationList({
  pathname,
  onNavigate,
  compact = false
}: {
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const sectionsWithItems = useMemo(
    () =>
      adminNavigationSections
        .map((section) => ({
          section,
          items: adminNavigation.filter((item) => item.section === section.id)
        }))
        .filter((entry) => entry.items.length > 0),
    []
  );

  const activeSectionId = useMemo(() => {
    const active = adminNavigation.find((item) => isItemActive(pathname, item.href));
    return active?.section ?? sectionsWithItems[0]?.section.id ?? "overview";
  }, [pathname, sectionsWithItems]);

  const [openSections, setOpenSections] = useState<Record<AdminNavSectionId, boolean>>(() => {
    const initial: Record<AdminNavSectionId, boolean> = {
      overview: true,
      content: false,
      operations: false,
      settings: false
    };
    initial[activeSectionId] = true;
    return initial;
  });

  useEffect(() => {
    setOpenSections((prev) => {
      if (prev[activeSectionId]) return prev;
      return { ...prev, [activeSectionId]: true };
    });
  }, [activeSectionId]);

  function toggleSection(sectionId: AdminNavSectionId) {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  if (compact) {
    return (
      <nav className="space-y-3">
        {sectionsWithItems.map(({ section, items }) => {
          const isOpen = openSections[section.id] ?? false;
          const sectionTone = sectionToneMap[section.id];
          const sectionStyles = navToneStyles[sectionTone];
          const SectionIcon = sectionIconMap[section.id];

          return (
            <section key={section.id} className="space-y-1.5">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "flex w-full items-center justify-center gap-1 rounded-lg border px-1 py-1.5 transition-colors",
                  sectionStyles.sectionButton
                )}
                aria-expanded={isOpen}
                aria-controls={`admin-compact-section-${section.id}`}
                title={`${section.label} group`}
              >
                <span className={cn("inline-flex rounded-md border p-1.5", sectionStyles.sectionIcon)}>
                  <SectionIcon className="h-4 w-4" />
                </span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", sectionStyles.chevron, isOpen ? "rotate-180" : "rotate-0")}
                />
              </button>
              {isOpen ? (
                <div id={`admin-compact-section-${section.id}`} className="space-y-1">
                  {items.map((item) => {
                    const active = isItemActive(pathname, item.href);
                    const Icon = navIconMap[item.icon];
                    const tone = navIconToneMap[item.icon];
                    const toneStyles = navToneStyles[tone];

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        title={item.label}
                        aria-label={item.label}
                        className={cn(
                          "group relative flex items-center justify-center rounded-xl border p-2.5 transition-colors",
                          active ? `${toneStyles.activeItem} text-foreground shadow-elev1` : `border-border/60 bg-card/50 text-foreground/85 ${toneStyles.hoverItem} hover:bg-card`
                        )}
                      >
                        <span className={cn("rounded-lg border p-1.5", active ? toneStyles.activeIcon : toneStyles.idleIcon)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-background/85 px-1 text-center text-[10px] font-semibold leading-tight text-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                          {item.label}
                        </span>
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-5">
      {sectionsWithItems.map(({ section, items }) => {
        const isOpen = openSections[section.id] ?? false;
        const sectionTone = sectionToneMap[section.id];
        const sectionStyles = navToneStyles[sectionTone];
        const SectionIcon = sectionIconMap[section.id];

        return (
          <section key={section.id} className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className={cn("flex w-full items-center justify-between rounded-xl border px-2 py-2 text-left", sectionStyles.sectionButton)}
              aria-expanded={isOpen}
              aria-controls={`admin-section-${section.id}`}
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span className={cn("mr-2 inline-flex rounded-md border p-1 align-middle", sectionStyles.sectionIcon)}>
                    <SectionIcon className="h-3.5 w-3.5" />
                  </span>
                  {section.label}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen ? "rotate-180" : "rotate-0",
                  isOpen ? sectionStyles.chevron : ""
                )}
              />
            </button>

            {isOpen ? (
              <div id={`admin-section-${section.id}`} className="space-y-1">
                {items.map((item) => {
                  const active = isItemActive(pathname, item.href);
                  const Icon = navIconMap[item.icon];
                  const tone = navIconToneMap[item.icon];
                  const toneStyles = navToneStyles[tone];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-2xl border px-3 py-3 transition-colors",
                        active ? `${toneStyles.activeItem} text-foreground shadow-elev1` : `border-border/60 bg-card/50 text-foreground/85 ${toneStyles.hoverItem} hover:bg-card`
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "mt-0.5 rounded-lg border p-1.5",
                            active ? toneStyles.activeIcon : toneStyles.idleIcon
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 text-sm font-medium leading-tight">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  children,
  actorEmail
}: {
  children: React.ReactNode;
  actorEmail?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [clientAuthReady, setClientAuthReady] = useState(false);
  const [clientAuthError, setClientAuthError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("sa-admin-sidebar-compact");
    setSidebarCompact(saved === "1");
  }, []);

  function toggleSidebarCompact() {
    setSidebarCompact((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sa-admin-sidebar-compact", next ? "1" : "0");
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function ensureAdminClientAuth() {
      try {
        if (auth?.currentUser) {
          const tokenResult = await auth.currentUser.getIdTokenResult();
          if (tokenResult.claims.admin === true) {
            if (!cancelled) setClientAuthReady(true);
            return;
          }
        }

        const response = await fetch("/api/admin/session", { method: "GET", cache: "no-store" });
        const payload = (await response.json()) as { customToken?: string; error?: string };
        if (!response.ok || !payload.customToken) {
          throw new Error(payload.error ?? "Unable to sync admin auth session.");
        }

        await signInWithCustomToken(auth, payload.customToken);
        if (!cancelled) setClientAuthReady(true);
      } catch (error) {
        if (cancelled) return;
        setClientAuthError(error instanceof Error ? error.message : "Unable to verify admin permissions.");
      }
    }

    void ensureAdminClientAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!clientAuthReady) {
    return (
      <div className="admin-erp relative min-h-screen overflow-x-clip bg-background">
        <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-30" />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card/80 p-6 text-center shadow-elev1 backdrop-blur">
            <p className="text-sm font-medium">Preparing admin session...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {clientAuthError || "Connecting secure Firestore listeners."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-erp relative min-h-screen overflow-x-clip bg-background">
      <div className="pointer-events-none fixed inset-x-0 top-[-15rem] z-0 h-[26rem] bg-[radial-gradient(circle_at_10%_20%,hsl(var(--accent)/0.22),transparent_45%),radial-gradient(circle_at_85%_18%,hsl(var(--primary)/0.22),transparent_40%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-30" />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="lg:hidden" aria-label="Open navigation">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto pb-4">
                <SheetHeader>
                  <SheetTitle className="inline-flex items-center gap-2">
                    <span className="relative inline-flex h-7 w-7 overflow-hidden rounded-md">
                      <Image src="/SA-Logo.svg" alt="SA Panel logo" fill sizes="28px" className="object-contain" />
                    </span>
                    SA Panel
                  </SheetTitle>
                </SheetHeader>
                <div className="px-6">
                  <AdminNavigationList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/admin" className="inline-flex items-center gap-2 font-serif text-xl tracking-wide sm:text-2xl">
              <span className="relative inline-flex h-7 w-7 overflow-hidden rounded-md">
                <Image src="/SA-Logo.svg" alt="SA Panel logo" fill sizes="28px" className="object-contain" priority />
              </span>
              SA Panel
            </Link>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={toggleSidebarCompact}
              aria-label={sidebarCompact ? "Expand menu" : "Collapse menu"}
              title={sidebarCompact ? "Expand menu" : "Collapse menu"}
            >
              {sidebarCompact ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden md:inline-flex">
              {actorEmail || "admin session"}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/" target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open Website
              </Link>
            </Button>
            <ThemeToggle />
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <div
        className={cn(
          "relative z-10 grid w-full gap-6 px-4 py-6 sm:px-6",
          sidebarCompact ? "lg:grid-cols-[92px_minmax(0,1fr)]" : "lg:grid-cols-[300px_minmax(0,1fr)]"
        )}
      >
        <aside
          className={cn(
            "hidden self-start rounded-3xl border border-border/70 bg-card/65 shadow-elev2 backdrop-blur lg:sticky lg:top-20 lg:block",
            "max-h-[calc(100vh-6rem)] overflow-y-auto",
            sidebarCompact ? "p-2.5" : "p-4"
          )}
        >
          <AdminNavigationList pathname={pathname} compact={sidebarCompact} />
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
