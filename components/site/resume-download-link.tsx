"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/firebase/client";

export function ResumeDownloadLink({ url }: { url?: string }) {
  if (!url) return null;

  return (
    <Link
      href={url}
      target="_blank"
      className="inline-flex rounded-full border border-border bg-card/85 px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
      onClick={() => trackEvent("download_resume", { path: "/" })}
    >
      Download Resume
    </Link>
  );
}
