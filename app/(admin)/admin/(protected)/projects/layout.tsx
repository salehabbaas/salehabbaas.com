import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function AdminProjectsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession("projects");
  return <>{children}</>;
}
