import "server-only";

import { getRemoteConfig } from "firebase-admin/remote-config";

import { adminAuth } from "@/lib/firebase/admin";

export async function getRemoteBookingFlag() {
  try {
    const remoteConfig = getRemoteConfig(adminAuth.app);
    const template = await remoteConfig.getTemplate();
    const raw = template.parameters?.booking_enabled?.defaultValue;
    if (!raw || !("value" in raw)) return null;
    return String(raw.value).toLowerCase() === "true";
  } catch {
    return null;
  }
}

export async function setRemoteBookingFlag(enabled: boolean) {
  const remoteConfig = getRemoteConfig(adminAuth.app);
  const template = await remoteConfig.getTemplate();
  const parameters = template.parameters ?? {};

  parameters.booking_enabled = {
    defaultValue: {
      value: enabled ? "true" : "false"
    },
    description: "Controls visibility and activation of booking system"
  };

  template.parameters = parameters;
  await remoteConfig.publishTemplate(template);
}
