/* eslint-disable */
// GENERATED FILE - DO NOT EDIT MANUALLY.
// Run: npm run contracts:generate

export const CONTRACT_API_VERSION = "2026-03-01" as const;

export type ContractApiEnvelope<TSummary = Record<string, unknown>> = {
  summary: TSummary;
  apiVersion: string;
};

export const ADMIN_MODULE_KEYS = [
  "dashboard",
  "cms",
  "creator",
  "linkedin",
  "projects",
  "resume",
  "jobs",
  "bookings",
  "settings",
  "agent"
] as const;

export type AdminModuleKeyContract = (typeof ADMIN_MODULE_KEYS)[number];
