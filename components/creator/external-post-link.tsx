"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/firebase/client";

export function ExternalPostLink({ url, platform }: { url: string; platform: string }) {
  return (
    <Link
      href={url}
      target="_blank"
      className="inline-flex items-center text-sm font-medium text-primary hover:underline"
      onClick={() => trackEvent("click_external_post", { platform })}
    >
      View original post
    </Link>
  );
}
