import type { Metadata } from "next";

import { GoalsAchievementsPage } from "@/components/admin/goals/goals-achievements-page";
import { GoalsModuleShell } from "@/components/admin/goals/goals-module-shell";

export const metadata: Metadata = {
  title: "Goals Achievements",
};

export default function AdminGoalsAchievementsPage() {
  return (
    <GoalsModuleShell
      title="Achievements"
      description="Track XP, streaks, and badges to keep momentum measurable."
    >
      <GoalsAchievementsPage />
    </GoalsModuleShell>
  );
}
