"use client";

import { AiIntakeCard } from "@/components/admin/job-tracker-v2/ai-intake-card";
import { JobTrackerNav } from "@/components/admin/job-tracker-v2/job-tracker-nav";

export function JobTrackerIntakePage({ ownerId }: { ownerId: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">AI Intake</h1>
        <p className="text-sm text-muted-foreground">
          Universal intake for URL imports, job descriptions, and pasted email text.
        </p>
      </div>

      <JobTrackerNav />

      <AiIntakeCard ownerId={ownerId} />
    </div>
  );
}
