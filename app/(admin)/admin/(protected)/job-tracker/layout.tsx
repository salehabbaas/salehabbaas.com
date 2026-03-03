import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function AdminJobsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession("jobs");
  return <>{children}</>;
}
