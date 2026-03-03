"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
  FolderOpen,
  GripVertical,
  LayoutTemplate,
  LayoutDashboard,
  Link2,
  Linkedin,
  ExternalLink,
  FileText,
  BellRing,
  Loader2,
  Settings,
  ShieldAlert,
  Radar,
  Menu,
  Pin,
  PinOff,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  onAuthStateChanged,
  signInWithCustomToken,
  type User,
} from "firebase/auth";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AdminLogoutButton } from "@/components/auth/admin-logout-button";
import { AdminAgentChatbot } from "@/components/admin/admin-agent-chatbot";
import { NotificationBanner } from "@/components/admin/notifications/notification-banner";
import { NotificationBell } from "@/components/admin/notifications/notification-bell";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { auth } from "@/lib/firebase/client";
import {
  adminNavigation,
  adminNavigationSections,
  type AdminNavIcon,
  type AdminNavSectionId,
} from "@/lib/data/navigation";
import { cn } from "@/lib/utils";
import {
  adminModuleKeys,
  type AdminModuleKey,
  type ModuleAccessMap,
} from "@/types/admin-access";

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
  "resume-studio": FileText,
  "resume-templates": LayoutTemplate,
  "job-tracker": BriefcaseBusiness,
  bookings: CalendarRange,
  settings: Settings,
  "settings-reminders": BellRing,
  "settings-access": ShieldAlert,
  "settings-integrations": Settings,
  "settings-visibility": ShieldAlert,
  "settings-health": ShieldAlert,
};

const sectionIconMap: Record<AdminNavSectionId, LucideIcon> = {
  overview: LayoutDashboard,
  content: BookOpenCheck,
  operations: BriefcaseBusiness,
  ai: Radar,
  settings: Settings,
};

type NavTone = "primary" | "accent" | "warning" | "success";

const sectionToneMap: Record<AdminNavSectionId, NavTone> = {
  overview: "primary",
  content: "accent",
  operations: "warning",
  ai: "primary",
  settings: "success",
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
  linkedin: "primary",
  "project-management": "warning",
  "resume-studio": "warning",
  "resume-templates": "warning",
  "job-tracker": "warning",
  bookings: "warning",
  settings: "success",
  "settings-reminders": "success",
  "settings-access": "success",
  "settings-integrations": "success",
  "settings-visibility": "success",
  "settings-health": "success",
};

export type AdminProjectNavItem = {
  id: string;
  name: string;
  role: "owner" | "viewer" | "editor";
};

type FavoriteNavItem = {
  href: string;
  label: string;
  icon: AdminNavIcon;
};

const favoriteStorageKey = "sa-admin-nav-favorites";
const projectSubmenuVisibilityStorageKey = "sa-admin-project-submenu-visible";
const favoriteProjectsExpandedStorageKey =
  "sa-admin-favorite-projects-expanded";
const adminSessionHintStorageKey = "sa-admin-session-active";
const projectsRootHref = "/admin/projects";
const maxProjectNameCharacters = 22;

function isProjectDetailHref(href: string) {
  return href.startsWith(`${projectsRootHref}/`);
}

function projectDisplayName(name: string) {
  return name.slice(0, maxProjectNameCharacters);
}

function moduleForPath(href: string): AdminModuleKey {
  if (
    href === "/admin" ||
    href.startsWith("/admin/system") ||
    href.startsWith("/admin/control-center") ||
    href.startsWith("/admin/logs")
  ) {
    return "dashboard";
  }
  if (href.startsWith("/admin/cms")) return "cms";
  if (href.startsWith("/admin/creator")) return "creator";
  if (href.startsWith("/admin/linkedin-studio")) return "linkedin";
  if (href.startsWith(projectsRootHref)) return "projects";
  if (href.startsWith("/admin/resume-studio")) return "resume";
  if (href.startsWith("/admin/job-tracker") || href === "/admin/jobs")
    return "jobs";
  if (href.startsWith("/admin/bookings")) return "bookings";
  if (href.startsWith("/admin/settings")) return "settings";
  if (href.startsWith("/admin/agent")) return "salehOsChat";
  return "dashboard";
}

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
    idleIcon: "border-primary/25 bg-primary/10 text-primary/80",
  },
  accent: {
    sectionButton: "border-accent/35 bg-accent/10 hover:border-accent/55",
    sectionIcon: "border-accent/35 bg-accent/15 text-accent",
    chevron: "text-accent",
    activeItem: "border-accent/45 bg-accent/10",
    hoverItem: "hover:border-accent/40",
    activeIcon: "border-accent/45 bg-accent/15 text-accent",
    idleIcon: "border-accent/25 bg-accent/10 text-accent/85",
  },
  warning: {
    sectionButton: "border-warning/35 bg-warning/10 hover:border-warning/55",
    sectionIcon: "border-warning/35 bg-warning/15 text-warning",
    chevron: "text-warning",
    activeItem: "border-warning/45 bg-warning/10",
    hoverItem: "hover:border-warning/40",
    activeIcon: "border-warning/45 bg-warning/15 text-warning",
    idleIcon: "border-warning/25 bg-warning/10 text-warning/85",
  },
  success: {
    sectionButton: "border-success/35 bg-success/10 hover:border-success/55",
    sectionIcon: "border-success/35 bg-success/15 text-success",
    chevron: "text-success",
    activeItem: "border-success/45 bg-success/10",
    hoverItem: "hover:border-success/40",
    activeIcon: "border-success/45 bg-success/15 text-success",
    idleIcon: "border-success/25 bg-success/10 text-success/85",
  },
};

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SortableFavoriteItem({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: (dragHandle: {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: href });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(className, isDragging ? "opacity-80" : "")}
    >
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

function ProjectSubmenu({
  pathname,
  projects,
  compact,
  favorites,
  onToggleFavorite,
  onNavigate,
  showFavoriteToggle = true,
}: {
  pathname: string;
  projects: AdminProjectNavItem[];
  compact: boolean;
  favorites: Set<string>;
  onToggleFavorite: (href: string) => void;
  onNavigate?: () => void;
  showFavoriteToggle?: boolean;
}) {
  if (!projects.length) return null;

  return (
    <div
      className={cn(
        "space-y-1 border-l border-border/45 pl-2",
        compact ? "ml-1.5" : "ml-7",
      )}
    >
      {projects.map((project) => {
        const href = `${projectsRootHref}/${project.id}`;
        const active = isItemActive(pathname, href);
        const displayName = projectDisplayName(project.name);
        const isFavorite = favorites.has(href);
        const toneStyles = navToneStyles.warning;

        if (compact) {
          return (
            <div
              key={project.id}
              className={cn(
                "flex items-center",
                showFavoriteToggle ? "gap-1" : "",
              )}
            >
              <Link
                href={href}
                onClick={onNavigate}
                title={project.name}
                aria-label={project.name}
                className={cn(
                  "group relative flex flex-1 items-center justify-center rounded-xl border p-2.5 transition-colors",
                  active
                    ? `${toneStyles.activeItem} text-foreground shadow-elev1`
                    : `border-border/60 bg-card/50 text-foreground/85 ${toneStyles.hoverItem} hover:bg-card`,
                )}
              >
                <span
                  className={cn(
                    "rounded-lg border p-1.5",
                    active ? toneStyles.activeIcon : toneStyles.idleIcon,
                  )}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </span>
                <span className="sr-only">{project.name}</span>
              </Link>
              {showFavoriteToggle ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-9 w-9 rounded-xl p-0",
                    isFavorite
                      ? "text-warning"
                      : "text-muted-foreground hover:text-warning",
                  )}
                  onClick={() => onToggleFavorite(href)}
                  aria-label={
                    isFavorite
                      ? `Remove ${project.name} from favorites`
                      : `Add ${project.name} to favorites`
                  }
                  title={
                    isFavorite ? "Remove from favorites" : "Add to favorites"
                  }
                >
                  {isFavorite ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
            </div>
          );
        }

        return (
          <div
            key={project.id}
            className={cn(
              "flex items-center",
              showFavoriteToggle ? "gap-1" : "",
            )}
          >
            <Link
              href={href}
              onClick={onNavigate}
              title={project.name}
              aria-label={project.name}
              className={cn(
                "flex-1 rounded-2xl border px-3 py-3 transition-colors",
                active
                  ? `${toneStyles.activeItem} text-foreground shadow-elev1`
                  : `border-border/60 bg-card/50 text-foreground/85 ${toneStyles.hoverItem} hover:bg-card`,
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "mt-0.5 rounded-lg border p-1.5",
                    active ? toneStyles.activeIcon : toneStyles.idleIcon,
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium leading-tight">
                  {displayName}
                </span>
              </div>
            </Link>
            {showFavoriteToggle ? (
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-9 w-9 rounded-xl p-0",
                  isFavorite
                    ? "text-warning"
                    : "text-muted-foreground hover:text-warning",
                )}
                onClick={() => onToggleFavorite(href)}
                aria-label={
                  isFavorite
                    ? `Remove ${project.name} from favorites`
                    : `Add ${project.name} to favorites`
                }
                title={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                {isFavorite ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AdminNavigationList({
  pathname,
  onNavigate,
  compact = false,
  moduleAccess,
  favorites,
  projectNavItems,
  onToggleFavorite,
  onReorderFavorites,
}: {
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
  moduleAccess: ModuleAccessMap;
  favorites: string[];
  projectNavItems: AdminProjectNavItem[];
  onToggleFavorite: (href: string) => void;
  onReorderFavorites: (next: string[]) => void;
}) {
  const visibleNavigation = useMemo(
    () =>
      adminNavigation.filter((item) => {
        const moduleKey = moduleForPath(item.href);
        return moduleAccess[moduleKey];
      }),
    [moduleAccess],
  );

  const sectionsWithItems = useMemo(
    () =>
      adminNavigationSections
        .map((section) => ({
          section,
          items: visibleNavigation.filter(
            (item) => item.section === section.id,
          ),
        }))
        .filter((entry) => entry.items.length > 0),
    [visibleNavigation],
  );
  const rawProjectLinks = useMemo(
    () =>
      projectNavItems.map((project) => ({
        ...project,
        href: `${projectsRootHref}/${project.id}`,
      })),
    [projectNavItems],
  );
  const projectLinkByHref = useMemo(
    () => new Map(rawProjectLinks.map((project) => [project.href, project])),
    [rawProjectLinks],
  );
  const navItemByHref = useMemo(
    () => new Map(visibleNavigation.map((item) => [item.href, item])),
    [visibleNavigation],
  );
  const favoriteNavigationItems = useMemo(
    () =>
      favorites
        .map((href): FavoriteNavItem | null => {
          const navItem = navItemByHref.get(href);
          if (!navItem) return null;
          return {
            href: navItem.href,
            label: navItem.label,
            icon: navItem.icon,
          };
        })
        .filter((item): item is FavoriteNavItem => Boolean(item)),
    [favorites, navItemByHref],
  );
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const favoriteNavigationIds = useMemo(
    () => favoriteNavigationItems.map((item) => item.href),
    [favoriteNavigationItems],
  );
  const projectFavoriteOrder = useMemo(
    () =>
      favorites.filter(
        (href, index) =>
          isProjectDetailHref(href) &&
          projectLinkByHref.has(href) &&
          favorites.indexOf(href) === index,
      ),
    [favorites, projectLinkByHref],
  );
  const favoriteProjectNavItems = useMemo(
    () =>
      projectFavoriteOrder
        .map((href): AdminProjectNavItem | null => {
          const project = projectLinkByHref.get(href);
          if (!project) return null;
          return {
            id: project.id,
            name: project.name,
            role: project.role,
          };
        })
        .filter((project): project is AdminProjectNavItem => Boolean(project)),
    [projectFavoriteOrder, projectLinkByHref],
  );
  const pinnedProjectSet = useMemo(
    () => new Set(projectFavoriteOrder),
    [projectFavoriteOrder],
  );
  const sortedProjectLinks = useMemo(
    () =>
      [...rawProjectLinks].sort((a, b) => {
        const aPinned = pinnedProjectSet.has(a.href);
        const bPinned = pinnedProjectSet.has(b.href);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return a.name.localeCompare(b.name);
      }),
    [pinnedProjectSet, rawProjectLinks],
  );
  const pinnedProjectsCount = projectFavoriteOrder.length;
  const hasFavoriteContent =
    favoriteNavigationItems.length > 0 || favoriteProjectNavItems.length > 0;
  const dragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const [openSections, setOpenSections] = useState<
    Record<AdminNavSectionId, boolean>
  >(() => {
    return {
      overview: false,
      content: false,
      operations: false,
      ai: false,
      settings: false,
    };
  });
  const [projectsVisible, setProjectsVisible] = useState(true);
  const [favoriteProjectsExpanded, setFavoriteProjectsExpanded] =
    useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(
      projectSubmenuVisibilityStorageKey,
    );
    if (stored === "0") setProjectsVisible(false);
    if (stored === "1") setProjectsVisible(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(
      favoriteProjectsExpandedStorageKey,
    );
    if (stored === "0") setFavoriteProjectsExpanded(false);
    if (stored === "1") setFavoriteProjectsExpanded(true);
  }, []);

  function toggleSection(sectionId: AdminNavSectionId) {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  function toggleProjectVisibility() {
    setProjectsVisible((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          projectSubmenuVisibilityStorageKey,
          next ? "1" : "0",
        );
      }
      return next;
    });
  }

  function toggleFavoriteProjectsExpanded() {
    setFavoriteProjectsExpanded((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          favoriteProjectsExpandedStorageKey,
          next ? "1" : "0",
        );
      }
      return next;
    });
  }

  function onFavoriteNavigate() {
    setOpenSections({
      overview: false,
      content: false,
      operations: false,
      ai: false,
      settings: false,
    });
    onNavigate?.();
  }

  function onStandardNavigate() {
    onNavigate?.();
  }

  function onFavoriteDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (!activeId || !overId || activeId === overId) return;
    const oldIndex = favoriteNavigationIds.indexOf(activeId);
    const newIndex = favoriteNavigationIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const reorderedGroup = arrayMove(favoriteNavigationIds, oldIndex, newIndex);
    onReorderFavorites([...reorderedGroup, ...projectFavoriteOrder]);
  }

  if (compact) {
    return (
      <nav className="space-y-3">
        <section className="space-y-1.5">
          {hasFavoriteContent ? (
            <div className="space-y-1">
              {favoriteNavigationItems.length ? (
                <div className="space-y-1">
                  {favoriteNavigationItems.map((item) => {
                    const active = isItemActive(pathname, item.href);
                    const toneStyles = navToneStyles[navIconToneMap[item.icon]];
                    const Icon = navIconMap[item.icon];
                    const isProjectsRoot = item.href === projectsRootHref;
                    const hasFavoriteProjects =
                      isProjectsRoot && favoriteProjectNavItems.length > 0;

                    return (
                      <div
                        key={`favorite-compact-nav-${item.href}`}
                        className="space-y-1"
                      >
                        <div className="flex items-center gap-1">
                          <Link
                            href={item.href}
                            onClick={onFavoriteNavigate}
                            title={item.label}
                            aria-label={item.label}
                            className={cn(
                              "group relative flex flex-1 items-center justify-center rounded-xl border p-2.5 transition-colors",
                              active
                                ? `${toneStyles.activeItem} text-foreground shadow-elev1`
                                : `border-border/60 bg-card/50 text-foreground/85 ${toneStyles.hoverItem} hover:bg-card`,
                            )}
                          >
                            <span
                              className={cn(
                                "rounded-md border p-1",
                                active
                                  ? toneStyles.activeIcon
                                  : toneStyles.idleIcon,
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-background/85 px-1 text-center text-[10px] font-semibold leading-tight text-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                              {item.label}
                            </span>
                            <span className="sr-only">{item.label}</span>
                          </Link>
                          {isProjectsRoot ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              onClick={toggleFavoriteProjectsExpanded}
                              disabled={!hasFavoriteProjects}
                              aria-label={
                                favoriteProjectsExpanded
                                  ? "Collapse favorite projects"
                                  : "Expand favorite projects"
                              }
                              title={
                                favoriteProjectsExpanded
                                  ? "Collapse favorite projects"
                                  : "Expand favorite projects"
                              }
                            >
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform",
                                  favoriteProjectsExpanded &&
                                    hasFavoriteProjects
                                    ? "rotate-180"
                                    : "rotate-0",
                                )}
                              />
                            </Button>
                          ) : null}
                        </div>
                        {hasFavoriteProjects && favoriteProjectsExpanded ? (
                          <ProjectSubmenu
                            pathname={pathname}
                            projects={favoriteProjectNavItems}
                            compact
                            favorites={favoriteSet}
                            onToggleFavorite={onToggleFavorite}
                            onNavigate={onFavoriteNavigate}
                            showFavoriteToggle={false}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="px-1 text-center text-[10px] text-muted-foreground">
              No favorites
            </p>
          )}
        </section>
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
                  sectionStyles.sectionButton,
                )}
                aria-expanded={isOpen}
                aria-controls={`admin-compact-section-${section.id}`}
                title={`${section.label} group`}
              >
                <span
                  className={cn(
                    "inline-flex rounded-md border p-1.5",
                    sectionStyles.sectionIcon,
                  )}
                >
                  <SectionIcon className="h-4 w-4" />
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    sectionStyles.chevron,
                    isOpen ? "rotate-180" : "rotate-0",
                  )}
                />
              </button>
              {isOpen ? (
                <div
                  id={`admin-compact-section-${section.id}`}
                  className="space-y-1"
                >
                  {items.map((item) => {
                    const active = isItemActive(pathname, item.href);
                    const Icon = navIconMap[item.icon];
                    const tone = navIconToneMap[item.icon];
                    const toneStyles = navToneStyles[tone];
                    const projectLinks =
                      item.href === projectsRootHref ? sortedProjectLinks : [];
                    const isProjectsRoot = item.href === projectsRootHref;
                    const canToggleProjects =
                      isProjectsRoot && projectLinks.length > 0;

                    return (
                      <div key={item.href} className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Link
                            href={item.href}
                            onClick={onStandardNavigate}
                            title={item.label}
                            aria-label={item.label}
                            className={cn(
                              "group relative flex flex-1 items-center justify-center rounded-xl border p-2.5 transition-colors",
                              active
                                ? `${toneStyles.activeItem} text-foreground shadow-elev1`
                                : `border-border/60 bg-card/50 text-foreground/85 ${toneStyles.hoverItem} hover:bg-card`,
                            )}
                          >
                            <span
                              className={cn(
                                "rounded-lg border p-1.5",
                                active
                                  ? toneStyles.activeIcon
                                  : toneStyles.idleIcon,
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-background/85 px-1 text-center text-[10px] font-semibold leading-tight text-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                              {item.label}
                            </span>
                            <span className="sr-only">{item.label}</span>
                          </Link>
                          {canToggleProjects ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 w-9 rounded-xl p-0 text-muted-foreground hover:text-foreground"
                              onClick={toggleProjectVisibility}
                              aria-label={
                                projectsVisible
                                  ? "Collapse project links"
                                  : "Expand project links"
                              }
                              title={
                                projectsVisible
                                  ? "Collapse projects"
                                  : "Expand projects"
                              }
                            >
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  projectsVisible ? "rotate-180" : "rotate-0",
                                )}
                              />
                            </Button>
                          ) : null}
                        </div>
                        {projectsVisible ? (
                          <ProjectSubmenu
                            pathname={pathname}
                            projects={projectLinks}
                            compact
                            favorites={favoriteSet}
                            onToggleFavorite={onToggleFavorite}
                            onNavigate={onStandardNavigate}
                            showFavoriteToggle={false}
                          />
                        ) : null}
                      </div>
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
      <section className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-warning/35 bg-warning/10 px-2 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warning">
            Favorites
          </span>
          <Badge variant="secondary">
            {favoriteNavigationItems.length + pinnedProjectsCount}
          </Badge>
        </div>
        {hasFavoriteContent ? (
          <div className="space-y-2">
            {favoriteNavigationItems.length ? (
              <DndContext
                sensors={dragSensors}
                collisionDetection={closestCenter}
                onDragEnd={onFavoriteDragEnd}
              >
                <SortableContext
                  items={favoriteNavigationIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {favoriteNavigationItems.map((item) => {
                      const active = isItemActive(pathname, item.href);
                      const toneStyles =
                        navToneStyles[navIconToneMap[item.icon]];
                      const Icon = navIconMap[item.icon];
                      const isProjectsRoot = item.href === projectsRootHref;
                      const hasFavoriteProjects =
                        isProjectsRoot && favoriteProjectNavItems.length > 0;

                      return (
                        <div
                          key={`favorite-nav-${item.href}`}
                          className="space-y-1"
                        >
                          <SortableFavoriteItem
                            href={item.href}
                            className="group/favrow flex items-center gap-1"
                          >
                            {({ attributes, listeners, isDragging }) => (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className={cn(
                                    "h-8 w-0 shrink-0 overflow-hidden rounded-lg p-0 text-muted-foreground opacity-0 transition-all duration-150 group-hover/favrow:w-8 group-hover/favrow:opacity-100 group-focus-within/favrow:w-8 group-focus-within/favrow:opacity-100 focus-visible:w-8 focus-visible:opacity-100 hover:text-foreground",
                                    isDragging
                                      ? "w-8 opacity-100 text-foreground"
                                      : "",
                                  )}
                                  aria-label={`Drag to reorder ${item.label}`}
                                  title="Drag to reorder"
                                  {...attributes}
                                  {...listeners}
                                >
                                  <GripVertical className="h-3.5 w-3.5" />
                                </Button>
                                <Link
                                  href={item.href}
                                  onClick={onFavoriteNavigate}
                                  className={cn(
                                    "flex-1 rounded-2xl border px-3 py-3 transition-colors",
                                    active
                                      ? `${toneStyles.activeItem} text-foreground shadow-elev1`
                                      : `border-border/60 bg-card/50 text-foreground/85 ${toneStyles.hoverItem} hover:bg-card`,
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={cn(
                                        "mt-0.5 rounded-lg border p-1.5",
                                        active
                                          ? toneStyles.activeIcon
                                          : toneStyles.idleIcon,
                                      )}
                                    >
                                      <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 text-sm font-medium leading-tight">
                                      {item.label}
                                    </span>
                                  </div>
                                </Link>
                                {isProjectsRoot ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    onClick={toggleFavoriteProjectsExpanded}
                                    disabled={!hasFavoriteProjects}
                                    aria-label={
                                      favoriteProjectsExpanded
                                        ? "Collapse favorite projects"
                                        : "Expand favorite projects"
                                    }
                                    title={
                                      favoriteProjectsExpanded
                                        ? "Collapse favorite projects"
                                        : "Expand favorite projects"
                                    }
                                  >
                                    <ChevronDown
                                      className={cn(
                                        "h-3.5 w-3.5 transition-transform",
                                        favoriteProjectsExpanded &&
                                          hasFavoriteProjects
                                          ? "rotate-180"
                                          : "rotate-0",
                                      )}
                                    />
                                  </Button>
                                ) : null}
                              </>
                            )}
                          </SortableFavoriteItem>
                          {hasFavoriteProjects && favoriteProjectsExpanded ? (
                            <ProjectSubmenu
                              pathname={pathname}
                              projects={favoriteProjectNavItems}
                              compact={false}
                              favorites={favoriteSet}
                              onToggleFavorite={onToggleFavorite}
                              onNavigate={onFavoriteNavigate}
                              showFavoriteToggle={false}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl border border-border/60 bg-card/50 px-3 py-2 text-sm text-muted-foreground">
            No favorites yet. Use the pin button beside any page.
          </p>
        )}
      </section>
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
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-2 py-2 text-left",
                sectionStyles.sectionButton,
              )}
              aria-expanded={isOpen}
              aria-controls={`admin-section-${section.id}`}
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span
                    className={cn(
                      "mr-2 inline-flex rounded-md border p-1 align-middle",
                      sectionStyles.sectionIcon,
                    )}
                  >
                    <SectionIcon className="h-3.5 w-3.5" />
                  </span>
                  {section.label}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen ? "rotate-180" : "rotate-0",
                  isOpen ? sectionStyles.chevron : "",
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
                  const isFavorite = favoriteSet.has(item.href);
                  const projectLinks =
                    item.href === projectsRootHref ? sortedProjectLinks : [];
                  const isProjectsRoot = item.href === projectsRootHref;
                  const canToggleProjects =
                    isProjectsRoot && projectLinks.length > 0;

                  return (
                    <div key={item.href} className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Link
                          href={item.href}
                          onClick={onStandardNavigate}
                          className={cn(
                            "flex-1 rounded-2xl border px-3 py-3 transition-colors",
                            active
                              ? `${toneStyles.activeItem} text-foreground shadow-elev1`
                              : `border-border/60 bg-card/50 text-foreground/85 ${toneStyles.hoverItem} hover:bg-card`,
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "mt-0.5 rounded-lg border p-1.5",
                                active
                                  ? toneStyles.activeIcon
                                  : toneStyles.idleIcon,
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 text-sm font-medium leading-tight">
                              {item.label}
                            </span>
                          </div>
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          className={cn(
                            "h-9 w-9 rounded-xl p-0",
                            isFavorite
                              ? "text-warning"
                              : "text-muted-foreground hover:text-warning",
                          )}
                          onClick={() => onToggleFavorite(item.href)}
                          aria-label={
                            isFavorite
                              ? `Remove ${item.label} from favorites`
                              : `Add ${item.label} to favorites`
                          }
                          title={
                            isFavorite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                        >
                          {isFavorite ? (
                            <PinOff className="h-4 w-4" />
                          ) : (
                            <Pin className="h-4 w-4" />
                          )}
                        </Button>
                        {canToggleProjects ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 w-9 rounded-xl p-0 text-muted-foreground hover:text-foreground"
                            onClick={toggleProjectVisibility}
                            aria-label={
                              projectsVisible
                                ? "Collapse project links"
                                : "Expand project links"
                            }
                            title={
                              projectsVisible
                                ? "Collapse projects"
                                : "Expand projects"
                            }
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                projectsVisible ? "rotate-180" : "rotate-0",
                              )}
                            />
                          </Button>
                        ) : null}
                      </div>
                      {projectsVisible ? (
                        <ProjectSubmenu
                          pathname={pathname}
                          projects={projectLinks}
                          compact={false}
                          favorites={favoriteSet}
                          onToggleFavorite={onToggleFavorite}
                          onNavigate={onStandardNavigate}
                        />
                      ) : null}
                    </div>
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
  actorEmail,
  actorRole: _actorRole,
  actorModuleAccess,
  actorProjects = [],
}: {
  children: React.ReactNode;
  actorEmail?: string;
  actorRole?: string;
  actorModuleAccess?: Partial<ModuleAccessMap>;
  actorProjects?: AdminProjectNavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [clientAuthReady, setClientAuthReady] = useState(false);
  const [clientAuthError, setClientAuthError] = useState("");
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>([]);
  const moduleAccess = useMemo(
    () =>
      adminModuleKeys.reduce((acc, key) => {
        acc[key] = actorModuleAccess ? actorModuleAccess[key] === true : true;
        return acc;
      }, {} as ModuleAccessMap),
    [actorModuleAccess],
  );
  const visibleNavigation = useMemo(
    () =>
      adminNavigation.filter((item) => {
        const moduleKey = moduleForPath(item.href);
        return moduleAccess[moduleKey];
      }),
    [moduleAccess],
  );
  const projectNavItems = useMemo(
    () => (moduleAccess.projects ? actorProjects : []),
    [actorProjects, moduleAccess.projects],
  );
  const availableNavigationFavoriteHrefs = useMemo(
    () => new Set(visibleNavigation.map((item) => item.href)),
    [visibleNavigation],
  );
  const availableFavoriteHrefs = useMemo(() => {
    const hrefs = new Set(availableNavigationFavoriteHrefs);
    projectNavItems.forEach((project) => {
      hrefs.add(`${projectsRootHref}/${project.id}`);
    });
    return hrefs;
  }, [availableNavigationFavoriteHrefs, projectNavItems]);

  const updateFavorites = useCallback(
    (updater: (prev: string[]) => string[]) => {
      setFavoriteHrefs((prev) => {
        const next = updater(prev);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
        }
        return next;
      });
    },
    [],
  );

  const toggleFavorite = useCallback(
    (href: string) => {
      const isProjectHref = isProjectDetailHref(href);
      if (isProjectHref) {
        if (!moduleAccess.projects) return;
        const canAccessProject = projectNavItems.some(
          (project) => `${projectsRootHref}/${project.id}` === href,
        );
        if (!canAccessProject) return;
      }
      updateFavorites((prev) => {
        const hasHref = prev.includes(href);

        if (isProjectHref) {
          if (hasHref) return prev.filter((item) => item !== href);
          const withProjectsRoot = prev.includes(projectsRootHref)
            ? prev
            : [...prev, projectsRootHref];
          return [...withProjectsRoot, href];
        }

        if (href === projectsRootHref && hasHref) {
          return prev.filter(
            (item) => item !== projectsRootHref && !isProjectDetailHref(item),
          );
        }

        if (hasHref) return prev.filter((item) => item !== href);
        return [...prev, href];
      });
    },
    [moduleAccess.projects, projectNavItems, updateFavorites],
  );

  const reorderFavorites = useCallback(
    (nextOrder: string[]) => {
      updateFavorites((prev) => {
        if (!nextOrder.length) return prev;
        const prevSet = new Set(prev);
        const next = nextOrder.filter(
          (href, index) =>
            prevSet.has(href) && nextOrder.indexOf(href) === index,
        );
        if (!next.length) return prev;
        if (
          next.length === prev.length &&
          next.every((href, index) => href === prev[index])
        )
          return prev;
        return next;
      });
    },
    [updateFavorites],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(favoriteStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setFavoriteHrefs(
        parsed.filter((item): item is string => typeof item === "string"),
      );
    } catch {
      setFavoriteHrefs([]);
    }
  }, []);

  useEffect(() => {
    updateFavorites((prev) => {
      const seen = new Set<string>();
      const next = prev.filter((href) => {
        if (!availableFavoriteHrefs.has(href) || seen.has(href)) return false;
        seen.add(href);
        return true;
      });
      const hasProjectFavorites = next.some((href) =>
        isProjectDetailHref(href),
      );
      const hasProjectsModule = next.includes(projectsRootHref);
      if (
        hasProjectFavorites &&
        !hasProjectsModule &&
        availableNavigationFavoriteHrefs.has(projectsRootHref)
      ) {
        const firstProjectIndex = next.findIndex((href) =>
          isProjectDetailHref(href),
        );
        const insertIndex =
          firstProjectIndex === -1 ? next.length : firstProjectIndex;
        next.splice(insertIndex, 0, projectsRootHref);
      }
      if (
        next.length === prev.length &&
        next.every((href, index) => href === prev[index])
      )
        return prev;
      return next;
    });
  }, [
    availableFavoriteHrefs,
    availableNavigationFavoriteHrefs,
    updateFavorites,
  ]);

  const firstFavoriteHref = favoriteHrefs.find((href) =>
    availableNavigationFavoriteHrefs.has(href),
  );
  const adminHomeHref = firstFavoriteHref || "/admin";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("sa-admin-sidebar-compact");
    setSidebarCompact(saved === "1");
  }, []);

  function toggleSidebarCompact() {
    setSidebarCompact((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "sa-admin-sidebar-compact",
          next ? "1" : "0",
        );
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;

    function markAdminSessionHint(active: boolean) {
      if (typeof window === "undefined") return;
      if (active) {
        window.localStorage.setItem(adminSessionHintStorageKey, "1");
      } else {
        window.localStorage.removeItem(adminSessionHintStorageKey);
      }
    }

    function waitForFirebaseUser(timeoutMs = 1500): Promise<User | null> {
      if (!auth) return Promise.resolve(null);
      return new Promise((resolve) => {
        let settled = false;
        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          unsubscribe();
          resolve(auth.currentUser);
        }, timeoutMs);

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          unsubscribe();
          resolve(user);
        });
      });
    }

    async function getCurrentFirebaseUser() {
      if (!auth) return null;

      if (
        "authStateReady" in auth &&
        typeof auth.authStateReady === "function"
      ) {
        await auth.authStateReady();
      }

      let user = auth.currentUser;
      if (!user) {
        user = await waitForFirebaseUser(1200);
      }
      return user;
    }

    async function getSessionCustomToken() {
      const response = await fetch("/api/admin/session", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        customToken?: string;
        error?: string;
      };
      if (!response.ok || !payload.customToken) return null;
      return payload.customToken;
    }

    async function repairServerSessionFromClientUser(
      firebaseUser?: User | null,
    ) {
      const user = firebaseUser ?? (await getCurrentFirebaseUser());
      if (!user) return false;

      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      return response.ok;
    }

    async function signInWithServerSessionToken() {
      if (!auth) return false;
      const customToken = await getSessionCustomToken();
      if (!customToken) return false;
      await signInWithCustomToken(auth, customToken);
      return true;
    }

    function markReady() {
      markAdminSessionHint(true);
      if (cancelled) return;
      setClientAuthReady(true);
      setClientAuthError("");
    }

    async function ensureAdminClientAuth() {
      try {
        if (!auth) {
          throw new Error("Client auth is not configured.");
        }

        const hasAdminSessionHint =
          typeof window !== "undefined" &&
          window.localStorage.getItem(adminSessionHintStorageKey) === "1";

        const existingUser = await getCurrentFirebaseUser();
        if (existingUser) {
          markReady();
          if (hasAdminSessionHint) {
            void repairServerSessionFromClientUser(existingUser);
          }
          return;
        }

        if (await signInWithServerSessionToken()) {
          markReady();
          return;
        }

        if (hasAdminSessionHint) {
          const lateUser = await waitForFirebaseUser(1800);
          if (lateUser) {
            markReady();
            void repairServerSessionFromClientUser(lateUser);
            return;
          }
        }

        const repaired = await repairServerSessionFromClientUser();
        if (repaired && (await signInWithServerSessionToken())) {
          markReady();
          return;
        }

        markAdminSessionHint(false);
        throw new Error("Unauthorized. Please sign in again.");
      } catch (error) {
        if (cancelled) return;
        setClientAuthError(
          error instanceof Error
            ? error.message
            : "Unable to verify admin permissions.",
        );
      }
    }

    void ensureAdminClientAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (clientAuthReady) return;
    if (!clientAuthError) return;
    router.replace("/admin/login");
  }, [clientAuthReady, clientAuthError, router]);

  useEffect(() => {
    if (pathname !== "/admin") return;
    if (!firstFavoriteHref || firstFavoriteHref === "/admin") return;
    if (!availableNavigationFavoriteHrefs.has(firstFavoriteHref)) return;
    router.replace(firstFavoriteHref);
  }, [availableNavigationFavoriteHrefs, firstFavoriteHref, pathname, router]);

  if (!clientAuthReady) {
    return (
      <div className="admin-erp relative min-h-screen overflow-x-clip bg-background">
        <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-30" />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card/80 p-8 text-center shadow-elev1 backdrop-blur">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
            <p className="sr-only">
              {clientAuthError ? "Redirecting to login" : "Loading"}
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
                <Button
                  size="icon"
                  variant="outline"
                  className="lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto pb-4">
                <SheetHeader>
                  <SheetTitle className="inline-flex items-center gap-2">
                    <span className="relative inline-flex h-7 w-7 overflow-hidden rounded-md">
                      <Image
                        src="/SA-Logo.svg"
                        alt="SA Panel logo"
                        fill
                        sizes="28px"
                        className="object-contain"
                      />
                    </span>
                    SA Panel
                  </SheetTitle>
                </SheetHeader>
                <div className="px-6">
                  <AdminNavigationList
                    pathname={pathname}
                    onNavigate={() => setMobileOpen(false)}
                    moduleAccess={moduleAccess}
                    favorites={favoriteHrefs}
                    projectNavItems={projectNavItems}
                    onToggleFavorite={toggleFavorite}
                    onReorderFavorites={reorderFavorites}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Link
              href={adminHomeHref}
              className="inline-flex items-center gap-2 font-serif text-xl tracking-wide sm:text-2xl"
            >
              <span className="relative inline-flex h-7 w-7 overflow-hidden rounded-md">
                <Image
                  src="/SA-Logo.svg"
                  alt="SA Panel logo"
                  fill
                  sizes="28px"
                  className="object-contain"
                  priority
                />
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
              {sidebarCompact ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden md:inline-flex">
              <UserRound className="mr-1 h-3.5 w-3.5" />
              {actorEmail || "admin session"}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/" target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open Website
              </Link>
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <NotificationBanner />

      <div
        className={cn(
          "relative z-10 grid w-full gap-6 px-4 py-6 sm:px-6",
          sidebarCompact
            ? "lg:grid-cols-[92px_minmax(0,1fr)]"
            : "lg:grid-cols-[300px_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "hidden self-start rounded-3xl border border-border/70 bg-card/65 shadow-elev2 backdrop-blur lg:sticky lg:top-20 lg:block",
            "max-h-[calc(100vh-6rem)] overflow-y-auto",
            sidebarCompact ? "p-2.5" : "p-4",
          )}
        >
          <AdminNavigationList
            pathname={pathname}
            compact={sidebarCompact}
            moduleAccess={moduleAccess}
            favorites={favoriteHrefs}
            projectNavItems={projectNavItems}
            onToggleFavorite={toggleFavorite}
            onReorderFavorites={reorderFavorites}
          />
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      {pathname !== "/admin/agent" && moduleAccess.salehOsChat ? (
        <AdminAgentChatbot pathname={pathname} />
      ) : null}
    </div>
  );
}
