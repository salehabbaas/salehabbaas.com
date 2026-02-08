import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";

const schema = z.object({
  email: z.string().email()
});

function makeEmailKey(email: string) {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = schema.parse(body);
    const normalized = email.toLowerCase().trim();

    await adminDb.collection("newsletterSubscribers").doc(makeEmailKey(normalized)).set(
      {
        email: normalized,
        status: "pending",
        source: "creator",
        updatedAt: new Date(),
        createdAt: new Date()
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, status: "pending" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to subscribe";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
