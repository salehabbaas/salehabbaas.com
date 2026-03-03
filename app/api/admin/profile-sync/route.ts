import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const syncSchema = z.object({
  direction: z.enum(["website_to_linkedin", "linkedin_to_website"])
});

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET() {
  const session = await verifyAdminRequest({ requiredModule: "linkedin" });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [websiteSnap, linkedinSnap] = await Promise.all([
    adminDb.collection("siteContent").doc("profile").get(),
    adminDb.collection("linkedinStudioProfiles").doc("default").get()
  ]);

  const website = websiteSnap.data() ?? {};
  const linkedin = linkedinSnap.data() ?? {};

  const websiteProfile = {
    name: asString(website.name),
    headline: asString(website.headline),
    location: asString(website.location),
    bio: asString(website.bio)
  };

  const linkedinProfile = {
    displayName: asString(linkedin.profile?.displayName),
    headline: asString(linkedin.profile?.headline),
    location: asString(linkedin.profile?.location),
    about: asString(linkedin.profile?.about)
  };

  return NextResponse.json({
    websiteProfile,
    linkedinProfile
  });
}

export async function POST(request: Request) {
  const session = await verifyAdminRequest({ requiredModule: "linkedin" });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestContext = getAdminRequestContext(request);

  try {
    const body = syncSchema.parse(await request.json().catch(() => ({})));
    const [websiteRef, linkedinRef] = [adminDb.collection("siteContent").doc("profile"), adminDb.collection("linkedinStudioProfiles").doc("default")];
    const [websiteSnap, linkedinSnap] = await Promise.all([websiteRef.get(), linkedinRef.get()]);

    const website = websiteSnap.data() ?? {};
    const linkedin = linkedinSnap.data() ?? {};
    const now = new Date();

    if (body.direction === "website_to_linkedin") {
      await linkedinRef.set(
        {
          profile: {
            ...(linkedin.profile ?? {}),
            displayName: asString(website.name),
            headline: asString(website.headline),
            location: asString(website.location),
            about: asString(website.bio)
          },
          updatedAt: now
        },
        { merge: true }
      );

      await writeAdminAuditLog(
        {
          module: "profile-sync",
          action: "website_to_linkedin",
          targetType: "linkedinStudioProfile",
          targetId: "default",
          summary: "Synced website profile fields into LinkedIn Studio profile"
        },
        session,
        requestContext
      );
    } else {
      await websiteRef.set(
        {
          name: asString(linkedin.profile?.displayName),
          headline: asString(linkedin.profile?.headline),
          location: asString(linkedin.profile?.location),
          bio: asString(linkedin.profile?.about),
          updatedAt: now
        },
        { merge: true }
      );

      await writeAdminAuditLog(
        {
          module: "profile-sync",
          action: "linkedin_to_website",
          targetType: "siteContentProfile",
          targetId: "profile",
          summary: "Synced LinkedIn Studio profile fields into website profile"
        },
        session,
        requestContext
      );
    }

    return NextResponse.json({ success: true, direction: body.direction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
