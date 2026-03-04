import { onRequest } from "firebase-functions/v2/https";

import { adminAuth, adminDb } from "../lib/admin";
import { writeAuditLog } from "./store";

function bearerToken(header: string | undefined) {
  if (!header) return "";
  const value = header.trim();
  if (!value.toLowerCase().startsWith("bearer ")) return "";
  return value.slice(7).trim();
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const redirectTrackCompanyVisit = onRequest(async (request, response) => {
  const companyId = String(request.query.companyId ?? "").trim();
  if (!companyId) {
    response.status(400).json({ error: "Missing companyId" });
    return;
  }

  const idToken = bearerToken(request.headers.authorization);
  if (!idToken) {
    response.status(401).json({ error: "Missing bearer token" });
    return;
  }

  let uid = "";
  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    uid = decoded.uid;
  } catch {
    response.status(401).json({ error: "Invalid bearer token" });
    return;
  }

  const companyRef = adminDb.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    response.status(404).json({ error: "Company not found" });
    return;
  }

  const companyData = companySnap.data() ?? {};
  if (String(companyData.userId ?? "") !== uid) {
    response.status(403).json({ error: "Forbidden" });
    return;
  }

  const careerPageUrl = String(companyData.careerPageUrl ?? "").trim();
  if (!isValidHttpUrl(careerPageUrl)) {
    response.status(400).json({ error: "Invalid careerPageUrl" });
    return;
  }

  const source = request.query.source === "open_button" ? "open_button" : "redirect";
  const now = new Date();

  await Promise.all([
    adminDb.collection("companyVisits").add({
      userId: uid,
      companyId,
      visitedAt: now,
      source
    }),
    companyRef.set(
      {
        lastCheckedAt: now,
        updatedAt: now
      },
      { merge: true }
    ),
    writeAuditLog({
      userId: uid,
      action: "company_redirect_visit",
      targetType: "companies",
      targetId: companyId,
      summary: `Career page opened for ${companyId}`,
      metadata: {
        source
      }
    })
  ]);

  response.redirect(careerPageUrl);
});
