import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  return <AdminShell actorEmail={session.email ?? ""}>{children}</AdminShell>;
}
