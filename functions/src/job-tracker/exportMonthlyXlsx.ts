import { onCall } from "firebase-functions/v2/https";
import XlsxPopulate from "xlsx-populate";

import { adminDb, adminStorage } from "../lib/admin";
import { exportMonthlyInputSchema } from "./schemas";
import { writeAuditLog, writeNotification } from "./store";
import { formatDdMmYy, monthRange, requireAuthUid, sha256, toIso } from "./utils";

const YMCA_HEADERS = [
  "Company",
  "Role Title",
  "Salary/Rate",
  "Link to Job Advert",
  "Application Date (dd/mm/yy)",
  "Contact",
  "Response (Drop Down List)",
  "Interview Stage (Drop Down List)",
  "Interview Time, Date & Interviewer Name",
  "Offer"
] as const;

function mapResponse(status: string) {
  if (status === "REJECTED") return "Rejected";
  if (status === "INTERVIEW") return "Interview";
  if (status === "OFFER") return "Offer";
  if (status === "SAVED" || status === "APPLIED") return "No Response";
  return "Other";
}

function mapOffer(status: string) {
  if (status === "OFFER") return "Yes";
  if (status === "REJECTED") return "No";
  return "";
}

function formatInterviewSummary(interview?: { date?: string; interviewer?: string }) {
  if (!interview?.date) return "";
  const parsed = new Date(interview.date);
  if (Number.isNaN(parsed.getTime())) return "";

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const min = String(parsed.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min} - ${interview.interviewer || ""}`.trim();
}

export const exportMonthlyXlsx = onCall(async (request) => {
  const userId = requireAuthUid(request.auth);
  const { month } = exportMonthlyInputSchema.parse(request.data ?? {});

  const { start, end } = monthRange(month);

  const jobsSnap = await adminDb.collection("jobs").where("userId", "==", userId).get();
  const jobs = jobsSnap.docs
    .map((entry) => {
      const data = entry.data();
      return {
        id: entry.id,
        companyId: String(data.companyId ?? ""),
        roleTitle: String(data.roleTitle ?? ""),
        salaryRateText: String(data.salaryRateText ?? ""),
        jobUrl: String(data.jobUrl ?? ""),
        applicationDate: toIso(data.applicationDate),
        status: String(data.status ?? "")
      };
    })
    .filter((job) => {
      if (!job.applicationDate) return false;
      const parsed = new Date(job.applicationDate);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed >= start && parsed < end;
    });

  const companyIds = new Set<string>();
  jobs.forEach((job) => {
    if (job.companyId) companyIds.add(job.companyId);
  });

  const interviewsSnap = await adminDb.collection("interviews").where("userId", "==", userId).get();
  const interviewsByJob = new Map<
    string,
    {
      stage: string;
      date: string;
      interviewer: string;
    }
  >();

  interviewsSnap.docs.forEach((entry) => {
    const data = entry.data();
    const jobId = String(data.jobId ?? "");
    if (!jobId) return;
    if (interviewsByJob.has(jobId)) return;

    interviewsByJob.set(jobId, {
      stage: String(data.stage ?? ""),
      date: toIso(data.interviewDateTime),
      interviewer: String(data.interviewerName ?? "")
    });
  });

  const companyNameById = new Map<string, string>();
  await Promise.all(
    [...companyIds].map(async (companyId) => {
      const snap = await adminDb.collection("companies").doc(companyId).get();
      companyNameById.set(companyId, String(snap.data()?.name ?? ""));
    })
  );

  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);
  const rows = jobs.map((job) => {
    const interview = interviewsByJob.get(String(job.id));
    const contact = interview?.interviewer || "";
    const applicationDate = job.applicationDate ? new Date(job.applicationDate) : null;
    const formattedDate = applicationDate && !Number.isNaN(applicationDate.getTime()) ? formatDdMmYy(applicationDate) : "";

    return [
      companyNameById.get(job.companyId) || "",
      job.roleTitle,
      job.salaryRateText,
      job.jobUrl,
      formattedDate,
      contact,
      mapResponse(job.status),
      interview?.stage || "",
      formatInterviewSummary(interview),
      mapOffer(job.status)
    ];
  });
  const rowLimit = Math.max(rows.length + 51, 100);

  sheet.name("YMCA Job Tracker");
  sheet.cell("A1").value([Array.from(YMCA_HEADERS), ...rows]);
  YMCA_HEADERS.forEach((_, index) => {
    sheet.column(index + 1).width(28);
  });
  sheet.row(1).style("bold", true);
  sheet.range(`G2:G${rowLimit}`).dataValidation({
    type: "list",
    allowBlank: true,
    formula1: "No Response,Rejected,Interview,Offer,Other"
  });
  sheet.range(`H2:H${rowLimit}`).dataValidation({
    type: "list",
    allowBlank: true,
    formula1: "Screen,Technical,HR,Onsite,Final,Other"
  });

  const buffer = Buffer.from(await workbook.outputAsync() as Uint8Array);
  const storagePath = `exports/${userId}/${month}/job-tracker-export.xlsx`;
  const file = adminStorage.bucket().file(storagePath);

  await file.save(buffer, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    metadata: {
      cacheControl: "private, max-age=0, no-cache"
    }
  });

  const [fileUrl] = await file.getSignedUrl({
    action: "read",
    expires: "2100-01-01"
  });

  const exportId = `monthly_${sha256(`${userId}:${month}`).slice(0, 20)}`;

  await Promise.all([
    adminDb.collection("monthlyExports").doc(exportId).set(
      {
        userId,
        month,
        storagePath,
        fileUrl,
        createdAt: new Date()
      },
      { merge: true }
    ),
    adminDb.collection("documents").add({
      userId,
      jobId: null,
      type: "export",
      storagePath,
      fileUrl,
      uploadedAt: new Date()
    }),
    writeNotification({
      userId,
      type: "export_ready",
      title: "Monthly export ready",
      body: `YMCA export generated for ${month}.`,
      linkUrl: "/admin/job-tracker/exports"
    }),
    writeAuditLog({
      userId,
      action: "export_monthly",
      targetType: "monthlyExports",
      targetId: exportId,
      summary: `Generated monthly job export for ${month}`,
      metadata: {
        storagePath,
        rows: jobs.length
      }
    })
  ]);

  return {
    exportId,
    fileUrl,
    month
  };
});
