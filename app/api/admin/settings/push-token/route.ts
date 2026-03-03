import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";

const schema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["ios"]).default("ios"),
  appVersion: z.string().trim().max(80).optional(),
  deviceId: z.string().trim().max(200).optional()
});

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const tokenHash = createHash("sha256").update(body.token).digest("hex");
    const now = new Date();

    await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("deviceTokens")
      .doc(tokenHash)
      .set(
        {
          token: body.token,
          tokenHash,
          platform: body.platform,
          appVersion: body.appVersion ?? "",
          deviceId: body.deviceId ?? "",
          updatedAt: now,
          createdAt: now
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register push token";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
