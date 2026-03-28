import "server-only";

import crypto from "node:crypto";

import { adminDb } from "@/lib/firebase/admin";

const TOKEN_TTL_SECONDS = 60 * 30;

type CollabTokenPayload = {
  sub: string;
  docId: string;
  roomId: string;
  exp: number;
};

function getSecret() {
  return process.env.RESUME_COLLAB_SECRET || process.env.NEXTAUTH_SECRET || "resume-collab-dev-secret";
}

function encode(payload: CollabTokenPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decode(token: string): CollabTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  if (expected !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as CollabTokenPayload;
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildCollabRoomId(ownerId: string, docId: string) {
  return `resume:${ownerId}:${docId}`;
}

export function issueCollabToken(input: { userId: string; docId: string; roomId: string }) {
  const payload: CollabTokenPayload = {
    sub: input.userId,
    docId: input.docId,
    roomId: input.roomId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  return encode(payload);
}

export function verifyCollabToken(token: string) {
  return decode(token);
}

export async function upsertCollabSession(input: {
  ownerId: string;
  docId: string;
  roomId: string;
  activeUsers: number;
  lastActivityAt: string;
}) {
  const ref = adminDb.collection("resumeCollabSessions").doc(`${input.ownerId}_${input.docId}`);
  await ref.set(
    {
      ownerId: input.ownerId,
      docId: input.docId,
      roomId: input.roomId,
      activeUsers: input.activeUsers,
      lastActivityAt: input.lastActivityAt,
      updatedAt: new Date()
    },
    { merge: true }
  );
}

export async function createCommentThread(input: {
  ownerId: string;
  docId: string;
  sectionId?: string;
  anchor: string;
  body: string;
  authorId: string;
}) {
  const ref = adminDb.collection("resumeCollabComments").doc();
  await ref.set({
    ownerId: input.ownerId,
    docId: input.docId,
    sectionId: input.sectionId ?? null,
    anchor: input.anchor,
    body: input.body,
    authorId: input.authorId,
    status: "open",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return ref.id;
}

export async function createSuggestion(input: {
  ownerId: string;
  docId: string;
  sectionId?: string;
  from: string;
  to: string;
  authorId: string;
}) {
  const ref = adminDb.collection("resumeCollabSuggestions").doc();
  await ref.set({
    ownerId: input.ownerId,
    docId: input.docId,
    sectionId: input.sectionId ?? null,
    from: input.from,
    to: input.to,
    authorId: input.authorId,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return ref.id;
}

export async function reviewSuggestion(input: {
  suggestionId: string;
  ownerId: string;
  reviewerId: string;
  decision: "accepted" | "rejected";
}) {
  const ref = adminDb.collection("resumeCollabSuggestions").doc(input.suggestionId);
  await ref.set(
    {
      ownerId: input.ownerId,
      status: input.decision,
      reviewedBy: input.reviewerId,
      reviewedAt: new Date(),
      updatedAt: new Date()
    },
    { merge: true }
  );
}
