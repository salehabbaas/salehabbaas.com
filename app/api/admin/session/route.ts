import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

const SESSION_NAMES = ["__session", "admin_session"] as const;
const SESSION_AGE_MS = 1000 * 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  try {
    const requestContext = getAdminRequestContext(request);
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.admin !== true) {
      return NextResponse.json({ error: "Admin claim required" }, { status: 403 });
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
        actorEmail: decoded.email ?? "",
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
          summary: `Admin login by ${decoded.email ?? decoded.uid}`,
          metadata: {
            sessionAgeDays: SESSION_AGE_MS / (1000 * 60 * 60 * 24)
          }
        },
        decoded,
        requestContext
      )
    ]);

    const response = NextResponse.json({ success: true });
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
    if (decoded.admin !== true) {
      return NextResponse.json({ error: "Admin claim required" }, { status: 403 });
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
      if (decoded.admin === true) {
        actor = decoded;
      }
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
