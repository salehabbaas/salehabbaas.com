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

export type AdminNavSectionId = "overview" | "content" | "operations" | "settings";

export type AdminNavIcon =
  | "overview"
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
  | "job-tracker"
  | "bookings"
  | "settings"
  | "settings-integrations"
  | "settings-visibility"
  | "settings-health";

export type AdminNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: AdminNavIcon;
  section: AdminNavSectionId;
};

export type AdminNavigationSection = {
  id: AdminNavSectionId;
  label: string;
  hint: string;
};

export const adminNavigationSections: AdminNavigationSection[] = [
  {
    id: "overview",
    label: "Overview",
    hint: "System inbox and global health"
  },
  {
    id: "content",
    label: "Content",
    hint: "CMS, creator workflow, and publishing"
  },
  {
    id: "operations",
    label: "Operations",
    hint: "Pipeline workflows and transactional systems"
  },
  {
    id: "settings",
    label: "Settings",
    hint: "Integrations, visibility, and feature health"
  }
];

export const adminNavigation: AdminNavigationItem[] = [
  {
    href: "/admin",
    label: "System Inbox",
    description: "Global status and unresolved issues",
    icon: "overview",
    section: "overview"
  },
  {
    href: "/admin/cms/profile",
    label: "CMS Profile",
    description: "Identity details and profile assets",
    icon: "cms-profile",
    section: "content"
  },
  {
    href: "/admin/cms/projects",
    label: "CMS Projects",
    description: "Projects list, publish/hide, and media",
    icon: "cms-projects",
    section: "content"
  },
  {
    href: "/admin/cms/blog",
    label: "CMS Blog",
    description: "Blog posts, SEO fields, and publish/hide",
    icon: "cms-blog",
    section: "content"
  },
  {
    href: "/admin/cms/experience",
    label: "CMS Experience",
    description: "Career timeline entries",
    icon: "cms-experience",
    section: "content"
  },
  {
    href: "/admin/cms/services",
    label: "CMS Services",
    description: "Service offerings and ordering",
    icon: "cms-services",
    section: "content"
  },
  {
    href: "/admin/cms/certificates",
    label: "CMS Certificates",
    description: "Certificate records and images",
    icon: "cms-certificates",
    section: "content"
  },
  {
    href: "/admin/cms/social",
    label: "CMS Social",
    description: "Social links and ordering",
    icon: "cms-social",
    section: "content"
  },
  {
    href: "/admin/cms/media",
    label: "CMS Media",
    description: "Upload and reuse media assets",
    icon: "cms-media",
    section: "content"
  },
  {
    href: "/admin/creator",
    label: "Creator OS",
    description: "Multi-platform content lifecycle and performance",
    icon: "creator",
    section: "content"
  },
  {
    href: "/admin/linkedin-studio",
    label: "LinkedIn Studio",
    description: "AI post generation, versioning, and publishing",
    icon: "linkedin",
    section: "content"
  },
  {
    href: "/admin/job-tracker",
    label: "Job Tracker",
    description: "Applications, interviews, offers, and reporting",
    icon: "job-tracker",
    section: "operations"
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    description: "Availability, meeting types, slots, and confirmations",
    icon: "bookings",
    section: "operations"
  },
  {
    href: "/admin/settings/integrations",
    label: "Integrations",
    description: "Provider config and secret keys",
    icon: "settings-integrations",
    section: "settings"
  },
  {
    href: "/admin/settings/visibility",
    label: "Visibility",
    description: "Publish/hide pages and content",
    icon: "settings-visibility",
    section: "settings"
  },
  {
    href: "/admin/settings/health",
    label: "Health",
    description: "Feature readiness and missing dependencies",
    icon: "settings-health",
    section: "settings"
  }
];
