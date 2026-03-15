import { tmpdir } from "node:os";
import { join, basename, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";

import cors from "cors";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentWrittenWithAuthContext } from "firebase-functions/v2/firestore";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import sharp from "sharp";

import { adminAuth, adminDb, adminStorage } from "./lib/admin";
import { createCalendarEvent } from "./lib/booking/google-calendar";
import { getEmailAdapter } from "./lib/email/service";
import { renderConfiguredEmailTemplate } from "./lib/email/templates";

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10
});

const corsHandler = cors({ origin: true });

async function sendTemplatedEmailSafe(input: {
  to: string;
  templateId: Parameters<typeof renderConfiguredEmailTemplate>[0];
  variables: Record<string, unknown>;
  trigger: string;
}) {
  try {
    const [adapter, rendered] = await Promise.all([getEmailAdapter(), renderConfiguredEmailTemplate(input.templateId, input.variables)]);
    await adapter.send({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      activity: {
        module: String(input.variables.moduleName ?? "System"),
        templateId: input.templateId,
        trigger: input.trigger
      }
    });
  } catch (error) {
    logger.error("Templated email send failed", error);
  }
}

const TRACKED_COLLECTIONS = new Set([
  "siteContent",
  "projects",
  "blogPosts",
  "contentItems",
  "experiences",
  "services",
  "certificates",
  "socialLinks",
  "mediaAssets",
  "bookings",
  "blockedSlots",
  "bookingSettings",
  "boards",
  "tasks",
  "activity",
  "jobApplications",
  "jobTrackerSettings",
  "creatorSettings",
  "creatorTemplates",
  "hookLibrary",
  "ctaLibrary",
  "linkedinStudioProfiles",
  "linkedinStudioPosts",
  "siteFeatureFlags"
]);
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "salehabbaas";

function normalizeValue(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function detectChangedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];

  keys.forEach((key) => {
    const beforeValue = normalizeValue(before[key]);
    const afterValue = normalizeValue(after[key]);
    if (beforeValue !== afterValue) {
      changed.push(key);
    }
  });

  return changed.sort().slice(0, 24);
}

function inferAction(beforeExists: boolean, afterExists: boolean) {
  if (!beforeExists && afterExists) return "create";
  if (beforeExists && !afterExists) return "delete";
  return "update";
}

async function writeTriggerAuditLog(input: {
  module: string;
  action: "create" | "update" | "delete";
  targetType: string;
  targetId: string;
  summary: string;
  metadata: Record<string, unknown>;
  authType: string;
  authId?: string;
}) {
  const actorEmail = input.authId && input.authId.includes("@") ? input.authId : "";
  await adminDb.collection("auditLogs").add({
    module: input.module,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    summary: input.summary,
    metadata: {
      ...input.metadata,
      source: "firestore-trigger",
      authType: input.authType,
      authId: input.authId ?? ""
    },
    actorUid: input.authId ?? `trigger:${input.authType}`,
    actorEmail,
    createdAt: new Date()
  });
}

export const submitContact = onRequest(async (request, response) => {
  return corsHandler(request, response, async () => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { name, email, subject, message } = request.body ?? {};
    if (!name || !email || !subject || !message) {
      response.status(400).json({ error: "Missing fields" });
      return;
    }

    await adminDb.collection("contactSubmissions").add({
      name,
      email,
      subject,
      message,
      source: "cloud_function",
      createdAt: new Date()
    });

    await sendTemplatedEmailSafe({
      to: process.env.CONTACT_RECEIVER_EMAIL || email,
      templateId: "contactSubmission",
      trigger: "contact_submission",
      variables: {
        moduleName: "Contact",
        primaryActionLabel: "Open System Inbox",
        primaryActionUrl: "/admin/system-inbox",
        quickLinks: [
          { label: "System Inbox", url: "/admin/system-inbox" },
          { label: "Projects", url: "/admin/projects" },
          { label: "Reminders", url: "/admin/settings/reminders" },
          { label: "Bookings", url: "/admin/bookings" }
        ],
        name,
        email,
        subject,
        message
      }
    });

    response.status(200).json({ success: true });
  });
});

export const bookMeeting = onRequest(async (request, response) => {
  return corsHandler(request, response, async () => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { bookingId, name, email, reason, timezone, meetingTypeLabel, startAt, endAt } = request.body ?? {};
    if (!bookingId || !name || !email || !startAt || !endAt) {
      response.status(400).json({ error: "Missing booking payload fields." });
      return;
    }

    try {
      const event = await createCalendarEvent({
        summary: `${meetingTypeLabel || "Meeting"} with ${name}`,
        description: `${reason || "No reason provided"}\n\nBooked via salehabbaas.com`,
        startAt,
        endAt,
        timezone: timezone || "UTC",
        attendeeEmail: email
      });

      await adminDb.collection("bookings").doc(String(bookingId)).set(
        {
          googleMeetLink: event.meetLink,
          calendarEventId: event.eventId,
          status: "confirmed",
          updatedAt: new Date()
        },
        { merge: true }
      );

      const ownerEmail = process.env.CONTACT_RECEIVER_EMAIL || process.env.DEFAULT_SENDER_EMAIL || email;

      await Promise.all([
        sendTemplatedEmailSafe({
          to: email,
          templateId: "bookingConfirmation",
          trigger: "booking_confirmation",
          variables: {
            moduleName: "Bookings",
            primaryActionLabel: event.meetLink ? "Open Meet Link" : "Book Another Meeting",
            primaryActionUrl: event.meetLink || "/book-meeting",
            quickLinks: [
              { label: "Book Meeting", url: "/book-meeting" },
              { label: "Contact", url: "/contact" },
              { label: "Website", url: "/" }
            ],
            name,
            meetingType: meetingTypeLabel || "Meeting",
            startAt,
            timezone,
            meetLink: event.meetLink || "Will be shared shortly."
          }
        }),
        sendTemplatedEmailSafe({
          to: ownerEmail,
          templateId: "bookingOwnerNotification",
          trigger: "booking_owner_notification",
          variables: {
            moduleName: "Bookings",
            primaryActionLabel: "Open Bookings",
            primaryActionUrl: "/admin/bookings",
            quickLinks: [
              { label: "Bookings", url: "/admin/bookings" },
              { label: "System Inbox", url: "/admin/system-inbox" },
              { label: "Reminders", url: "/admin/settings/reminders" }
            ],
            meetingType: meetingTypeLabel || "Meeting",
            startAt,
            timezone,
            name,
            email,
            reason: reason || "-",
            meetLink: event.meetLink || "-"
          }
        })
      ]);

      response.status(200).json({ success: true, meetLink: event.meetLink });
    } catch (error) {
      logger.error("bookMeeting error", error);
      response.status(500).json({ error: error instanceof Error ? error.message : "Booking failed" });
    }
  });
});

export const optimizeCreatorMedia = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  const bucketName = event.data.bucket;

  if (!filePath || !bucketName) return;
  if (!filePath.startsWith("creator/") || filePath.endsWith("-optimized.webp")) return;

  const bucket = adminStorage.bucket(bucketName);
  const file = bucket.file(filePath);
  const [buffer] = await file.download();

  const optimized = await sharp(buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();

  const optimizedPath = join(dirname(filePath), `${basename(filePath).split(".")[0]}-optimized.webp`);
  const tmpPath = join(tmpdir(), `${randomUUID()}.webp`);
  writeFileSync(tmpPath, optimized);

  await bucket.upload(tmpPath, {
    destination: optimizedPath,
    metadata: {
      contentType: "image/webp",
      metadata: {
        optimized: "true"
      }
    }
  });

  unlinkSync(tmpPath);
  logger.info("Optimized creator media", { source: filePath, destination: optimizedPath });
});

export const sendCreatorScheduleReminders = onSchedule("every 24 hours", async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const snap = await adminDb
    .collectionGroup("variants")
    .where("visibility", "in", ["public", "unlisted", "private"])
    .orderBy("publishedAt", "desc")
    .get();

  const dueDocs = snap.docs.filter((doc) => {
    const value = doc.data().scheduledAt;
    if (!value) return false;

    const scheduledAt =
      value instanceof Date
        ? value
        : typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function"
          ? value.toDate()
          : null;

    if (!scheduledAt) return false;
    return scheduledAt >= now && scheduledAt <= in24h;
  });

  if (!dueDocs.length) {
    logger.info("No creator reminders due.");
    return;
  }

  const batch = adminDb.batch();

  dueDocs.forEach((doc) => {
    const reminderRef = adminDb.collection("creatorReminders").doc();
    batch.set(reminderRef, {
      variantPath: doc.ref.path,
      slug: doc.data().slug ?? "",
      platform: doc.data().platform ?? "",
      scheduledAt: doc.data().scheduledAt ?? null,
      createdAt: new Date()
    });
  });

  await batch.commit();
  logger.info(`Created ${dueDocs.length} creator reminder documents.`);
});

export const auditTrackedCollectionWrites = onDocumentWrittenWithAuthContext(
  {
    document: "{collectionId}/{docId}",
    database: FIRESTORE_DATABASE_ID
  },
  async (event) => {
    const collectionId = event.params.collectionId;
    const docId = event.params.docId;

    if (!collectionId || !docId || !TRACKED_COLLECTIONS.has(collectionId)) {
      return;
    }

    const change = event.data;
    if (!change) return;

    const beforeExists = change.before.exists;
    const afterExists = change.after.exists;
    const action = inferAction(beforeExists, afterExists);
    const beforeData = beforeExists ? ((change.before.data() ?? {}) as Record<string, unknown>) : {};
    const afterData = afterExists ? ((change.after.data() ?? {}) as Record<string, unknown>) : {};

    const changedFields =
      beforeExists && afterExists
        ? detectChangedFields(beforeData, afterData)
        : Object.keys(afterExists ? afterData : beforeData).slice(0, 24);

    if (action === "update" && changedFields.length === 1 && changedFields[0] === "updatedAt") {
      return;
    }

    await writeTriggerAuditLog({
      module: collectionId,
      action,
      targetType: collectionId,
      targetId: docId,
      summary: `${action.toUpperCase()} ${collectionId}/${docId}`,
      metadata: {
        path: event.document,
        changedFields
      },
      authType: event.authType,
      authId: event.authId
    });
  }
);

export const auditCreatorVariantWrites = onDocumentWrittenWithAuthContext(
  {
    document: "contentItems/{contentItemId}/variants/{variantId}",
    database: FIRESTORE_DATABASE_ID
  },
  async (event) => {
    const contentItemId = event.params.contentItemId;
    const variantId = event.params.variantId;
    if (!contentItemId || !variantId) return;

    const change = event.data;
    if (!change) return;

    const beforeExists = change.before.exists;
    const afterExists = change.after.exists;
    const action = inferAction(beforeExists, afterExists);
    const beforeData = beforeExists ? ((change.before.data() ?? {}) as Record<string, unknown>) : {};
    const afterData = afterExists ? ((change.after.data() ?? {}) as Record<string, unknown>) : {};

    const changedFields =
      beforeExists && afterExists
        ? detectChangedFields(beforeData, afterData)
        : Object.keys(afterExists ? afterData : beforeData).slice(0, 24);

    if (action === "update" && changedFields.length === 1 && changedFields[0] === "updatedAt") {
      return;
    }

    await writeTriggerAuditLog({
      module: "creator-variants",
      action,
      targetType: "contentVariant",
      targetId: variantId,
      summary: `${action.toUpperCase()} content variant ${variantId}`,
      metadata: {
        path: event.document,
        contentItemId,
        changedFields
      },
      authType: event.authType,
      authId: event.authId
    });
  }
);

export const revalidateCreatorCache = onCall(async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const endpoint = process.env.NEXT_REVALIDATE_ENDPOINT;
  const secret = process.env.REVALIDATE_SECRET;

  if (!endpoint || !secret) {
    throw new HttpsError("failed-precondition", "Revalidate environment variables are missing.");
  }

  const paths = Array.isArray(request.data?.paths) && request.data.paths.length ? request.data.paths : ["/", "/creator"];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-revalidate-secret": secret
    },
    body: JSON.stringify({ paths })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new HttpsError("internal", `Revalidate call failed: ${body}`);
  }

  return { success: true, paths };
});

export const setAdminClaim = onCall(async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Only admins can grant admin claims.");
  }

  const uid = request.data?.uid as string | undefined;
  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  await adminAuth.setCustomUserClaims(uid, { admin: true });
  return { success: true, uid };
});

export const bootstrapAdminClaim = onRequest(async (request, response) => {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret || request.query.secret !== secret) {
    response.status(403).json({ error: "Forbidden" });
    return;
  }

  const uid = String(request.query.uid ?? "");
  if (!uid) {
    response.status(400).json({ error: "Missing uid" });
    return;
  }

  await adminAuth.setCustomUserClaims(uid, { admin: true });
  response.status(200).json({ success: true, uid });
});

export { taskReminderSweep } from "./scheduled/taskReminders";
export { unifiedReminderSweep } from "./scheduled/unifiedReminders";
export { goalsDailyBriefScheduler, goalsWeeklyPlanningScheduler, goalsWrapUpScheduler } from "./scheduled/goalsPlanner";
export { auditNotificationsOnCreate } from "./triggers/auditNotifications";
export { aiExtractFromInput, classifyEmail, exportMonthlyXlsx, redirectTrackCompanyVisit, scheduledTaskReminders, scheduledCompanyWatchScan } from "./job-tracker";
