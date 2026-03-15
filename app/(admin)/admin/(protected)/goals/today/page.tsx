import type { Metadata } from "next";

import { GoalsModuleShell } from "@/components/admin/goals/goals-module-shell";
import { GoalsTodayPage } from "@/components/admin/goals/goals-today-page";

export const metadata: Metadata = {
  title: "Goals Today",
};

export default function AdminGoalsTodayPage() {
  return (
    <GoalsModuleShell
      title="Today"
      description="Force-plan mode, start-day execution, and end-day review in one flow."
    >
      <GoalsTodayPage />
    </GoalsModuleShell>
  );
}
