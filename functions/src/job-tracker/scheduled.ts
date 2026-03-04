import { onSchedule } from "firebase-functions/v2/scheduler";

import { adminAuth, adminDb } from "../lib/admin";
import { getEmailAdapter } from "../lib/email/service";
import { writeAuditLog, writeNotification } from "./store";
import { sha256, toIso, validHttpUrl } from "./utils";

function parseDate(value: unknown) {
  const iso = toIso(value);
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

async function resolveUserEmail(userId: string) {
  const userDoc = await adminDb.collection("users").doc(userId).get();
  const firestoreEmail = String(userDoc.data()?.email ?? "").trim();
  if (firestoreEmail) return firestoreEmail;

  try {
    const authUser = await adminAuth.getUser(userId);
    return authUser.email || "";
  } catch {
    return "";
  }
}

export const scheduledTaskReminders = onSchedule("every 5 minutes", async () => {
  const now = new Date();
  const adapter = await getEmailAdapter();

  const tasksSnap = await adminDb.collection("tasks").where("isCompleted", "==", false).get();
  const candidates = tasksSnap.docs.filter((entry) => {
    const data = entry.data();
    const reminderSentAt = data.reminderSentAt;
    if (reminderSentAt) return false;

    const reminderAt = parseDate(data.reminderAt);
    if (!reminderAt) return false;

    return reminderAt.getTime() <= now.getTime();
  });

  for (const taskDoc of candidates) {
    const data = taskDoc.data();
    const userId = String(data.userId ?? "");
    const jobId = String(data.jobId ?? "");
    const taskTitle = String(data.title ?? "Follow up");

    if (!userId || !jobId) continue;

    const [jobSnap, email] = await Promise.all([
      adminDb.collection("jobs").doc(jobId).get(),
      resolveUserEmail(userId)
    ]);

    const jobData = jobSnap.data() ?? {};
    const companyId = String(jobData.companyId ?? "");

    let companyName = "";
    if (companyId) {
      const companySnap = await adminDb.collection("companies").doc(companyId).get();
      companyName = String(companySnap.data()?.name ?? "");
    }

    const roleTitle = String(jobData.roleTitle ?? "Job");

    if (email) {
      try {
        await adapter.send({
          to: email,
          subject: `Job Tracker Reminder: ${taskTitle}`,
          html: `<p>${taskTitle}</p><p>${companyName || "Company"} - ${roleTitle}</p><p>Open: /admin/job-tracker/jobs</p>`,
          text: `${taskTitle}\n${companyName || "Company"} - ${roleTitle}\nOpen /admin/job-tracker/jobs`
        });
      } catch {
        // Continue with in-app reminders even when email fails.
      }
    }

    await Promise.all([
      taskDoc.ref.set(
        {
          reminderSentAt: now,
          updatedAt: now
        },
        { merge: true }
      ),
      writeNotification({
        userId,
        type: "task_reminder",
        title: "Task reminder",
        body: `${taskTitle} (${companyName || "Company"} - ${roleTitle})`,
        linkUrl: "/admin/job-tracker/jobs"
      }),
      writeAuditLog({
        userId,
        action: "task_reminder_sent",
        targetType: "tasks",
        targetId: taskDoc.id,
        summary: `Reminder sent for task ${taskDoc.id}`,
        metadata: {
          emailSent: Boolean(email)
        }
      })
    ]);
  }
});

function extractJobLikeLinks(html: string, baseUrl: string) {
  const matches = [...html.matchAll(/href=["']([^"']+)["']/gi)];
  const keywords = ["/job", "/jobs", "/careers", "/positions", "greenhouse", "lever", "workday", "taleo"];

  const links = new Set<string>();

  matches.forEach((match) => {
    const raw = (match[1] ?? "").trim();
    if (!raw) return;
    if (raw.startsWith("mailto:") || raw.startsWith("javascript:")) return;

    let absolute = "";
    try {
      absolute = new URL(raw, baseUrl).toString();
    } catch {
      return;
    }

    const lower = absolute.toLowerCase();
    if (!keywords.some((keyword) => lower.includes(keyword))) {
      return;
    }

    links.add(absolute);
  });

  return [...links];
}

function shouldScanCompany(input: { frequency: string; lastScanAt: Date | null; now: Date }) {
  if (!input.lastScanAt) return true;

  const elapsedHours = (input.now.getTime() - input.lastScanAt.getTime()) / (1000 * 60 * 60);
  if (input.frequency === "twiceDaily") return elapsedHours >= 12;
  if (input.frequency === "weekly") return elapsedHours >= 24 * 7;
  return elapsedHours >= 24;
}

async function fetchCareerPage(url: string) {
  if (!validHttpUrl(url)) return "";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

export const scheduledCompanyWatchScan = onSchedule("every 12 hours", async () => {
  const now = new Date();
  const companiesSnap = await adminDb.collection("companies").where("watchEnabled", "==", true).get();

  for (const companyDoc of companiesSnap.docs) {
    const data = companyDoc.data();
    const userId = String(data.userId ?? "");
    const companyId = companyDoc.id;
    const companyName = String(data.name ?? "Company");
    const careerPageUrl = String(data.careerPageUrl ?? "");
    const watchFrequency = String(data.watchFrequency ?? "daily");
    const lastScanAt = parseDate(data.lastScanAt);

    if (!userId || !careerPageUrl) continue;
    if (!shouldScanCompany({ frequency: watchFrequency, lastScanAt, now })) continue;

    const html = await fetchCareerPage(careerPageUrl);
    if (!html) {
      await companyDoc.ref.set(
        {
          lastScanAt: now,
          updatedAt: now
        },
        { merge: true }
      );
      continue;
    }

    const discoveredLinks = extractJobLikeLinks(html, careerPageUrl);
    const snapshotsSnap = await adminDb.collection("companyJobSnapshots").where("companyId", "==", companyId).get();

    const existingByKey = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    snapshotsSnap.docs.forEach((entry) => {
      const snapshotUserId = String(entry.data().userId ?? "");
      if (snapshotUserId !== userId) return;
      existingByKey.set(String(entry.data().externalJobKey ?? ""), entry);
    });

    const newLinks: string[] = [];

    for (const link of discoveredLinks) {
      const key = sha256(link);
      const existing = existingByKey.get(key);

      if (existing) {
        await existing.ref.set(
          {
            lastSeenAt: now
          },
          { merge: true }
        );
        continue;
      }

      newLinks.push(link);
      await adminDb.collection("companyJobSnapshots").add({
        userId,
        companyId,
        externalJobKey: key,
        jobUrl: link,
        title: "",
        firstSeenAt: now,
        lastSeenAt: now
      });
    }

    await companyDoc.ref.set(
      {
        lastScanAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    if (newLinks.length > 0) {
      await Promise.all([
        writeNotification({
          userId,
          type: "new_job_found",
          title: `New jobs detected at ${companyName}`,
          body: `${newLinks.length} new job link(s) found during watch scan.`,
          linkUrl: "/admin/job-tracker/companies"
        }),
        writeAuditLog({
          userId,
          action: "watch_scan_new_jobs",
          targetType: "companies",
          targetId: companyId,
          summary: `Watch scan found ${newLinks.length} new links for ${companyName}`,
          metadata: {
            links: newLinks.slice(0, 10)
          }
        })
      ]);
    }
  }
});
