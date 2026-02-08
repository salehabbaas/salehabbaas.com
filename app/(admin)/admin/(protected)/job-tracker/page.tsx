import { Metadata } from "next";

import { JobTracker } from "@/components/admin/job-tracker";

export const metadata: Metadata = {
  title: "Job Tracker"
};

export default function AdminJobTrackerPage() {
  return <JobTracker />;
}
