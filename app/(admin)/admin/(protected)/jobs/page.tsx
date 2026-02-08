import { Metadata } from "next";

import { JobTracker } from "@/components/admin/job-tracker";

export const metadata: Metadata = {
  title: "Admin Job Tracker | Saleh Abbaas"
};

export default function AdminJobsPage() {
  return <JobTracker />;
}
