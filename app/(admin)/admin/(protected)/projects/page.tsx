import type { Metadata } from "next";

import { ProjectDashboard } from "@/components/admin/projects/project-dashboard";

export const metadata: Metadata = {
  title: "Projects Dashboard"
};

export default function AdminProjectsPage() {
  return <ProjectDashboard />;
}
