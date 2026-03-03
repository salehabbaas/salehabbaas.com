import "server-only";

import { NextResponse } from "next/server";

import { getRuntimeAdminSettings } from "@/lib/firestore/admin-settings";

export async function getResumeStudioFlags() {
  const runtime = await getRuntimeAdminSettings();
  return {
    resumeStudioV2Enabled: runtime.integrations.resumeStudioV2Enabled !== false,
    resumeAi53Enabled: runtime.integrations.resumeAi53Enabled !== false,
    resumeJobUrlParserEnabled: runtime.integrations.resumeJobUrlParserEnabled !== false,
    resumeAdvancedTemplateBuilderEnabled: runtime.integrations.resumeAdvancedTemplateBuilderEnabled !== false
  };
}

export async function ensureResumeStudioFlag(flag: keyof Awaited<ReturnType<typeof getResumeStudioFlags>>, errorMessage: string) {
  const flags = await getResumeStudioFlags();
  if (!flags[flag]) {
    return NextResponse.json({ error: errorMessage }, { status: 403 });
  }
  return null;
}
