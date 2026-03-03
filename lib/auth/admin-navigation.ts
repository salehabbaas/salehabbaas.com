import type { AdminModuleKey, AdminUserAccessDoc } from "@/types/admin-access";

export function firstAllowedAdminPath(access: AdminUserAccessDoc) {
  const order: Array<{ module: AdminModuleKey; path: string }> = [
    { module: "dashboard", path: "/admin" },
    { module: "cms", path: "/admin/cms/profile" },
    { module: "creator", path: "/admin/creator" },
    { module: "linkedin", path: "/admin/linkedin-studio" },
    { module: "projects", path: "/admin/projects" },
    { module: "resume", path: "/admin/resume-studio" },
    { module: "jobs", path: "/admin/job-tracker" },
    { module: "bookings", path: "/admin/bookings" },
    { module: "settings", path: "/admin/settings/reminders" },
    { module: "salehOsChat", path: "/admin/agent" }
  ];

  const first = order.find((entry) => access.moduleAccess[entry.module]);
  return first?.path ?? "/admin/login";
}
