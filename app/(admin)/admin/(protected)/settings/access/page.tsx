import type { Metadata } from "next";

import { SettingsAccess } from "@/components/admin/settings-access";

export const metadata: Metadata = {
  title: "Settings Access"
};

export default function AdminSettingsAccessPage() {
  return <SettingsAccess />;
}
