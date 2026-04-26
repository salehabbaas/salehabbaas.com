import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(10),
  platform: z.enum(["ios", "android", "web"]),
  bundleId: z.string().min(2),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = schema.parse(body);

    const existing = await adminDb
      .collection("mobileDevices")
      .where("token", "==", payload.token)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      await doc.ref.set(
        {
          platform: payload.platform,
          bundleId: payload.bundleId,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
      return NextResponse.json({ success: true, deviceId: doc.id });
    }

    const ref = await adminDb.collection("mobileDevices").add({
      token: payload.token,
      platform: payload.platform,
      bundleId: payload.bundleId,
      enabled: true,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, deviceId: ref.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register device";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
