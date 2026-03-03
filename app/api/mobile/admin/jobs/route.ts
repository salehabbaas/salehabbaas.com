import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getJobResumeLinks, getJobTrackerJobs, getTrackedCompanies } from "@/lib/firestore/resume-studio";

export const runtime = "nodejs";

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "jobs" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [jobs, companies, links] = await Promise.all([
    getJobTrackerJobs(user.uid),
    getTrackedCompanies(user.uid),
    getJobResumeLinks(user.uid)
  ]);

  return NextResponse.json({
    apiVersion: "2026-03-01",
    jobs,
    companies,
    links
  });
}
