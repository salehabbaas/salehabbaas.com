import "server-only";

import { cookies } from "next/headers";

import { adminAuth } from "@/lib/firebase/admin";

export async function verifyAdminSessionFromCookie() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value ?? cookieStore.get("admin_session")?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.admin === true ? decoded : null;
  } catch {
    return null;
  }
}
