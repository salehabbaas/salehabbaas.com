"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigation } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";
import { AdminLogoutButton } from "@/components/auth/admin-logout-button";
import { ThemeToggle } from "@/components/site/theme-toggle";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/admin" className="font-serif text-2xl">
            Admin Panel
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AdminLogoutButton />
          </div>
        </div>
      </header>
      <div className="container grid gap-6 py-6 md:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-border/70 bg-card/80 p-2">
          {adminNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm",
                pathname === item.href ? "bg-primary/10 text-primary" : "text-foreground/75 hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
