import type { Metadata } from "next";

import { SettingsReminders } from "@/components/admin/settings-reminders";

export const metadata: Metadata = {
  title: "Reminder Settings"
};

export default function AdminSettingsRemindersPage() {
  return <SettingsReminders />;
}
