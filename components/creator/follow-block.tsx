"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/firebase/client";
import { CreatorSettings } from "@/types/creator";

export function FollowBlock({ socialLinks }: Pick<CreatorSettings, "socialLinks">) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/75 p-6 shadow-elev2 backdrop-blur">
      <h3 className="font-serif text-2xl text-foreground">Follow me</h3>
      <p className="mt-2 text-sm text-foreground/75">Stay in the loop across platforms for new builds and content drops.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {socialLinks.map((link) => (
          <Link
            key={link.label}
            href={link.url}
            target="_blank"
            className="rounded-full border border-border/70 bg-card/75 px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-[hsl(var(--accent-strong))] hover:text-foreground"
            onClick={() => trackEvent("social_click", { platform: link.label.toLowerCase() })}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
