import type { Metadata } from "next";

import { GoalsLearningDashboardPage } from "@/components/admin/goals/goals-learning-dashboard-page";
import { GoalsModuleShell } from "@/components/admin/goals/goals-module-shell";

export const metadata: Metadata = {
  title: "Goals Learning Dashboard",
};

export default function AdminGoalsLearningDashboardPage() {
  return (
    <GoalsModuleShell
      title="Learning Dashboard"
      description="Track study minutes, focus areas, and your next best learning move."
    >
      <GoalsLearningDashboardPage />
    </GoalsModuleShell>
  );
}

