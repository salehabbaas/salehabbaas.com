import type { Metadata } from "next";

import { GoalsLearningStreaksPage } from "@/components/admin/goals/goals-learning-streaks-page";
import { GoalsModuleShell } from "@/components/admin/goals/goals-module-shell";

export const metadata: Metadata = {
  title: "Goals Learning Streaks",
};

export default function AdminGoalsLearningStreaksPage() {
  return (
    <GoalsModuleShell
      title="Learning Streaks"
      description="Measure daily learning consistency and generate weekly recaps."
    >
      <GoalsLearningStreaksPage />
    </GoalsModuleShell>
  );
}

