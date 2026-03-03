import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getAdminUserAccess,
  getInviteExpiryDate,
  sanitizeModuleAccessInput,
  sanitizeProjectRoleMap
} from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { getConfiguredEmailAdapter } from "@/lib/email/service";
import { renderConfiguredEmailTemplate } from "@/lib/email/templates";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { resolveAbsoluteUrl } from "@/lib/utils";
import { adminModuleKeys, type ModuleAccessMap, type ProjectRoleMap } from "@/types/admin-access";

const projectRoleSchema = z.object({
  projectId: z.string().trim().min(1),
  role: z.enum(["viewer", "editor"])
});

const moduleAccessSchema = z
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
    salehOsChat: z.boolean().optional()
  })
  .partial();

const inviteSchema = z.object({
  email: z.string().trim().email(),
  moduleAccess: moduleAccessSchema.optional(),
  projectRoles: z.array(projectRoleSchema).max(200).optional()
});

function projectRolesToMap(rows: Array<{ projectId: string; role: "viewer" | "editor" }> | undefined): ProjectRoleMap {
  const map: ProjectRoleMap = {};
  (rows ?? []).forEach((row) => {
    const projectId = row.projectId.trim();
    if (!projectId) return;
    map[projectId] = row.role;
  });
  return sanitizeProjectRoleMap(map);
}

function ensureModuleAccessHasAtLeastOne(map: ModuleAccessMap) {
  return adminModuleKeys.some((key) => map[key]);
}

function formatModuleSummary(moduleAccess: ModuleAccessMap) {
  return adminModuleKeys
    .filter((key) => moduleAccess[key])
    .map((key) => key.replace(/-/g, " "));
}

function toIsoString(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return "";
}

async function loadProjectLabels(projectRoles: ProjectRoleMap) {
  const projectIds = Object.keys(projectRoles);
  if (!projectIds.length) return [] as Array<{ id: string; name: string; role: string }>;

  const snaps = await Promise.all(projectIds.map((projectId) => adminDb.collection("projects").doc(projectId).get()));
  return snaps.map((snap) => ({
    id: snap.id,
    name: snap.data()?.name ? String(snap.data()?.name) : snap.id,
    role: projectRoles[snap.id]
  }));
}

async function findInvalidProjectRoles(projectRoles: ProjectRoleMap) {
  const projectIds = Object.keys(projectRoles);
  if (!projectIds.length) return [] as string[];
  const snaps = await Promise.all(projectIds.map((projectId) => adminDb.collection("projects").doc(projectId).get()));

  return snaps
    .filter((snap) => !snap.exists || String(snap.data()?.module ?? "") !== "project-management")
    .map((snap) => snap.id);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toInvitationTemplateVariables(input: {
  recipientEmail: string;
  invitedBy: string;
  setupLink: string;
  loginLink: string;
  expiresAtIso: string;
  modules: string[];
  projects: Array<{ id: string; name: string; role: string }>;
}) {
  const modulesListHtml = input.modules.length
    ? input.modules.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No module access</li>";
  const projectsListHtml = input.projects.length
    ? input.projects.map((item) => `<li>${escapeHtml(`${item.name} (${item.role})`)}</li>`).join("")
    : "<li>No project assignments</li>";

  return {
    moduleName: "Settings Access",
    primaryActionLabel: "Set Password",
    primaryActionUrl: input.setupLink,
    quickLinks: [
      { label: "Admin Login", url: input.loginLink },
      { label: "Settings Access", url: "/admin/settings/access" },
      { label: "System Inbox", url: "/admin/system-inbox" }
    ],
    invitationType: "created",
    recipientEmail: input.recipientEmail,
    invitedBy: input.invitedBy,
    expiresAtIso: input.expiresAtIso,
    setupLink: input.setupLink,
    loginLink: input.loginLink,
    modulesText: input.modules.join(", ") || "none",
    projectsText: input.projects.map((project) => `${project.name} (${project.role})`).join(", ") || "none",
    modulesListHtml,
    projectsListHtml
  };
}

async function requireSettingsManager(request: Request) {
  const actor = await verifyAdminSessionFromCookie({ requiredModule: "settings" });
  if (!actor) {
    return {
      actor: null,
      requestContext: null,
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  return {
    actor,
    requestContext: getAdminRequestContext(request),
    unauthorized: null
  };
}

export async function GET(request: Request) {
  const auth = await requireSettingsManager(request);
  if (auth.unauthorized) return auth.unauthorized;

  const [usersSnap, projectsSnap] = await Promise.all([
    adminDb.collection("adminUsers").orderBy("createdAt", "asc").get(),
    adminDb.collection("projects").where("module", "==", "project-management").get()
  ]);

  const users = usersSnap.docs.map((doc) => {
    const row = (doc.data() ?? {}) as Record<string, unknown>;
      const moduleAccess = sanitizeModuleAccessInput((row.moduleAccess ?? {}) as Partial<ModuleAccessMap>, row.role === "owner");
      const projectRoles = sanitizeProjectRoleMap((row.projectRoles ?? {}) as ProjectRoleMap);

      return {
        uid: row.uid ? String(row.uid) : doc.id,
        email: String(row.email ?? ""),
        displayName: String(row.displayName ?? ""),
        role: row.role === "owner" ? "owner" : "member",
        status: row.status === "invited" ? "invited" : row.status === "revoked" ? "revoked" : "active",
        moduleAccess,
        projectRoles,
        invitedByUid: String(row.invitedByUid ?? ""),
        invitedByEmail: String(row.invitedByEmail ?? ""),
        inviteSentAt: toIsoString(row.inviteSentAt),
        inviteExpiresAt: toIsoString(row.inviteExpiresAt),
        acceptedAt: toIsoString(row.acceptedAt),
        revokedAt: toIsoString(row.revokedAt),
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
        lastLoginAt: toIsoString(row.lastLoginAt)
      };
    });

  const projects = projectsSnap.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      id: doc.id,
      name: String(data.name ?? "Untitled project"),
      status: data.status === "archived" ? "archived" : "active",
      ownerId: String(data.ownerId ?? "")
    };
  });

  return NextResponse.json({
    actor: {
      uid: auth.actor?.uid,
      email: auth.actor?.email ?? "",
      role: auth.actor?.adminAccess.role ?? "member",
      moduleAccess: auth.actor?.adminAccess.moduleAccess ?? sanitizeModuleAccessInput({}, false)
    },
    users,
    projects,
    now: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  const auth = await requireSettingsManager(request);
  if (auth.unauthorized) return auth.unauthorized;
  const actor = auth.actor;
  const requestContext = auth.requestContext;
  if (!actor || !requestContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = inviteSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const moduleAccess = sanitizeModuleAccessInput(body.moduleAccess as Partial<ModuleAccessMap> | undefined, false);
    if (!ensureModuleAccessHasAtLeastOne(moduleAccess)) {
      return NextResponse.json({ error: "At least one module must be enabled." }, { status: 400 });
    }

    const projectRoles = projectRolesToMap(body.projectRoles);
    const invalidProjectRoles = await findInvalidProjectRoles(projectRoles);
    if (invalidProjectRoles.length) {
      return NextResponse.json(
        { error: `Invalid project role assignments: ${invalidProjectRoles.join(", ")}` },
        { status: 400 }
      );
    }

    let authUser = await adminAuth.getUserByEmail(email).catch(() => null);
    if (!authUser) {
      authUser = await adminAuth.createUser({ email, emailVerified: false, disabled: false });
    }

    const existingAccess = await getAdminUserAccess(authUser.uid);
    if (existingAccess?.role === "owner") {
      return NextResponse.json({ error: "Owner accounts cannot be invited from this endpoint." }, { status: 400 });
    }
    if (existingAccess?.status === "active") {
      return NextResponse.json({ error: "User is already active." }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = getInviteExpiryDate(now);

    await adminAuth.setCustomUserClaims(authUser.uid, {
      ...(authUser.customClaims ?? {}),
      admin: true
    });

    const passwordSetupLink = await adminAuth.generatePasswordResetLink(email, {
      url: resolveAbsoluteUrl("/admin/login"),
      handleCodeInApp: false
    });

    await adminDb.collection("adminUsers").doc(authUser.uid).set(
      {
        uid: authUser.uid,
        email,
        displayName: authUser.displayName ?? "",
        role: "member",
        status: "invited",
        moduleAccess,
        projectRoles,
        invitedByUid: actor.uid,
        invitedByEmail: actor.email ?? "",
        inviteSentAt: now,
        inviteExpiresAt: expiresAt,
        acceptedAt: null,
        revokedAt: null,
        createdAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    const modules = formatModuleSummary(moduleAccess);
    const projectLabels = await loadProjectLabels(projectRoles);
    const adapter = await getConfiguredEmailAdapter();
    const loginLink = resolveAbsoluteUrl("/admin/login");
    const renderedInvitation = await renderConfiguredEmailTemplate(
      "adminInvitation",
      toInvitationTemplateVariables({
        recipientEmail: email,
        invitedBy: actor.email ?? actor.uid,
        setupLink: passwordSetupLink,
        loginLink,
        expiresAtIso: expiresAt.toISOString(),
        modules,
        projects: projectLabels
      })
    );

    await adapter.send({
      to: email,
      subject: renderedInvitation.subject,
      html: renderedInvitation.html,
      text: renderedInvitation.text,
      activity: {
        module: "Settings Access",
        templateId: "adminInvitation",
        trigger: "invite_admin_user"
      }
    });

    await writeAdminAuditLog(
      {
        module: "settings",
        action: "invite_admin_user",
        targetType: "adminUser",
        targetId: authUser.uid,
        summary: `Invited admin user ${email}`,
        metadata: {
          modules,
          projectRoles: projectLabels
        }
      },
      actor,
      requestContext
    );

    return NextResponse.json({
      success: true,
      uid: authUser.uid,
      email,
      inviteExpiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to invite user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
