import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function AdminCmsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession("cms");
  return <>{children}</>;
}
