import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import {
  getBlogPosts,
  getCertificates,
  getExperiences,
  getProfileContent,
  getProjects,
  getServices,
  getSocialLinks
} from "@/lib/firestore/cms";

export const runtime = "nodejs";

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "cms" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, experiences, projects, services, certificates, blogPosts, socialLinks] = await Promise.all([
    getProfileContent(),
    getExperiences(),
    getProjects(),
    getServices(),
    getCertificates(),
    getBlogPosts(),
    getSocialLinks()
  ]);

  return NextResponse.json({
    apiVersion: "2026-03-01",
    profile,
    experiences,
    projects,
    services,
    certificates,
    blogPosts,
    socialLinks
  });
}
