import type { Metadata } from "next";

import { GoalsModuleShell } from "@/components/admin/goals/goals-module-shell";
import { GoalsWeekPage } from "@/components/admin/goals/goals-week-page";

export const metadata: Metadata = {
  title: "Goals Week",
};

export default function AdminGoalsWeekPage() {
  return (
    <GoalsModuleShell
      title="Week Plan"
      description="Shape focus areas and distribute stickers intentionally for the week."
    >
      <GoalsWeekPage />
    </GoalsModuleShell>
  );
}
