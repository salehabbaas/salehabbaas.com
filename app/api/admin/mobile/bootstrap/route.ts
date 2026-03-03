import { NextResponse } from "next/server";

import { firstAllowedAdminPath } from "@/lib/auth/admin-navigation";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminAuth } from "@/lib/firebase/admin";

const API_VERSION = "2026-03-01";

export async function POST() {
  const session = await verifyAdminRequest({
    requiredModule: [
      "dashboard",
      "cms",
      "creator",
      "linkedin",
      "projects",
      "resume",
      "jobs",
      "bookings",
      "settings",
      "agent",
      "salehOsChat"
    ],
    allowCookie: false,
    allowBearer: true,
    activateInvitation: true,
    touchLastLogin: true
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized", apiVersion: API_VERSION }, { status: 401 });
  }

  const authUser = await adminAuth.getUser(session.uid).catch(() => null);
  if (!authUser) {
    return NextResponse.json({ error: "Unable to resolve auth user.", apiVersion: API_VERSION }, { status: 400 });
  }

  if (authUser.customClaims?.admin !== true) {
    await adminAuth.setCustomUserClaims(session.uid, {
      ...(authUser.customClaims ?? {}),
      admin: true
    });
  }

  // Issued for client-side bootstrap workflows that rely on custom claims refresh.
  const customToken = await adminAuth.createCustomToken(session.uid, { admin: true });

  return NextResponse.json({
    apiVersion: API_VERSION,
    customToken,
    uid: session.uid,
    email: session.email ?? "",
    access: session.adminAccess,
    nextPath: firstAllowedAdminPath(session.adminAccess)
  });
}
