import type { Metadata } from "next";

import { SettingsHealth } from "@/components/admin/settings-health";

export const metadata: Metadata = {
  title: "Settings Health"
};

export default function AdminSettingsHealthPage() {
  return <SettingsHealth />;
}
