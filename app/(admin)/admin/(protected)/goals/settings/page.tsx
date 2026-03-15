import type { Metadata } from "next";

import { GoalsModuleShell } from "@/components/admin/goals/goals-module-shell";
import { GoalsSettingsPage } from "@/components/admin/goals/goals-settings-page";

export const metadata: Metadata = {
  title: "Goals Settings",
};

export default function AdminGoalsSettingsPage() {
  return (
    <GoalsModuleShell
      title="Goals Settings"
      description="Control reminders, force-plan rules, and streak behavior."
    >
      <GoalsSettingsPage />
    </GoalsModuleShell>
  );
}
