import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { getRemoteFeatureFlags, setRemoteFeatureFlags } from "@/lib/firebase/remote-config";
import { adminDb } from "@/lib/firebase/admin";

const schema = z.object({
  bookingEnabled: z.boolean().optional(),
  pipelineStoryEnabled: z.boolean().optional(),
  featuredCarouselEnabled: z.boolean().optional(),
  experienceStoryEnabled: z.boolean().optional()
});

export async function GET() {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const remote = await getRemoteFeatureFlags();
  const [bookingSnap, flagsSnap] = await Promise.all([
    adminDb.collection("bookingSettings").doc("default").get(),
    adminDb.collection("siteFeatureFlags").doc("default").get()
  ]);

  const bookingFirestore = bookingSnap.data()?.enabled;
  const flagsFirestore = flagsSnap.data() ?? {};

  const bookingEnabled = typeof remote.bookingEnabled === "boolean" ? remote.bookingEnabled : Boolean(bookingFirestore ?? true);
  const pipelineStoryEnabled =
    typeof remote.pipelineStoryEnabled === "boolean" ? remote.pipelineStoryEnabled : Boolean(flagsFirestore.pipelineStoryEnabled ?? true);
  const featuredCarouselEnabled =
    typeof remote.featuredCarouselEnabled === "boolean" ? remote.featuredCarouselEnabled : Boolean(flagsFirestore.featuredCarouselEnabled ?? true);
  const experienceStoryEnabled =
    typeof remote.experienceStoryEnabled === "boolean" ? remote.experienceStoryEnabled : Boolean(flagsFirestore.experienceStoryEnabled ?? true);

  return NextResponse.json({
    bookingEnabled,
    pipelineStoryEnabled,
    featuredCarouselEnabled,
    experienceStoryEnabled,
    sources: {
      bookingEnabled: typeof remote.bookingEnabled === "boolean" ? "remote-config" : "firestore",
      pipelineStoryEnabled: typeof remote.pipelineStoryEnabled === "boolean" ? "remote-config" : "firestore",
      featuredCarouselEnabled: typeof remote.featuredCarouselEnabled === "boolean" ? "remote-config" : "firestore",
      experienceStoryEnabled: typeof remote.experienceStoryEnabled === "boolean" ? "remote-config" : "firestore"
    }
  });
}

export async function POST(request: Request) {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const input = schema.parse(body);

    if (!Object.values(input).some((value) => typeof value === "boolean")) {
      return NextResponse.json({ error: "No feature flags provided" }, { status: 400 });
    }

    const remoteInput: Partial<Record<"booking_enabled" | "pipeline_story_enabled" | "featured_carousel_enabled" | "experience_story_enabled", boolean>> =
      {};

    if (typeof input.bookingEnabled === "boolean") remoteInput.booking_enabled = input.bookingEnabled;
    if (typeof input.pipelineStoryEnabled === "boolean") remoteInput.pipeline_story_enabled = input.pipelineStoryEnabled;
    if (typeof input.featuredCarouselEnabled === "boolean") remoteInput.featured_carousel_enabled = input.featuredCarouselEnabled;
    if (typeof input.experienceStoryEnabled === "boolean") remoteInput.experience_story_enabled = input.experienceStoryEnabled;

    await Promise.all([
      setRemoteFeatureFlags(remoteInput),
      typeof input.bookingEnabled === "boolean"
        ? adminDb.collection("bookingSettings").doc("default").set({ enabled: input.bookingEnabled, updatedAt: new Date() }, { merge: true })
        : Promise.resolve(),
      adminDb
        .collection("siteFeatureFlags")
        .doc("default")
        .set(
          {
            ...(typeof input.pipelineStoryEnabled === "boolean" ? { pipelineStoryEnabled: input.pipelineStoryEnabled } : {}),
            ...(typeof input.featuredCarouselEnabled === "boolean" ? { featuredCarouselEnabled: input.featuredCarouselEnabled } : {}),
            ...(typeof input.experienceStoryEnabled === "boolean" ? { experienceStoryEnabled: input.experienceStoryEnabled } : {}),
            updatedAt: new Date()
          },
          { merge: true }
        )
    ]);

    return NextResponse.json({ success: true, ...input });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update feature flag";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
