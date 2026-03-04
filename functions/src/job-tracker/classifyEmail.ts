import { onCall, HttpsError } from "firebase-functions/v2/https";

import { adminDb } from "../lib/admin";
import { runOpenAiStructured } from "./openai";
import {
  classifyEmailInputSchema,
  emailClassificationJsonSchema,
  emailClassificationResultSchema
} from "./schemas";
import { writeAuditLog, writeNotification } from "./store";
import { requireAuthUid, similarity } from "./utils";

function normalizeStage(value?: string) {
  const lower = String(value ?? "").toLowerCase();
  if (!lower) return "Other";
  if (lower.includes("screen")) return "Screen";
  if (lower.includes("technical")) return "Technical";
  if (lower === "hr" || lower.includes("human")) return "HR";
  if (lower.includes("onsite") || lower.includes("on-site")) return "Onsite";
  if (lower.includes("final")) return "Final";
  return "Other";
}

function parseInterviewDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export const classifyEmail = onCall(async (request) => {
  const userId = requireAuthUid(request.auth);
  const { emailId } = classifyEmailInputSchema.parse(request.data ?? {});

  const emailSnap = await adminDb.collection("emailMessages").doc(emailId).get();
  if (!emailSnap.exists) {
    throw new HttpsError("not-found", "Email message not found.");
  }

  const emailData = emailSnap.data() ?? {};
  if (String(emailData.userId ?? "") !== userId) {
    throw new HttpsError("permission-denied", "You cannot classify this email.");
  }

  const subject = String(emailData.subject ?? "");
  const fromEmail = String(emailData.fromEmail ?? "");
  const bodyText = String(emailData.bodyText ?? "");
  const receivedAt = emailData.receivedAt;

  const aiRaw = await runOpenAiStructured<unknown>({
    schemaName: "email_classification_schema",
    schema: emailClassificationJsonSchema as unknown as Record<string, unknown>,
    systemPrompt:
      "You classify job application emails. Return ONLY valid JSON matching the schema. Add confidence between 0 and 1. reasoning must be concise (1-3 sentences) and should not include private data.",
    userPrompt: [
      `Subject: ${subject}`,
      `From: ${fromEmail}`,
      `Received: ${receivedAt ? String(receivedAt) : ""}`,
      "Body:",
      bodyText
    ].join("\n")
  });

  const parsed = emailClassificationResultSchema.parse(aiRaw);

  const companiesSnap = await adminDb.collection("companies").where("userId", "==", userId).get();
  const jobsSnap = await adminDb.collection("jobs").where("userId", "==", userId).get();

  const companyCandidates = companiesSnap.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      name: String(data.name ?? "")
    };
  });

  const bestCompany = companyCandidates
    .map((company) => ({
      ...company,
      score: Math.max(similarity(parsed.company_name, company.name), company.name.toLowerCase() === parsed.company_name.toLowerCase() ? 1 : 0)
    }))
    .sort((a, b) => b.score - a.score)[0];

  const matchedCompanyId = bestCompany && bestCompany.score >= 0.35 ? bestCompany.id : null;

  const jobCandidates = jobsSnap.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      companyId: String(data.companyId ?? ""),
      roleTitle: String(data.roleTitle ?? ""),
      status: String(data.status ?? "SAVED")
    };
  });

  const bestJob = jobCandidates
    .filter((job) => (matchedCompanyId ? job.companyId === matchedCompanyId : true))
    .map((job) => {
      const titleScore = similarity(parsed.job_title, job.roleTitle);
      const companyScore = matchedCompanyId && job.companyId === matchedCompanyId ? 1 : 0;
      return {
        ...job,
        score: titleScore * 0.75 + companyScore * 0.25
      };
    })
    .sort((a, b) => b.score - a.score)[0];

  const matchedJobId = bestJob && bestJob.score >= 0.35 ? bestJob.id : null;

  let autoUpdated = false;
  const detectedStatus = parsed.detected_status;

  if (parsed.confidence >= 0.75 && matchedJobId && detectedStatus !== "UNKNOWN") {
    const matchedJob = jobCandidates.find((job) => job.id === matchedJobId);
    if (matchedJob && matchedJob.status !== detectedStatus) {
      await Promise.all([
        adminDb.collection("jobs").doc(matchedJobId).set(
          {
            status: detectedStatus,
            updatedAt: new Date(),
            sourceType: "email"
          },
          { merge: true }
        ),
        adminDb.collection("jobStatusHistory").add({
          userId,
          jobId: matchedJobId,
          fromStatus: matchedJob.status,
          toStatus: detectedStatus,
          reason: `Email AI: ${parsed.email_type}`,
          createdAt: new Date()
        })
      ]);
      autoUpdated = true;
    }

    if (parsed.interview_details && parsed.interview_details.interview_datetime) {
      const interviewDate = parseInterviewDate(parsed.interview_details.interview_datetime);
      await adminDb.collection("interviews").add({
        userId,
        jobId: matchedJobId,
        stage: normalizeStage(parsed.interview_details.interview_stage),
        interviewDateTime: interviewDate,
        mode: "Other",
        interviewerName: parsed.interview_details.interviewer_name || "",
        meetingLink: parsed.interview_details.meeting_link || "",
        notes: `Created from email ${emailId}`,
        createdAt: new Date()
      });
    }

    if (parsed.action_required) {
      const now = new Date();
      const dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await adminDb.collection("tasks").add({
        userId,
        jobId: matchedJobId,
        title: `Follow up required: ${parsed.company_name || "Job update"}`,
        dueDateTime: dueAt,
        reminderAt: dueAt,
        reminderSentAt: null,
        isCompleted: false,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  const resultRef = await adminDb.collection("emailAiResults").add({
    userId,
    emailId,
    detectedCompanyName: parsed.company_name,
    detectedJobTitle: parsed.job_title,
    detectedJobReferenceId: parsed.job_reference_id,
    detectedStatus,
    emailType: parsed.email_type,
    interviewDetails: parsed.interview_details ?? {},
    actionRequired: parsed.action_required,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    matchedCompanyId,
    matchedJobId,
    createdAt: new Date()
  });

  await Promise.all([
    writeNotification({
      userId,
      type: "email_status_update",
      title: autoUpdated ? "Email updated job status" : "Email classified",
      body: autoUpdated
        ? `${parsed.company_name || "Company"} email updated a job to ${detectedStatus}.`
        : `${parsed.company_name || "Company"} email classified as ${parsed.email_type}.`,
      linkUrl: matchedJobId ? `/admin/job-tracker/jobs?jobId=${matchedJobId}` : "/admin/job-tracker/emails"
    }),
    writeAuditLog({
      userId,
      action: "classify_email",
      targetType: "emailMessages",
      targetId: emailId,
      summary: `Email classified as ${parsed.email_type}`,
      metadata: {
        resultId: resultRef.id,
        matchedCompanyId,
        matchedJobId,
        confidence: parsed.confidence,
        autoUpdated
      }
    })
  ]);

  return {
    resultId: resultRef.id,
    matchedJobId
  };
});
