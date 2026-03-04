import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  const sessionCookie = request.cookies.get("__session")?.value ?? request.cookies.get("admin_session")?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  let uid = "";
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const companyRef = adminDb.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();

  if (!companySnap.exists) {
    return NextResponse.redirect(new URL("/admin/job-tracker/companies", request.url));
  }

  const companyData = companySnap.data() ?? {};
  if (String(companyData.userId ?? "") !== uid) {
    return NextResponse.redirect(new URL("/admin/job-tracker/companies", request.url));
  }

  const source = request.nextUrl.searchParams.get("source") === "open_button" ? "open_button" : "redirect";
  const careerPageUrl = String(companyData.careerPageUrl ?? "").trim();
  const redirectTarget = isValidUrl(careerPageUrl) ? careerPageUrl : "/admin/job-tracker/companies";

  await Promise.all([
    adminDb.collection("companyVisits").add({
      userId: uid,
      companyId,
      visitedAt: new Date(),
      source
    }),
    companyRef.set(
      {
        lastCheckedAt: new Date(),
        updatedAt: new Date()
      },
      { merge: true }
    )
  ]);

  return NextResponse.redirect(new URL(redirectTarget, request.url));
}
