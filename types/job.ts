export type JobResponse =
  | "No response"
  | "Rejected"
  | "Screening call"
  | "Interview requested"
  | "On hold"
  | "Offer"
  | "Withdrawn";

export type InterviewStage =
  | "None"
  | "Recruiter screen"
  | "Hiring manager"
  | "Technical test"
  | "Technical interview"
  | "Panel interview"
  | "Final interview";

export interface JobApplication {
  id: string;
  company: string;
  roleTitle: string;
  salaryRate?: string;
  jobAdvertUrl?: string;
  applicationDate?: string;
  contact?: string;
  response: JobResponse;
  interviewStage: InterviewStage;
  interviewDate?: string;
  interviewTime?: string;
  interviewerName?: string;
  offer?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobTrackerSettings {
  responses: JobResponse[];
  interviewStages: InterviewStage[];
}

export const JOB_EXPORT_HEADERS = [
  "Company",
  "Role Title",
  "Salary/Rate",
  "Link to Job Advert",
  "Application Date",
  "Contact",
  "Response",
  "Interview Stage",
  "Interview Date",
  "Interview Time",
  "Interviewer Name",
  "Offer",
  "Notes",
  "Created At",
  "Updated At"
] as const;
