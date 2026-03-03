import type { Metadata } from "next";

import { AdminAgentPanel } from "@/components/admin/agent-panel";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "SA Agent"
};

export default async function AdminAgentPage() {
  await requireAdminSession("salehOsChat");
  return <AdminAgentPanel />;
}
