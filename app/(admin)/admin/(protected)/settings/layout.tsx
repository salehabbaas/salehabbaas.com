import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession("settings");
  return <>{children}</>;
}
