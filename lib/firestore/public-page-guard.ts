import "server-only";

import { notFound } from "next/navigation";

import { isPublicPageVisible } from "@/lib/firestore/page-visibility";
import type { PublicPagePath } from "@/types/site-settings";

export async function ensurePublicPageVisible(path: PublicPagePath) {
  const visible = await isPublicPageVisible(path);
  if (!visible) {
    notFound();
  }
}
