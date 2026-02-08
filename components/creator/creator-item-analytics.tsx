"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/firebase/client";

export function CreatorItemAnalytics({ slug, platform }: { slug: string; platform: string }) {
  useEffect(() => {
    trackEvent("view_creator_item", { slug, platform });
  }, [slug, platform]);

  return null;
}
