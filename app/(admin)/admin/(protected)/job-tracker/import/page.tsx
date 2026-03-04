import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function JobImportPage() {
  await requireAdminSession("jobs");
  redirect("/admin/job-tracker/intake");
}
