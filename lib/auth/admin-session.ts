import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolveAdminAccess } from "@/lib/admin/access";
import { adminAuth } from "@/lib/firebase/admin";
import { firstAllowedAdminPath } from "@/lib/auth/admin-navigation";
import type { AdminModuleKey } from "@/types/admin-access";

export async function requireAdminSession(requiredModule?: AdminModuleKey | AdminModuleKey[]) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value ?? cookieStore.get("admin_session")?.value;

  if (!sessionCookie) {
    redirect("/admin/login");
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    const access = await resolveAdminAccess({
      token: decodedToken,
      requiredModule,
      activateInvitation: false,
      touchLastLogin: false
    });

    if (access.status === "ok" && access.access) {
      return {
        ...decodedToken,
        adminAccess: access.access
      };
    }

    if (access.status === "missing_module" && access.access) {
      redirect(firstAllowedAdminPath(access.access));
    }

    redirect("/admin/login");
  } catch {
    redirect("/admin/login");
  }
}
