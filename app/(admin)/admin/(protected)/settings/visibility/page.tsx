import type { Metadata } from "next";

import { SettingsVisibility } from "@/components/admin/settings-visibility";

export const metadata: Metadata = {
  title: "Settings Visibility"
};

export default function AdminSettingsVisibilityPage() {
  return <SettingsVisibility />;
}
