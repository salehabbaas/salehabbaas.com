import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { toIso } from "@/lib/admin/audit";
import {
  adminModuleKeys,
  type AdminModuleKey,
  type AdminUserAccessDoc,
  type AdminUserStatus,
  type ModuleAccessMap,
  type ProjectAccessRole,
  type ProjectRoleMap,
  type ProjectMemberSummary
} from "@/types/admin-access";

const INVITE_EXPIRY_DAYS = 7;

function allModulesEnabled(): ModuleAccessMap {
  return adminModuleKeys.reduce(
    (acc, key) => {
      acc[key] = true;
      return acc;
    },
    {} as ModuleAccessMap
  );
}

function normalizeModuleAccess(input: unknown, fallbackAll = false): ModuleAccessMap {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  return adminModuleKeys.reduce(
    (acc, key) => {
      if (typeof source[key] === "boolean") {
        acc[key] = Boolean(source[key]);
      } else if (key === "salehOsChat" && typeof source.agent === "boolean") {
        // Backward compatibility: inherit legacy agent access if the new key is missing.
        acc[key] = Boolean(source.agent);
      } else {
        acc[key] = fallbackAll;
      }
      return acc;
    },
    {} as ModuleAccessMap
  );
}

function normalizeProjectRoles(input: unknown): ProjectRoleMap {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const result: ProjectRoleMap = {};

  Object.entries(source).forEach(([projectId, value]) => {
    const key = String(projectId || "").trim();
    if (!key) return;
    const role = value === "viewer" ? "viewer" : value === "editor" ? "editor" : null;
    if (!role) return;
    result[key] = role;
  });

  return result;
}

function normalizeStatus(value: unknown): AdminUserStatus {
  if (value === "invited") return "invited";
  if (value === "revoked") return "revoked";
  return "active";
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    const parsed = value.toDate() as Date;
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function displayNameFromToken(token: DecodedIdToken | null) {
  const name = token?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return "";
}

export function getInviteExpiryDate(from = new Date()) {
  const next = new Date(from);
  next.setDate(next.getDate() + INVITE_EXPIRY_DAYS);
  return next;
}

export function sanitizeModuleAccessInput(input: Partial<ModuleAccessMap> | undefined, fallbackAll = false): ModuleAccessMap {
  return normalizeModuleAccess(input ?? {}, fallbackAll);
}

export function sanitizeProjectRoleMap(input: ProjectRoleMap | undefined): ProjectRoleMap {
  return normalizeProjectRoles(input ?? {});
}

function mapAdminUserDoc(uid: string, data: Record<string, unknown>): AdminUserAccessDoc {
  const createdAt = toIso(data.createdAt);
  const updatedAt = toIso(data.updatedAt);
  const role = data.role === "owner" ? "owner" : "member";
  const moduleAccess = normalizeModuleAccess(data.moduleAccess, role === "owner");

  if (role === "owner") {
    return {
      uid,
      email: asString(data.email),
      displayName: asString(data.displayName),
      role,
      status: normalizeStatus(data.status),
      moduleAccess: allModulesEnabled(),
      projectRoles: {},
      invitedByUid: asString(data.invitedByUid),
      invitedByEmail: asString(data.invitedByEmail),
      inviteSentAt: toIso(data.inviteSentAt) || undefined,
      inviteExpiresAt: toIso(data.inviteExpiresAt) || undefined,
      acceptedAt: toIso(data.acceptedAt) || undefined,
      revokedAt: toIso(data.revokedAt) || undefined,
      createdAt: createdAt || undefined,
      updatedAt: updatedAt || undefined,
      lastLoginAt: toIso(data.lastLoginAt) || undefined
    };
  }

  return {
    uid,
    email: asString(data.email),
    displayName: asString(data.displayName),
    role,
    status: normalizeStatus(data.status),
    moduleAccess,
    projectRoles: normalizeProjectRoles(data.projectRoles),
    invitedByUid: asString(data.invitedByUid),
    invitedByEmail: asString(data.invitedByEmail),
    inviteSentAt: toIso(data.inviteSentAt) || undefined,
    inviteExpiresAt: toIso(data.inviteExpiresAt) || undefined,
    acceptedAt: toIso(data.acceptedAt) || undefined,
    revokedAt: toIso(data.revokedAt) || undefined,
    createdAt: createdAt || undefined,
    updatedAt: updatedAt || undefined,
    lastLoginAt: toIso(data.lastLoginAt) || undefined
  };
}

export async function getAdminUserAccess(uid: string): Promise<AdminUserAccessDoc | null> {
  if (!uid) return null;
  const snap = await adminDb.collection("adminUsers").doc(uid).get();
  if (!snap.exists) return null;
  return mapAdminUserDoc(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
}

async function hasActiveOwner() {
  const snap = await adminDb
    .collection("adminUsers")
    .where("role", "==", "owner")
    .where("status", "==", "active")
    .limit(1)
    .get();
  return !snap.empty;
}

export async function bootstrapFirstOwner(input: {
  uid: string;
  email: string;
  displayName?: string;
}) {
  const uid = input.uid.trim();
  if (!uid) return;

  const alreadyHasOwner = await hasActiveOwner();
  if (alreadyHasOwner) return;

  const ref = adminDb.collection("adminUsers").doc(uid);
  const current = await ref.get();
  if (current.exists) {
    const data = current.data() ?? {};
    const status = normalizeStatus(data.status);
    const role = data.role === "owner" ? "owner" : "member";
    if (role === "owner" && status === "active") return;
  }

  const now = new Date();
  await ref.set(
    {
      uid,
      email: input.email,
      displayName: input.displayName ?? "",
      role: "owner",
      status: "active",
      moduleAccess: allModulesEnabled(),
      projectRoles: {},
      invitedByUid: uid,
      invitedByEmail: input.email,
      acceptedAt: now,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    },
    { merge: true }
  );
}

function hasRequiredModuleAccess(access: AdminUserAccessDoc, required: AdminModuleKey | AdminModuleKey[]) {
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((moduleKey) => access.moduleAccess[moduleKey] === true);
}

function isInvitationExpired(access: AdminUserAccessDoc, now: Date) {
  if (access.status !== "invited") return false;
  const expires = toDate(access.inviteExpiresAt);
  if (!expires) return false;
  return expires.getTime() < now.getTime();
}

type AccessResolutionStatus =
  | "ok"
  | "not_registered"
  | "revoked"
  | "invited_not_accepted"
  | "invitation_expired"
  | "missing_module";

export type AccessResolution = {
  status: AccessResolutionStatus;
  access: AdminUserAccessDoc | null;
};

export async function resolveAdminAccess(input: {
  token: DecodedIdToken;
  requiredModule?: AdminModuleKey | AdminModuleKey[];
  activateInvitation?: boolean;
  touchLastLogin?: boolean;
}): Promise<AccessResolution> {
  const now = new Date();

  await bootstrapFirstOwner({
    uid: input.token.uid,
    email: input.token.email ?? "",
    displayName: displayNameFromToken(input.token)
  });

  const access = await getAdminUserAccess(input.token.uid);
  if (!access) {
    return { status: "not_registered", access: null };
  }

  if (access.status === "revoked") {
    return { status: "revoked", access };
  }

  if (isInvitationExpired(access, now)) {
    await adminDb.collection("adminUsers").doc(access.uid).set(
      {
        status: "revoked",
        revokedAt: now,
        updatedAt: now
      },
      { merge: true }
    );
    return { status: "invitation_expired", access: { ...access, status: "revoked", revokedAt: now.toISOString() } };
  }

  if (access.status === "invited") {
    if (!input.activateInvitation) {
      return { status: "invited_not_accepted", access };
    }

    await adminDb.collection("adminUsers").doc(access.uid).set(
      {
        status: "active",
        acceptedAt: now,
        updatedAt: now,
        lastLoginAt: now,
        revokedAt: null
      },
      { merge: true }
    );
  }

  if (input.touchLastLogin) {
    await adminDb.collection("adminUsers").doc(access.uid).set(
      {
        lastLoginAt: now,
        updatedAt: now
      },
      { merge: true }
    );
  }

  const nextAccess = (await getAdminUserAccess(access.uid)) ?? access;

  if (input.requiredModule && !hasRequiredModuleAccess(nextAccess, input.requiredModule)) {
    return { status: "missing_module", access: nextAccess };
  }

  return { status: "ok", access: nextAccess };
}

export async function getProjectAccessRole(uid: string, projectId: string): Promise<"owner" | ProjectAccessRole | null> {
  if (!uid || !projectId) return null;

  const projectSnap = await adminDb.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) return null;

  const projectData = projectSnap.data() ?? {};
  const ownerId = asString(projectData.ownerId);
  if (ownerId === uid) return "owner";

  const access = await getAdminUserAccess(uid);
  if (!access || access.status !== "active") return null;
  return access.projectRoles[projectId] ?? null;
}

export async function canReadProject(uid: string, projectId: string) {
  const role = await getProjectAccessRole(uid, projectId);
  return role === "owner" || role === "viewer" || role === "editor";
}

export async function canWriteProject(uid: string, projectId: string) {
  const role = await getProjectAccessRole(uid, projectId);
  return role === "owner" || role === "editor";
}

export async function listProjectMembers(input: { projectId: string; ownerId: string }): Promise<ProjectMemberSummary[]> {
  const activeUsersSnap = await adminDb.collection("adminUsers").where("status", "==", "active").get();
  const members: ProjectMemberSummary[] = [];
  const seen = new Set<string>();

  activeUsersSnap.docs.forEach((doc) => {
    const user = mapAdminUserDoc(doc.id, (doc.data() ?? {}) as Record<string, unknown>);
    if (user.uid === input.ownerId) {
      members.push({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: "owner"
      });
      seen.add(user.uid);
      return;
    }

    const projectRole = user.projectRoles[input.projectId];
    if (!projectRole) return;

    members.push({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: projectRole
    });
    seen.add(user.uid);
  });

  if (!seen.has(input.ownerId)) {
    const ownerAuth = await adminAuth.getUser(input.ownerId).catch(() => null);
    members.push({
      uid: input.ownerId,
      email: ownerAuth?.email ?? "",
      displayName: ownerAuth?.displayName ?? "",
      role: "owner"
    });
  }

  return members.sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (a.role !== "owner" && b.role === "owner") return 1;
    return (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid);
  });
}

export async function assertUsersHaveProjectAccess(input: {
  projectId: string;
  ownerId: string;
  userIds: string[];
}) {
  const unique = [...new Set(input.userIds.map((uid) => uid.trim()).filter(Boolean))];
  if (!unique.length) return { ok: true as const, invalidUserIds: [] as string[] };

  const members = await listProjectMembers({ projectId: input.projectId, ownerId: input.ownerId });
  const memberSet = new Set(members.map((member) => member.uid));
  const invalid = unique.filter((uid) => !memberSet.has(uid));

  return {
    ok: invalid.length === 0,
    invalidUserIds: invalid
  };
}

export async function listAccessibleProjectIds(uid: string): Promise<Set<string>> {
  const byOwnerSnap = await adminDb
    .collection("projects")
    .where("ownerId", "==", uid)
    .where("status", "in", ["active", "archived"])
    .get();

  const ids = new Set<string>(byOwnerSnap.docs.map((doc) => doc.id));
  const access = await getAdminUserAccess(uid);
  if (access && access.status === "active") {
    Object.keys(access.projectRoles).forEach((projectId) => ids.add(projectId));
  }

  return ids;
}

export async function ensureSettingsManagerContinuity(input: {
  targetUid: string;
  nextStatus: AdminUserStatus;
  nextModuleAccess: ModuleAccessMap;
}) {
  if (input.nextStatus === "active" && input.nextModuleAccess.settings) {
    return { ok: true as const };
  }

  const activeSettingsManagers = await adminDb.collection("adminUsers").where("status", "==", "active").get();

  let remaining = 0;
  activeSettingsManagers.docs.forEach((doc) => {
    const user = mapAdminUserDoc(doc.id, (doc.data() ?? {}) as Record<string, unknown>);
    if (user.uid === input.targetUid) {
      if (input.nextStatus === "active" && input.nextModuleAccess.settings) {
        remaining += 1;
      }
      return;
    }

    if (user.moduleAccess.settings) {
      remaining += 1;
    }
  });

  return {
    ok: remaining > 0,
    remaining
  };
}
