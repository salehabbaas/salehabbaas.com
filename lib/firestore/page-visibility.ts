import "server-only";

import type { PageVisibilitySettings, PublicPagePath } from "@/types/site-settings";
import { getDefaultPageVisibility, getPageVisibilitySettings } from "@/lib/firestore/admin-settings";

export async function safePageVisibility(): Promise<PageVisibilitySettings> {
  try {
    return await getPageVisibilitySettings();
  } catch {
    return getDefaultPageVisibility();
  }
}

export async function isPublicPageVisible(path: PublicPagePath) {
  const visibility = await safePageVisibility();
  return visibility[path] !== false;
}
