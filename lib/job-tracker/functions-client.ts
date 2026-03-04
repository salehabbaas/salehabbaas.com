"use client";

import { httpsCallable } from "firebase/functions";

import { cloudFunctions } from "@/lib/firebase/client";
import type { AiExtractFromInputResponse, ExportMonthlyResponse } from "@/types/job-tracker-system";

export async function callAiExtractFromInput(input: { inputText: string }) {
  const callable = httpsCallable<{ inputText: string }, AiExtractFromInputResponse>(cloudFunctions, "aiExtractFromInput");
  const response = await callable(input);
  return response.data;
}

export async function callClassifyEmail(input: { emailId: string }) {
  const callable = httpsCallable<{ emailId: string }, { resultId: string; matchedJobId: string | null }>(cloudFunctions, "classifyEmail");
  const response = await callable(input);
  return response.data;
}

export async function callExportMonthlyXlsx(input: { month: string }) {
  const callable = httpsCallable<{ month: string }, ExportMonthlyResponse>(cloudFunctions, "exportMonthlyXlsx");
  const response = await callable(input);
  return response.data;
}
