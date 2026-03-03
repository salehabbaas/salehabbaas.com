import { NextResponse } from "next/server";

import { getAdminUserAccess, getInviteExpiryDate, sanitizeProjectRoleMap } from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getConfiguredEmailAdapter } from "@/lib/email/service";
import { renderConfiguredEmailTemplate } from "@/lib/email/templates";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { resolveAbsoluteUrl } from "@/lib/utils";

function moduleSummary(moduleAccess: Record<string, boolean>) {
  return Object.entries(moduleAccess)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

async function projectSummary(projectRoles: Record<string, "viewer" | "editor">) {
  const roles = sanitizeProjectRoleMap(projectRoles);
  const projectIds = Object.keys(roles);
  if (!projectIds.length) return [] as Array<{ id: string; name: string; role: string }>;
  const snaps = await Promise.all(projectIds.map((projectId) => adminDb.collection("projects").doc(projectId).get()));
  return snaps.map((snap) => ({
    id: snap.id,
    name: String(snap.data()?.name ?? snap.id),
    role: roles[snap.id]
  }));
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
    invitationType: "resent",
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

export async function POST(request: Request, context: { params: Promise<{ uid: string }> }) {
  const actor = await verifyAdminRequest({ requiredModule: "settings" });
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestContext = getAdminRequestContext(request);

  const { uid } = await context.params;
  const target = await getAdminUserAccess(uid);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "owner") return NextResponse.json({ error: "Owner invitations cannot be resent." }, { status: 400 });
  if (target.status === "revoked") return NextResponse.json({ error: "User is revoked." }, { status: 400 });

  const authUser = await adminAuth.getUser(uid).catch(() => null);
  if (!authUser?.email) return NextResponse.json({ error: "User email not found in Firebase Auth." }, { status: 400 });

  const now = new Date();
  const expiresAt = getInviteExpiryDate(now);

  await adminAuth.setCustomUserClaims(uid, {
    ...(authUser.customClaims ?? {}),
    admin: true
  });

  const setupLink = await adminAuth.generatePasswordResetLink(authUser.email, {
    url: resolveAbsoluteUrl("/admin/login"),
    handleCodeInApp: false
  });

  await adminDb.collection("adminUsers").doc(uid).set(
    {
      status: "invited",
      inviteSentAt: now,
      inviteExpiresAt: expiresAt,
      revokedAt: null,
      updatedAt: now
    },
    { merge: true }
  );

  const projects = await projectSummary(target.projectRoles);
  const modules = moduleSummary(target.moduleAccess);

  const adapter = await getConfiguredEmailAdapter();
  const loginLink = resolveAbsoluteUrl("/admin/login");
  const renderedInvitation = await renderConfiguredEmailTemplate(
    "adminInvitation",
    toInvitationTemplateVariables({
      recipientEmail: authUser.email,
      invitedBy: actor.email ?? actor.uid,
      setupLink,
      loginLink,
      expiresAtIso: expiresAt.toISOString(),
      modules,
      projects
    })
  );

  await adapter.send({
    to: authUser.email,
    subject: renderedInvitation.subject,
    html: renderedInvitation.html,
    text: renderedInvitation.text,
    activity: {
      module: "Settings Access",
      templateId: "adminInvitation",
      trigger: "resend_admin_invitation"
    }
  });

  await writeAdminAuditLog(
    {
      module: "settings",
      action: "resend_admin_invitation",
      targetType: "adminUser",
      targetId: uid,
      summary: `Resent admin invitation to ${authUser.email}`,
      metadata: {
        modules,
        projectRoles: projects
      }
    },
    actor,
    requestContext
  );

  return NextResponse.json({
    success: true,
    uid,
    email: authUser.email,
    inviteExpiresAt: expiresAt.toISOString()
  });
}
