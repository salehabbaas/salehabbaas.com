import {
  AdminShell,
  type AdminProjectNavItem,
} from "@/components/admin/admin-shell";
import { listAccessibleProjectIds } from "@/lib/admin/access";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { adminDb } from "@/lib/firebase/admin";

async function loadProjectNavItems(input: {
  uid: string;
  projectsEnabled: boolean;
  projectRoles: Record<string, "viewer" | "editor">;
}): Promise<AdminProjectNavItem[]> {
  if (!input.projectsEnabled) return [];

  const accessibleProjectIds = await listAccessibleProjectIds(input.uid);
  if (!accessibleProjectIds.size) return [];

  const projectSnaps = await Promise.all(
    [...accessibleProjectIds].map((projectId) =>
      adminDb.collection("projects").doc(projectId).get(),
    ),
  );
  return projectSnaps
    .filter((snap) => snap.exists)
    .map((snap) => {
      const data = (snap.data() ?? {}) as Record<string, unknown>;
      if (String(data.module ?? "") !== "project-management") return null;

      const role: AdminProjectNavItem["role"] =
        String(data.ownerId ?? "") === input.uid
          ? "owner"
          : input.projectRoles[snap.id] === "editor"
            ? "editor"
            : "viewer";
      const name =
        typeof data.name === "string" && data.name.trim()
          ? data.name.trim()
          : snap.id;
      return {
        id: snap.id,
        name,
        role,
      };
    })
    .filter((item): item is AdminProjectNavItem => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();
  const projectNavItems = await loadProjectNavItems({
    uid: session.uid,
    projectsEnabled: session.adminAccess.moduleAccess.projects === true,
    projectRoles: session.adminAccess.projectRoles,
  });

  return (
    <AdminShell
      actorUid={session.uid}
      actorEmail={session.email ?? ""}
      actorRole={session.adminAccess.role}
      actorModuleAccess={session.adminAccess.moduleAccess}
      actorProjects={projectNavItems}
    >
      {children}
    </AdminShell>
  );
}
