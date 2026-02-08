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

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10
});

const corsHandler = cors({ origin: true });

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

    response.status(200).json({ success: true });
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
    .where("scheduledAt", ">=", now)
    .where("scheduledAt", "<=", in24h)
    .where("visibility", "in", ["public", "unlisted", "private"])
    .get();

  if (snap.empty) {
    logger.info("No creator reminders due.");
    return;
  }

  const batch = adminDb.batch();

  snap.docs.forEach((doc) => {
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
  logger.info(`Created ${snap.size} creator reminder documents.`);
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
