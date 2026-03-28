import type { Metadata } from "next";

import { GoalsBoardPage } from "@/components/admin/goals/goals-board-page";
import { GoalsModuleShell } from "@/components/admin/goals/goals-module-shell";
import { TopGoalsCard } from "@/components/admin/goals/top-goals-card";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getUserProjectSettings, getAccessibleProjects } from "@/lib/firestore/project-management";

export const metadata: Metadata = {
  title: "Goals Board",
};

export default async function AdminGoalsPage() {
  const session = await requireAdminSession("projects");
  const [settings, projects] = await Promise.all([
    getUserProjectSettings(session.uid),
    getAccessibleProjects(session.uid)
  ]);

  return (
    <GoalsModuleShell
      title="Goals Board"
      description="Plan with stickers, drag priorities across columns, and keep execution visible."
    >
      <TopGoalsCard initialTopGoals={settings.topGoals} projects={projects} />
      <GoalsBoardPage />
    </GoalsModuleShell>
  );
}
