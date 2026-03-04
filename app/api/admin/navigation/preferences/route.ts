import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";

const patchSchema = z
  .object({
    favorites: z.array(z.string().trim().min(1).max(240)).max(300).optional(),
    projectSubmenuVisible: z.boolean().optional(),
    favoriteProjectsExpanded: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No updates provided");

type AdminNavigationPreferences = {
  favorites: string[];
  projectSubmenuVisible: boolean;
  favoriteProjectsExpanded: boolean;
};

function uniqueFavorites(values: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  values.forEach((value) => {
    const href = value.trim();
    if (!href || seen.has(href)) return;
    seen.add(href);
    next.push(href);
  });
  return next;
}

function readPreferencesFromData(
  data: Record<string, unknown>,
): AdminNavigationPreferences {
  const uiPreferences =
    typeof data.uiPreferences === "object" && data.uiPreferences !== null
      ? (data.uiPreferences as Record<string, unknown>)
      : {};
  const adminNavigation =
    typeof uiPreferences.adminNavigation === "object" &&
    uiPreferences.adminNavigation !== null
      ? (uiPreferences.adminNavigation as Record<string, unknown>)
      : {};

  // Backward compatibility for older dotted-field writes.
  const legacyFavorites = Array.isArray(
    data["uiPreferences.adminNavigation.favorites"],
  )
    ? (data["uiPreferences.adminNavigation.favorites"] as unknown[])
    : [];
  const favoritesSource = Array.isArray(adminNavigation.favorites)
    ? adminNavigation.favorites
    : legacyFavorites;
  const favorites = uniqueFavorites(
    favoritesSource.filter((item): item is string => typeof item === "string"),
  );

  const legacyProjectSubmenuVisible =
    data["uiPreferences.adminNavigation.projectSubmenuVisible"];
  const legacyFavoriteProjectsExpanded =
    data["uiPreferences.adminNavigation.favoriteProjectsExpanded"];

  return {
    favorites,
    projectSubmenuVisible:
      typeof adminNavigation.projectSubmenuVisible === "boolean"
        ? adminNavigation.projectSubmenuVisible
        : typeof legacyProjectSubmenuVisible === "boolean"
          ? legacyProjectSubmenuVisible
          : true,
    favoriteProjectsExpanded:
      typeof adminNavigation.favoriteProjectsExpanded === "boolean"
        ? adminNavigation.favoriteProjectsExpanded
        : typeof legacyFavoriteProjectsExpanded === "boolean"
          ? legacyFavoriteProjectsExpanded
          : false,
  };
}

export async function GET() {
  const actor = await verifyAdminSessionFromCookie();
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb.collection("adminUsers").doc(actor.uid).get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const preferences = readPreferencesFromData(data);
  return NextResponse.json(preferences);
}

export async function PATCH(request: Request) {
  const actor = await verifyAdminSessionFromCookie();
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = patchSchema.parse(await request.json());
    const now = new Date();
    const existingSnap = await adminDb
      .collection("adminUsers")
      .doc(actor.uid)
      .get();
    const existingData = (existingSnap.data() ?? {}) as Record<string, unknown>;
    const existingUiPreferences =
      typeof existingData.uiPreferences === "object" &&
      existingData.uiPreferences !== null
        ? (existingData.uiPreferences as Record<string, unknown>)
        : {};
    const existingAdminNavigation =
      typeof existingUiPreferences.adminNavigation === "object" &&
      existingUiPreferences.adminNavigation !== null
        ? (existingUiPreferences.adminNavigation as Record<string, unknown>)
        : {};

    const nextAdminNavigation: Record<string, unknown> = {
      ...existingAdminNavigation,
      updatedAt: now,
    };
    if (body.favorites) {
      nextAdminNavigation.favorites = uniqueFavorites(body.favorites);
    }
    if (typeof body.projectSubmenuVisible === "boolean") {
      nextAdminNavigation.projectSubmenuVisible = body.projectSubmenuVisible;
    }
    if (typeof body.favoriteProjectsExpanded === "boolean") {
      nextAdminNavigation.favoriteProjectsExpanded =
        body.favoriteProjectsExpanded;
    }

    await adminDb
      .collection("adminUsers")
      .doc(actor.uid)
      .set(
        {
          updatedAt: now,
          uiPreferences: {
            ...existingUiPreferences,
            adminNavigation: nextAdminNavigation,
          },
        },
        { merge: true },
      );

    const updatedSnap = await adminDb
      .collection("adminUsers")
      .doc(actor.uid)
      .get();
    const updatedData = (updatedSnap.data() ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      preferences: readPreferencesFromData(updatedData),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update navigation preferences";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
