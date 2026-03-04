import ExcelJS from "exceljs";
import { onCall } from "firebase-functions/v2/https";

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

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("YMCA Job Tracker");

  worksheet.columns = YMCA_HEADERS.map((header) => ({ header, key: header, width: 28 }));

  jobs.forEach((job) => {
    const interview = interviewsByJob.get(String(job.id));
    const contact = interview?.interviewer || "";
    const applicationDate = job.applicationDate ? new Date(job.applicationDate) : null;
    const formattedDate = applicationDate && !Number.isNaN(applicationDate.getTime()) ? formatDdMmYy(applicationDate) : "";

    worksheet.addRow({
      [YMCA_HEADERS[0]]: companyNameById.get(job.companyId) || "",
      [YMCA_HEADERS[1]]: job.roleTitle,
      [YMCA_HEADERS[2]]: job.salaryRateText,
      [YMCA_HEADERS[3]]: job.jobUrl,
      [YMCA_HEADERS[4]]: formattedDate,
      [YMCA_HEADERS[5]]: contact,
      [YMCA_HEADERS[6]]: mapResponse(job.status),
      [YMCA_HEADERS[7]]: interview?.stage || "",
      [YMCA_HEADERS[8]]: formatInterviewSummary(interview),
      [YMCA_HEADERS[9]]: mapOffer(job.status)
    });
  });

  const rowLimit = Math.max(worksheet.rowCount + 50, 100);
  for (let row = 2; row <= rowLimit; row += 1) {
    worksheet.getCell(`G${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"No Response,Rejected,Interview,Offer,Other"']
    };

    worksheet.getCell(`H${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Screen,Technical,HR,Onsite,Final,Other"']
    };
  }

  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const storagePath = `exports/${userId}/${month}/job-tracker-export.xlsx`;
  const file = adminStorage.bucket().file(storagePath);

  await file.save(Buffer.from(buffer), {
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
