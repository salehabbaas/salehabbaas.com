import "server-only";

import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getResumeDocument, getJobTrackerJob } from "@/lib/firestore/resume-studio";

export async function requireAdminUser() {
  const user = await verifyAdminRequest({ requiredModule: "resume" });
  if (!user) {
    return {
      user: null,
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  return { user, unauthorized: null };
}

export async function assertOwnedResume(docId: string, ownerId: string) {
  const doc = await getResumeDocument(docId);
  if (!doc || doc.ownerId !== ownerId) {
    return {
      doc: null,
      forbidden: NextResponse.json({ error: "Resume document not found" }, { status: 404 })
    };
  }

  return { doc, forbidden: null };
}

export async function resolveJobDescription(input: {
  ownerId: string;
  jobId?: string;
  pastedJobDescription?: string;
}) {
  const pasted = input.pastedJobDescription?.trim();
  if (pasted) {
    return {
      jobId: input.jobId ?? null,
      jobDescription: pasted,
      source: "paste" as const
    };
  }

  if (!input.jobId) {
    return null;
  }

  const job = await getJobTrackerJob(input.jobId);
  if (!job || job.ownerId !== input.ownerId || !job.descriptionText.trim()) {
    return null;
  }

  return {
    jobId: job.id,
    jobDescription: job.descriptionText,
    source: "job" as const
  };
}
