"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/firebase/client";

export function ResumeDownloadLink({ url }: { url?: string }) {
  if (!url) return null;

  return (
    <Link
      href={url}
      target="_blank"
      className="inline-flex rounded-full border border-border/70 bg-card/75 px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-[hsl(var(--accent-strong))] hover:text-foreground"
      onClick={() => trackEvent("download_resume", { path: "/" })}
    >
      Download Resume
    </Link>
  );
}
