import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resolveAdminAccess } from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { firstAllowedAdminPath } from "@/lib/auth/admin-navigation";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

const SESSION_NAMES = ["__session", "admin_session"] as const;
const SESSION_AGE_MS = 1000 * 60 * 60 * 24 * 5;

function accessError(status: Awaited<ReturnType<typeof resolveAdminAccess>>["status"]) {
  if (status === "not_registered") return { code: 403 as const, message: "Admin access profile not found" };
  if (status === "revoked") return { code: 403 as const, message: "Admin access revoked" };
  if (status === "invited_not_accepted") return { code: 403 as const, message: "Invitation not accepted" };
  if (status === "invitation_expired") return { code: 403 as const, message: "Invitation expired" };
  if (status === "missing_module") return { code: 403 as const, message: "Missing module access" };
  return { code: 400 as const, message: "Invalid admin access state" };
}

export async function POST(request: Request) {
  try {
    const requestContext = getAdminRequestContext(request);
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);

    const accessResolution = await resolveAdminAccess({
      token: decoded,
      activateInvitation: true,
      touchLastLogin: true
    });
    if (accessResolution.status !== "ok" || !accessResolution.access) {
      const mapped = accessError(accessResolution.status);
      return NextResponse.json({ error: mapped.message }, { status: mapped.code });
    }

    const authUser = await adminAuth.getUser(decoded.uid).catch(() => null);
    if (!authUser) {
      return NextResponse.json({ error: "Unable to resolve Firebase Auth user." }, { status: 400 });
    }
    if (authUser.customClaims?.admin !== true) {
      await adminAuth.setCustomUserClaims(decoded.uid, {
        ...(authUser.customClaims ?? {}),
        admin: true
      });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_AGE_MS });
    const cookieStore = await cookies();

    for (const name of SESSION_NAMES) {
      cookieStore.set(name, sessionCookie, {
        maxAge: SESSION_AGE_MS / 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax"
      });
    }

    await Promise.all([
      adminDb.collection("adminAccessLogs").add({
        eventType: "login",
        actorUid: decoded.uid,
        actorEmail: accessResolution.access.email || decoded.email || "",
        ipHash: requestContext.ipHash,
        ipMasked: requestContext.ipMasked,
        userAgent: requestContext.userAgent,
        deviceType: requestContext.deviceType,
        browser: requestContext.browser,
        country: requestContext.country,
        city: requestContext.city,
        path: requestContext.path,
        createdAt: new Date(),
        sessionExpiresAt: new Date(Date.now() + SESSION_AGE_MS)
      }),
      writeAdminAuditLog(
        {
          module: "auth",
          action: "login",
          targetType: "adminSession",
          targetId: decoded.uid,
          summary: `Admin login by ${accessResolution.access.email || decoded.email || decoded.uid}`,
          metadata: {
            sessionAgeDays: SESSION_AGE_MS / (1000 * 60 * 60 * 24),
            role: accessResolution.access.role,
            status: accessResolution.access.status
          }
        },
        decoded,
        requestContext
      )
    ]);

    const response = NextResponse.json({
      success: true,
      nextPath: firstAllowedAdminPath(accessResolution.access)
    });
    response.headers.set("Cache-Control", "private");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value ?? cookieStore.get("admin_session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    const accessResolution = await resolveAdminAccess({
      token: decoded,
      activateInvitation: false,
      touchLastLogin: false
    });
    if (accessResolution.status !== "ok" || !accessResolution.access) {
      const mapped = accessError(accessResolution.status);
      return NextResponse.json({ error: mapped.message }, { status: mapped.code });
    }

    const customToken = await adminAuth.createCustomToken(decoded.uid, { admin: true });
    const response = NextResponse.json({ customToken });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  const requestContext = getAdminRequestContext(request);
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value ?? cookieStore.get("admin_session")?.value;
  let actor: Awaited<ReturnType<typeof adminAuth.verifySessionCookie>> | null = null;

  if (sessionCookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      actor = decoded;
    } catch {
      actor = null;
    }
  }

  for (const name of SESSION_NAMES) {
    cookieStore.delete(name);
  }

  if (actor) {
    await Promise.all([
      adminDb.collection("adminAccessLogs").add({
        eventType: "logout",
        actorUid: actor.uid,
        actorEmail: actor.email ?? "",
        ipHash: requestContext.ipHash,
        ipMasked: requestContext.ipMasked,
        userAgent: requestContext.userAgent,
        deviceType: requestContext.deviceType,
        browser: requestContext.browser,
        country: requestContext.country,
        city: requestContext.city,
        path: requestContext.path,
        createdAt: new Date()
      }),
      writeAdminAuditLog(
        {
          module: "auth",
          action: "logout",
          targetType: "adminSession",
          targetId: actor.uid,
          summary: `Admin logout by ${actor.email ?? actor.uid}`
        },
        actor,
        requestContext
      )
    ]);
  }

  const response = NextResponse.json({ success: true });
  response.headers.set("Cache-Control", "private");
  return response;
}
