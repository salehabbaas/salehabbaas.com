import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function AdminResumeLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession("resume");
  return <>{children}</>;
}
