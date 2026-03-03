import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Website Stats Dashboard"
};

export default async function AdminControlCenterPage() {
  await requireAdminSession("dashboard");
  redirect("/admin");
}
