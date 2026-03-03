import "server-only";

import { getApps } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import type { DecodedIdToken } from "firebase-admin/auth";
import { cookies, headers } from "next/headers";

import { resolveAdminAccess } from "@/lib/admin/access";
import { adminAuth } from "@/lib/firebase/admin";
import type { AdminModuleKey, AdminUserAccessDoc } from "@/types/admin-access";

type VerifyAdminSessionOptions = {
  requiredModule?: AdminModuleKey | AdminModuleKey[];
  activateInvitation?: boolean;
  touchLastLogin?: boolean;
  allowCookie?: boolean;
  allowBearer?: boolean;
  requireAppCheck?: boolean;
};

export type VerifiedAdminSession = DecodedIdToken & {
  adminAccess: AdminUserAccessDoc;
};

function getBearerToken(rawAuthHeader: string | null) {
  if (!rawAuthHeader) return "";
  const value = rawAuthHeader.trim();
  if (!value.toLowerCase().startsWith("bearer ")) return "";
  return value.slice(7).trim();
}

async function verifyAppCheckFromHeaders(): Promise<boolean> {
  const requestHeaders = await headers();
  const appCheckToken = requestHeaders.get("x-firebase-appcheck")?.trim() ?? "";
  if (!appCheckToken) return false;

  const app = getApps()[0];
  if (!app) return false;

  try {
    await getAppCheck(app).verifyToken(appCheckToken);
    return true;
  } catch {
    return false;
  }
}

async function decodeFromCookie(): Promise<DecodedIdToken | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value ?? cookieStore.get("admin_session")?.value;
  if (!sessionCookie) return null;

  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

async function decodeFromBearer(): Promise<DecodedIdToken | null> {
  const requestHeaders = await headers();
  const idToken = getBearerToken(requestHeaders.get("authorization"));
  if (!idToken) return null;

  try {
    return await adminAuth.verifyIdToken(idToken, true);
  } catch {
    return null;
  }
}

export async function verifyAdminRequest(
  options: VerifyAdminSessionOptions = {}
): Promise<VerifiedAdminSession | null> {
  const allowCookie = options.allowCookie ?? true;
  const allowBearer = options.allowBearer ?? true;
  if (!allowCookie && !allowBearer) return null;

  if (options.requireAppCheck) {
    const appCheckOk = await verifyAppCheckFromHeaders();
    if (!appCheckOk) return null;
  }

  const decoded =
    (allowBearer ? await decodeFromBearer() : null) ?? (allowCookie ? await decodeFromCookie() : null);
  if (!decoded) return null;

  try {
    const access = await resolveAdminAccess({
      token: decoded,
      requiredModule: options.requiredModule,
      activateInvitation: options.activateInvitation,
      touchLastLogin: options.touchLastLogin
    });

    if (access.status !== "ok" || !access.access) {
      return null;
    }

    return {
      ...decoded,
      adminAccess: access.access
    };
  } catch {
    return null;
  }
}

export async function verifyAdminSessionFromCookie(
  options: VerifyAdminSessionOptions = {}
): Promise<VerifiedAdminSession | null> {
  return verifyAdminRequest({
    ...options,
    allowCookie: true,
    allowBearer: false
  });
}
