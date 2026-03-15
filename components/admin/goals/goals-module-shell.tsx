"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/goals", label: "Board" },
  { href: "/admin/goals/today", label: "Today" },
  { href: "/admin/goals/week", label: "Week" },
  { href: "/admin/goals/learning", label: "Learning" },
  { href: "/admin/goals/learning/week", label: "Learning Week" },
  { href: "/admin/goals/learning/streaks", label: "Learning Streaks" },
  { href: "/admin/goals/achievements", label: "Achievements" },
  { href: "/admin/goals/settings", label: "Settings" },
];

export function GoalsModuleShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <Card className="border-border/70 bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-amber-500/10">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                <Target className="h-3.5 w-3.5" />
                Goals
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                    active
                      ? "border-primary/55 bg-primary/15 text-primary"
                      : "border-border/70 bg-card/70 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
