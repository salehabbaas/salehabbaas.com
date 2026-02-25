import "server-only";

import type { PageVisibilitySettings, PublicPagePath, PublicPageSettings } from "@/types/site-settings";
import {
  getDefaultPageVisibility,
  getDefaultPublicPageSettings,
  getPageVisibilitySettings,
  getPublicPageSettings
} from "@/lib/firestore/admin-settings";

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

export async function safePublicPageSettings(): Promise<PublicPageSettings> {
  try {
    return await getPublicPageSettings();
  } catch {
    return getDefaultPublicPageSettings();
  }
}
