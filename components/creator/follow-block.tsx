"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/firebase/client";
import { CreatorSettings } from "@/types/creator";

export function FollowBlock({ socialLinks }: Pick<CreatorSettings, "socialLinks">) {
  return (
    <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-card to-cyan-100/50 p-6 dark:to-cyan-900/20">
      <h3 className="font-serif text-2xl">Follow me</h3>
      <p className="mt-2 text-sm text-muted-foreground">Stay in the loop across platforms for new builds and content drops.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {socialLinks.map((link) => (
          <Link
            key={link.label}
            href={link.url}
            target="_blank"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
            onClick={() => trackEvent("social_click", { platform: link.label.toLowerCase() })}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
