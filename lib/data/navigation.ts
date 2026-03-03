import type { PublicPagePath } from "@/types/site-settings";

export type PublicNavigationItem = {
  href: PublicPagePath;
  label: string;
  shortLabel: string;
  description: string;
  section: "primary" | "secondary" | "support";
};

export const publicNavigation: PublicNavigationItem[] = [
  { href: "/", label: "Home", shortLabel: "Home", description: "Homepage overview", section: "primary" },
  { href: "/ai-news", label: "AI News", shortLabel: "AI News", description: "Short AI updates", section: "primary" },
  { href: "/projects", label: "Projects", shortLabel: "Projects", description: "Case studies and builds", section: "primary" },
  { href: "/services", label: "Services", shortLabel: "Services", description: "Engineering services", section: "primary" },
  { href: "/experience", label: "Experience", shortLabel: "Experience", description: "Career timeline", section: "primary" },
  { href: "/blog", label: "Blog", shortLabel: "Blog", description: "Technical writing", section: "primary" },
  { href: "/creator", label: "Creator", shortLabel: "Creator", description: "Creator content feed", section: "primary" },
  { href: "/about", label: "About", shortLabel: "About", description: "Background and profile", section: "secondary" },
  {
    href: "/certificates",
    label: "Certificates",
    shortLabel: "Certificates",
    description: "Professional certifications",
    section: "secondary"
  },
  { href: "/public-statement", label: "Public Statement", shortLabel: "Statement", description: "Identity statement", section: "secondary" },
  { href: "/book-meeting", label: "Book Meeting", shortLabel: "Book", description: "Schedule a meeting", section: "support" },
  { href: "/contact", label: "Contact", shortLabel: "Contact", description: "Get in touch", section: "support" }
];

export type AdminNavSectionId = "overview" | "content" | "operations" | "ai" | "settings";

export type AdminNavIcon =
  | "overview"
  | "dashboard-stats"
  | "dashboard-systems"
  | "cms"
  | "cms-profile"
  | "cms-projects"
  | "cms-blog"
  | "cms-experience"
  | "cms-services"
  | "cms-certificates"
  | "cms-social"
  | "cms-media"
  | "creator"
  | "linkedin"
  | "project-management"
  | "resume-studio"
  | "resume-templates"
  | "job-tracker"
  | "bookings"
  | "settings"
  | "settings-reminders"
  | "settings-access"
  | "settings-integrations"
  | "settings-visibility"
  | "settings-health";

export type AdminNavigationItem = {
  href: string;
  label: string;
  icon: AdminNavIcon;
  section: AdminNavSectionId;
};

export type AdminNavigationSection = {
  id: AdminNavSectionId;
  label: string;
};

export const adminNavigationSections: AdminNavigationSection[] = [
  {
    id: "overview",
    label: "Dashboards"
  },
  {
    id: "content",
    label: "Content"
  },
  {
    id: "operations",
    label: "Operations"
  },
  {
    id: "ai",
    label: "AI"
  },
  {
    id: "settings",
    label: "Settings"
  }
];

export const adminNavigation: AdminNavigationItem[] = [
  {
    href: "/admin",
    label: "Stats",
    icon: "dashboard-stats",
    section: "overview"
  },
  {
    href: "/admin/systems-dashboard",
    label: "Systems",
    icon: "dashboard-systems",
    section: "overview"
  },
  {
    href: "/admin/system-inbox",
    label: "Inbox",
    icon: "overview",
    section: "overview"
  },
  {
    href: "/admin/logs",
    label: "Logs",
    icon: "overview",
    section: "overview"
  },
  {
    href: "/admin/cms/profile",
    label: "Profile",
    icon: "cms-profile",
    section: "content"
  },
  {
    href: "/admin/cms/projects",
    label: "Projects",
    icon: "cms-projects",
    section: "content"
  },
  {
    href: "/admin/cms/blog",
    label: "Blog",
    icon: "cms-blog",
    section: "content"
  },
  {
    href: "/admin/cms/experience",
    label: "Experience",
    icon: "cms-experience",
    section: "content"
  },
  {
    href: "/admin/cms/services",
    label: "Services",
    icon: "cms-services",
    section: "content"
  },
  {
    href: "/admin/cms/certificates",
    label: "Certificates",
    icon: "cms-certificates",
    section: "content"
  },
  {
    href: "/admin/cms/social",
    label: "Social",
    icon: "cms-social",
    section: "content"
  },
  {
    href: "/admin/cms/media",
    label: "Media",
    icon: "cms-media",
    section: "content"
  },
  {
    href: "/admin/creator",
    label: "Creator",
    icon: "creator",
    section: "content"
  },
  {
    href: "/admin/linkedin-studio",
    label: "LinkedIn",
    icon: "linkedin",
    section: "ai"
  },
  {
    href: "/admin/projects",
    label: "Projects",
    icon: "project-management",
    section: "operations"
  },
  {
    href: "/admin/resume-studio",
    label: "Resume Studio",
    icon: "resume-studio",
    section: "operations"
  },
  {
    href: "/admin/resume-studio/templates",
    label: "Templates",
    icon: "resume-templates",
    section: "operations"
  },
  {
    href: "/admin/job-tracker",
    label: "Jobs",
    icon: "job-tracker",
    section: "operations"
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    icon: "bookings",
    section: "operations"
  },
  {
    href: "/admin/agent",
    label: "Agent",
    icon: "overview",
    section: "ai"
  },
  {
    href: "/admin/settings/reminders",
    label: "Reminders",
    icon: "settings-reminders",
    section: "settings"
  },
  {
    href: "/admin/settings/access",
    label: "Access",
    icon: "settings-access",
    section: "settings"
  },
  {
    href: "/admin/settings/integrations",
    label: "Integrations",
    icon: "settings-integrations",
    section: "settings"
  },
  {
    href: "/admin/settings/visibility",
    label: "Visibility",
    icon: "settings-visibility",
    section: "settings"
  },
  {
    href: "/admin/settings/health",
    label: "Health",
    icon: "settings-health",
    section: "settings"
  }
];
