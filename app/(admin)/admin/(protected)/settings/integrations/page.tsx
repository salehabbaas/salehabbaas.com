import type { Metadata } from "next";

import { SettingsIntegrations } from "@/components/admin/settings-integrations";

export const metadata: Metadata = {
  title: "Settings Integrations"
};

export default function AdminSettingsIntegrationsPage() {
  return <SettingsIntegrations />;
}
