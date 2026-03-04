"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, Download, Inbox, KanbanSquare, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/job-tracker/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/job-tracker/companies", label: "Companies", icon: Building2 },
  { href: "/admin/job-tracker/jobs", label: "Jobs", icon: KanbanSquare },
  { href: "/admin/job-tracker/intake", label: "AI Intake", icon: Sparkles },
  { href: "/admin/job-tracker/emails", label: "Emails", icon: Inbox },
  { href: "/admin/job-tracker/exports", label: "Exports", icon: Download }
];

export function JobTrackerNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
              active
                ? "border-warning/50 bg-warning/15 text-warning"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-warning/35 hover:text-warning"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
