import type { Metadata } from "next";

import { GoalsLearningWeekPage } from "@/components/admin/goals/goals-learning-week-page";
import { GoalsModuleShell } from "@/components/admin/goals/goals-module-shell";

export const metadata: Metadata = {
  title: "Goals Weekly Learning Planning",
};

export default function AdminGoalsLearningWeekPage() {
  return (
    <GoalsModuleShell
      title="Weekly Learning Planning"
      description="Convert learning goals into a realistic weekly study plan."
    >
      <GoalsLearningWeekPage />
    </GoalsModuleShell>
  );
}

