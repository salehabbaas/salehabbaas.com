import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminAuth } from "@/lib/firebase/admin";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value ?? cookieStore.get("admin_session")?.value;

  if (!sessionCookie) {
    redirect("/admin/login");
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (decodedToken.admin !== true) {
      redirect("/admin/login");
    }
    return decodedToken;
  } catch {
    redirect("/admin/login");
  }
}
