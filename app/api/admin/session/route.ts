import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";

const SESSION_NAMES = ["__session", "admin_session"] as const;
const SESSION_AGE_MS = 1000 * 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  try {
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

    const response = NextResponse.json({ success: true });
    response.headers.set("Cache-Control", "private");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  for (const name of SESSION_NAMES) {
    cookieStore.delete(name);
  }
  const response = NextResponse.json({ success: true });
  response.headers.set("Cache-Control", "private");
  return response;
}
