export const COMPANY_CATEGORY_SEED = [
  "Healthcare",
  "Tech",
  "Telecom",
  "Government",
  "Finance",
  "Startup",
  "Education",
  "Nonprofit",
  "Retail",
  "Manufacturing",
  "Energy",
  "Logistics",
  "Media",
  "Hospitality",
  "Other"
] as const;

export const COMPANY_WATCH_FREQUENCIES = ["daily", "twiceDaily", "weekly"] as const;
export const JOB_STATUSES = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"] as const;
export const JOB_SOURCE_TYPES = ["manual", "url_import", "ai_intake", "email"] as const;
export const INTERVIEW_STAGES = ["Screen", "Technical", "HR", "Onsite", "Final", "Other"] as const;
export const INTERVIEW_MODES = ["Zoom", "Phone", "Onsite", "Other"] as const;
export const DOCUMENT_TYPES = ["resume", "cover_letter", "other", "export"] as const;
export const EMAIL_SOURCE_TYPES = ["pasted", "eml_upload", "forwarded"] as const;
export const NOTIFICATION_TYPES = ["task_reminder", "new_job_found", "email_status_update", "export_ready"] as const;
export const EMAIL_DETECTED_STATUSES = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "UNKNOWN"] as const;

export type CompanyWatchFrequency = (typeof COMPANY_WATCH_FREQUENCIES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type JobSourceType = (typeof JOB_SOURCE_TYPES)[number];
export type InterviewStage = (typeof INTERVIEW_STAGES)[number];
export type InterviewMode = (typeof INTERVIEW_MODES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type EmailSourceType = (typeof EMAIL_SOURCE_TYPES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type EmailDetectedStatus = (typeof EMAIL_DETECTED_STATUSES)[number];

export type InputType = "url" | "linkedin_url" | "email" | "job_description";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

export type CompanyCategoryRecord = {
  id: string;
  name: string;
  createdAt?: string;
};

export type CompanyRecord = {
  id: string;
  userId: string;
  name: string;
  categoryId: string;
  websiteUrl: string;
  careerPageUrl: string;
  notes: string;
  lastCheckedAt?: string;
  watchEnabled: boolean;
  watchFrequency: CompanyWatchFrequency;
  lastScanAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyVisitRecord = {
  id: string;
  userId: string;
  companyId: string;
  visitedAt?: string;
  source: "open_button" | "redirect";
};

export type JobRecord = {
  id: string;
  userId: string;
  companyId: string;
  roleTitle: string;
  jobUrl: string;
  location: string;
  salaryRateText: string;
  status: JobStatus;
  applicationDate?: string;
  deadline?: string;
  sourceType: JobSourceType;
  resumeStudioDocId: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type JobStatusHistoryRecord = {
  id: string;
  userId: string;
  jobId: string;
  fromStatus: JobStatus | "UNKNOWN";
  toStatus: JobStatus;
  reason: string;
  createdAt?: string;
};

export type InterviewRecord = {
  id: string;
  userId: string;
  jobId: string;
  stage: InterviewStage;
  interviewDateTime?: string;
  mode: InterviewMode;
  interviewerName: string;
  meetingLink: string;
  notes: string;
  createdAt?: string;
};

export type TaskRecord = {
  id: string;
  userId: string;
  jobId: string;
  title: string;
  dueDateTime?: string;
  reminderAt?: string;
  reminderSentAt?: string | null;
  isCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DocumentRecord = {
  id: string;
  userId: string;
  jobId: string | null;
  type: DocumentType;
  storagePath: string;
  fileUrl: string;
  uploadedAt?: string;
};

export type EmailMessageRecord = {
  id: string;
  userId: string;
  subject: string;
  fromEmail: string;
  bodyText: string;
  receivedAt?: string;
  rawSource: EmailSourceType;
  createdAt?: string;
};

export type EmailAiInterviewDetails = {
  interview_datetime?: string;
  interviewer_name?: string;
  meeting_link?: string;
  interview_stage?: string;
};

export type EmailAiResultRecord = {
  id: string;
  userId: string;
  emailId: string;
  detectedCompanyName: string;
  detectedJobTitle: string;
  detectedJobReferenceId: string;
  detectedStatus: EmailDetectedStatus;
  emailType: string;
  interviewDetails?: EmailAiInterviewDetails;
  actionRequired: boolean;
  confidence: number;
  reasoning: string;
  matchedCompanyId: string | null;
  matchedJobId: string | null;
  createdAt?: string;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string;
  isRead: boolean;
  createdAt?: string;
};

export type CompanyJobSnapshotRecord = {
  id: string;
  userId: string;
  companyId: string;
  externalJobKey: string;
  jobUrl: string;
  title?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
};

export type MonthlyExportRecord = {
  id: string;
  userId: string;
  month: string;
  storagePath: string;
  fileUrl: string;
  createdAt?: string;
};

export type JobExtractionPreview = {
  job_title: string;
  company_name: string;
  company_website: string;
  job_url: string;
  location: string;
  employment_type: string;
  salary_range: string;
  department: string;
  posting_date: string;
  application_deadline: string;
  job_description: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  source_platform: "LinkedIn" | "Company Website" | "Indeed" | "Greenhouse" | "Lever" | "Workday" | "Other";
  confidence: number;
};

export type AiExtractFromInputResponse = {
  inputType: InputType;
  blocked?: boolean;
  hint?: string;
  extractedText: string;
  preview: JobExtractionPreview;
};

export type EmailClassificationResult = {
  email_type:
    | "application_received"
    | "interview_invitation"
    | "interview_scheduled"
    | "rejection"
    | "offer"
    | "follow_up_required"
    | "general_update"
    | "newsletter"
    | "unknown";
  company_name: string;
  job_title: string;
  job_reference_id: string;
  detected_status: EmailDetectedStatus;
  interview_details?: EmailAiInterviewDetails;
  action_required: boolean;
  confidence: number;
  reasoning: string;
};

export type ExportMonthlyResponse = {
  exportId: string;
  fileUrl: string;
  month: string;
};
