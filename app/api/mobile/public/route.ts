import { NextResponse } from "next/server";

import {
  getBlogPosts,
  getCertificates,
  getExperiences,
  getProfileContent,
  getProjects,
  getServices,
  getSocialLinks
} from "@/lib/firestore/cms";
import { safeGetCreatorFeed } from "@/lib/firestore/public";
import { getBookingSettings } from "@/lib/firestore/booking";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [profile, experiences, projects, services, certificates, blogPosts, socialLinks, aiNews, bookingSettings] = await Promise.all([
      getProfileContent(),
      getExperiences(),
      getProjects({ publishedOnly: true }),
      getServices(),
      getCertificates(),
      getBlogPosts({ publishedOnly: true }),
      getSocialLinks(),
      safeGetCreatorFeed({ page: 1, pageSize: 20, pillar: "AI" }),
      getBookingSettings().catch(() => null)
    ]);

    return NextResponse.json({
      apiVersion: "2026-03-01",
      profile,
      experiences,
      projects,
      services,
      certificates,
      blogPosts,
      socialLinks,
      aiNews: aiNews.items,
      bookingEnabled: bookingSettings?.enabled ?? false,
      bookingMeetingTypes: bookingSettings?.meetingTypes ?? []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load public mobile data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
