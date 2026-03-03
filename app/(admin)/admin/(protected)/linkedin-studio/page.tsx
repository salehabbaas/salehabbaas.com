import type { Metadata } from "next";

import { LinkedinStudioManager } from "@/components/admin/linkedin-studio-manager";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "LinkedIn Studio"
};

export default async function AdminLinkedinStudioPage() {
  const session = await requireAdminSession("linkedin");
  return <LinkedinStudioManager ownerId={session.uid} />;
}
