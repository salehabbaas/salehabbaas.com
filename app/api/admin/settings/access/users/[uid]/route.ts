import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ensureSettingsManagerContinuity,
  getAdminUserAccess,
  getInviteExpiryDate,
  sanitizeModuleAccessInput,
  sanitizeProjectRoleMap,
} from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  type AdminUserStatus,
  type ModuleAccessMap,
  type ProjectRoleMap,
} from "@/types/admin-access";

const projectRoleSchema = z.object({
  projectId: z.string().trim().min(1),
  role: z.enum(["viewer", "editor"]),
});

const moduleAccessPatchSchema = z
  .object({
    dashboard: z.boolean().optional(),
    cms: z.boolean().optional(),
    creator: z.boolean().optional(),
    linkedin: z.boolean().optional(),
    projects: z.boolean().optional(),
    resume: z.boolean().optional(),
    jobs: z.boolean().optional(),
    bookings: z.boolean().optional(),
    settings: z.boolean().optional(),
    agent: z.boolean().optional(),
    salehOsChat: z.boolean().optional(),
  })
  .partial();

const bodySchema = z
  .object({
    role: z.enum(["owner", "member"]).optional(),
    status: z.enum(["invited", "active", "revoked"]).optional(),
    moduleAccess: moduleAccessPatchSchema.optional(),
    projectRoles: z.array(projectRoleSchema).max(200).optional(),
    displayName: z.string().trim().max(180).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No updates provided");

function toProjectRoleMap(
  rows: Array<{ projectId: string; role: "viewer" | "editor" }> | undefined,
): ProjectRoleMap {
  const map: ProjectRoleMap = {};
  (rows ?? []).forEach((row) => {
    const projectId = row.projectId.trim();
    if (!projectId) return;
    map[projectId] = row.role;
  });
  return sanitizeProjectRoleMap(map);
}

function mergeModuleAccess(
  current: ModuleAccessMap,
  patch: Partial<ModuleAccessMap> | undefined,
) {
  const merged = { ...current };
  Object.entries(patch ?? {}).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      merged[key as keyof ModuleAccessMap] = value;
    }
  });
  return sanitizeModuleAccessInput(merged, false);
}

async function findInvalidProjectRoles(projectRoles: ProjectRoleMap) {
  const projectIds = Object.keys(projectRoles);
  if (!projectIds.length) return [] as string[];
  const snaps = await Promise.all(
    projectIds.map((projectId) =>
      adminDb.collection("projects").doc(projectId).get(),
    ),
  );

  return snaps
    .filter(
      (snap) =>
        !snap.exists ||
        String(snap.data()?.module ?? "") !== "project-management",
    )
    .map((snap) => snap.id);
}

function applyStatusMetadata(input: {
  currentStatus: AdminUserStatus;
  nextStatus: AdminUserStatus;
  now: Date;
}) {
  if (input.nextStatus === "revoked") {
    return {
      inviteSentAt: null,
      inviteExpiresAt: null,
      revokedAt: input.now,
      ...(input.currentStatus === "active" ? { acceptedAt: null } : {}),
    };
  }

  if (input.nextStatus === "invited") {
    return {
      inviteSentAt: input.now,
      inviteExpiresAt: getInviteExpiryDate(input.now),
      revokedAt: null,
      acceptedAt: null,
    };
  }

  return {
    revokedAt: null,
    ...(input.currentStatus === "active" ? {} : { acceptedAt: input.now }),
  };
}

async function setAdminClaim(uid: string, enabled: boolean) {
  const authUser = await adminAuth.getUser(uid).catch(() => null);
  if (!authUser) return;

  await adminAuth.setCustomUserClaims(uid, {
    ...(authUser.customClaims ?? {}),
    admin: enabled,
  });

  if (!enabled) {
    await adminAuth.revokeRefreshTokens(uid);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  const actor = await verifyAdminSessionFromCookie({
    requiredModule: "settings",
  });
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestContext = getAdminRequestContext(request);

  const { uid } = await context.params;
  const target = await getAdminUserAccess(uid);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const body = bodySchema.parse(await request.json());

    const ownerImmutableFieldsTouched =
      target.role === "owner" &&
      (body.role !== undefined ||
        body.status !== undefined ||
        body.moduleAccess !== undefined ||
        body.projectRoles !== undefined);

    if (ownerImmutableFieldsTouched) {
      return NextResponse.json(
        { error: "Owner access is immutable." },
        { status: 400 },
      );
    }

    const role = target.role === "owner" ? "owner" : (body.role ?? target.role);
    const nextStatus = body.status ?? target.status;
    const nextModuleAccess =
      role === "owner"
        ? sanitizeModuleAccessInput({}, true)
        : mergeModuleAccess(target.moduleAccess, body.moduleAccess);
    const nextProjectRoles =
      role === "owner"
        ? {}
        : nextStatus === "revoked"
          ? {}
          : body.projectRoles
            ? toProjectRoleMap(body.projectRoles)
            : target.projectRoles;

    if (body.projectRoles) {
      const invalidProjectRoles =
        await findInvalidProjectRoles(nextProjectRoles);
      if (invalidProjectRoles.length) {
        return NextResponse.json(
          {
            error: `Invalid project role assignments: ${invalidProjectRoles.join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    const continuity = await ensureSettingsManagerContinuity({
      targetUid: target.uid,
      nextStatus,
      nextModuleAccess,
    });
    if (!continuity.ok) {
      return NextResponse.json(
        { error: "At least one active settings manager must remain." },
        { status: 400 },
      );
    }

    const now = new Date();
    const statusFields = applyStatusMetadata({
      currentStatus: target.status,
      nextStatus,
      now,
    });

    await adminDb
      .collection("adminUsers")
      .doc(target.uid)
      .set(
        {
          role,
          status: nextStatus,
          moduleAccess:
            role === "owner"
              ? sanitizeModuleAccessInput({}, true)
              : nextModuleAccess,
          projectRoles: role === "owner" ? {} : nextProjectRoles,
          ...(typeof body.displayName === "string"
            ? { displayName: body.displayName }
            : {}),
          ...statusFields,
          updatedAt: now,
        },
        { merge: true },
      );

    if (nextStatus === "revoked") {
      await setAdminClaim(target.uid, false);
    } else {
      await setAdminClaim(target.uid, true);
    }

    await writeAdminAuditLog(
      {
        module: "settings",
        action: "update_admin_user_access",
        targetType: "adminUser",
        targetId: target.uid,
        summary: `Updated admin user ${target.email || target.uid}`,
        metadata: {
          role,
          status: nextStatus,
          moduleAccess: nextModuleAccess,
          projectRoleCount: Object.keys(nextProjectRoles).length,
        },
      },
      actor,
      requestContext,
    );

    const updated = await getAdminUserAccess(target.uid);

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update user access";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
