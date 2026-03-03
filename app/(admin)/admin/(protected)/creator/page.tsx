import { Metadata } from "next";

import { CreatorManager } from "@/components/admin/creator-manager";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Admin Creator System"
};

export default async function AdminCreatorPage() {
  await requireAdminSession("creator");
  return <CreatorManager />;
}
