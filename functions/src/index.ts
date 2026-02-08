import { tmpdir } from "node:os";
import { join, basename, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";

import cors from "cors";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import sharp from "sharp";

import { adminAuth, adminDb, adminStorage } from "./lib/admin";
import { createCalendarEvent } from "./lib/booking/google-calendar";
import { getEmailAdapter } from "./lib/email/service";

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10
});

const corsHandler = cors({ origin: true });

async function sendEmailSafe(input: { to: string; subject: string; html: string; text?: string }) {
  try {
    const adapter = await getEmailAdapter();
    await adapter.send(input);
  } catch (error) {
    logger.error("Email send failed", error);
  }
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

    await sendEmailSafe({
      to: process.env.CONTACT_RECEIVER_EMAIL || email,
      subject: `New Contact Submission: ${subject}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p>${message}</p>`
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
        sendEmailSafe({
          to: email,
          subject: "Your meeting with Saleh Abbaas is confirmed",
          html: `<p>Hi ${name},</p><p>Your meeting is confirmed for ${startAt} (${timezone}).</p><p>Meet link: ${
            event.meetLink || "Will be shared shortly."
          }</p>`
        }),
        sendEmailSafe({
          to: ownerEmail,
          subject: `New Booking: ${name}`,
          html: `<p><strong>Meeting:</strong> ${meetingTypeLabel || "Meeting"}</p><p><strong>When:</strong> ${startAt} (${timezone})</p><p><strong>Email:</strong> ${email}</p><p><strong>Reason:</strong> ${reason || "-"}</p><p><strong>Meet:</strong> ${
            event.meetLink || "-"
          }</p>`
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
