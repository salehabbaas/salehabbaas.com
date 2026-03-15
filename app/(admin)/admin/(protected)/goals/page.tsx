import type { Metadata } from "next";

import { GoalsBoardPage } from "@/components/admin/goals/goals-board-page";
import { GoalsModuleShell } from "@/components/admin/goals/goals-module-shell";

export const metadata: Metadata = {
  title: "Goals Board",
};

export default function AdminGoalsPage() {
  return (
    <GoalsModuleShell
      title="Goals Board"
      description="Plan with stickers, drag priorities across columns, and keep execution visible."
    >
      <GoalsBoardPage />
    </GoalsModuleShell>
  );
}
