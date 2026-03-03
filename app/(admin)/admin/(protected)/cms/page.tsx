import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, FileText, FolderKanban, ImageIcon, Link2, UserRound } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "CMS Hub"
};

const cmsSections = [
  {
    href: "/admin/cms/profile",
    title: "Profile",
    description: "Edit personal profile, avatar, and bio content for public pages.",
    icon: UserRound
  },
  {
    href: "/admin/cms/projects",
    title: "Projects",
    description: "Manage project cards, details, status, and ordering.",
    icon: FolderKanban
  },
  {
    href: "/admin/cms/blog",
    title: "Blog",
    description: "Create and update blog posts with SEO fields.",
    icon: FileText
  },
  {
    href: "/admin/cms/experience",
    title: "Experience",
    description: "Edit experience timeline shown on the public Experience page.",
    icon: BriefcaseBusiness
  },
  {
    href: "/admin/cms/services",
    title: "Services",
    description: "Edit service cards shown on the public Services page.",
    icon: BriefcaseBusiness
  },
  {
    href: "/admin/cms/certificates",
    title: "Certificates",
    description: "Manage certificates and credential links.",
    icon: FileText
  },
  {
    href: "/admin/cms/social",
    title: "Social",
    description: "Manage social links used across the website.",
    icon: Link2
  },
  {
    href: "/admin/cms/media",
    title: "Media Library",
    description: "Upload and reuse media assets across CMS sections.",
    icon: ImageIcon
  }
] as const;

export default function AdminCmsPage() {
  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CMS Hub</CardTitle>
          <CardDescription>Choose a section to edit and publish website content.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cmsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-xl border border-border/70 bg-card/70 p-4 transition hover:border-primary/40 hover:bg-card"
            >
              <p className="inline-flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4" />
                {section.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
