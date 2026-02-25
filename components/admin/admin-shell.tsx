"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  BookOpen,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarRange,
  CircleUserRound,
  FolderKanban,
  LayoutDashboard,
  Link2,
  Linkedin,
  ExternalLink,
  Settings,
  ShieldAlert,
  Menu,
  UserRound,
  type LucideIcon
} from "lucide-react";

import { AdminLogoutButton } from "@/components/auth/admin-logout-button";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { adminNavigation, adminNavigationSections, type AdminNavIcon } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";

const navIconMap: Record<AdminNavIcon, LucideIcon> = {
  overview: LayoutDashboard,
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
  "job-tracker": BriefcaseBusiness,
  bookings: CalendarRange,
  settings: Settings,
  "settings-integrations": Settings,
  "settings-visibility": ShieldAlert,
  "settings-health": ShieldAlert
};

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavigationList({
  pathname,
  onNavigate
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-5">
      {adminNavigationSections.map((section) => {
        const items = adminNavigation.filter((item) => item.section === section.id);
        if (!items.length) return null;

        return (
          <section key={section.id} className="space-y-2">
            <div className="px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {section.label}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{section.hint}</p>
            </div>
            <div className="space-y-1">
              {items.map((item) => {
                const active = isItemActive(pathname, item.href);
                const Icon = navIconMap[item.icon];

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-2xl border px-3 py-3 transition-colors",
                      active
                        ? "border-primary/45 bg-primary/10 text-foreground shadow-elev1"
                        : "border-border/60 bg-card/50 text-foreground/85 hover:border-primary/40 hover:bg-card"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 rounded-lg border p-1.5",
                          active ? "border-primary/45 bg-primary/15 text-primary" : "border-border/60 bg-muted/30"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight">{item.label}</span>
                        <span className="mt-1 block text-xs leading-4 text-muted-foreground">{item.description}</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
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

  const activeItem = useMemo(() => {
    const sorted = [...adminNavigation].sort((a, b) => b.href.length - a.href.length);
    return sorted.find((item) => isItemActive(pathname, item.href)) ?? adminNavigation[0];
  }, [pathname]);

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
                  <SheetDescription>Website, operations, and integrations control panel.</SheetDescription>
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

      <div className="relative z-10 grid w-full gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-3xl border border-border/70 bg-card/65 p-4 shadow-elev2 backdrop-blur lg:block">
          <AdminNavigationList pathname={pathname} />
        </aside>

        <main className="space-y-6">
          <div className="rounded-3xl border border-border/70 bg-card/65 p-5 shadow-elev1 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current Workspace</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">{activeItem.label}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{activeItem.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge>Responsive SA Panel</Badge>
                <Badge variant="secondary">Single Navigation Source</Badge>
              </div>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
