import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getResumeDocuments, getResumeTemplates, getResumeVersions } from "@/lib/firestore/resume-studio";

export const runtime = "nodejs";

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "resume" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [documents, templates] = await Promise.all([getResumeDocuments(user.uid), getResumeTemplates(user.uid)]);
  const recentDoc = documents[0];
  const versions = recentDoc ? await getResumeVersions(user.uid, recentDoc.id) : [];

  return NextResponse.json({
    apiVersion: "2026-03-01",
    documents,
    templates,
    versions
  });
}
