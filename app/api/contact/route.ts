import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getRuntimeAdminSettings } from "@/lib/firestore/admin-settings";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(2),
  message: z.string().min(10)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = contactSchema.parse(body);
    const runtime = await getRuntimeAdminSettings();
    const contactFunctionUrl = runtime.integrations.contactFunctionUrl || process.env.CONTACT_FUNCTION_URL || "";

    if (contactFunctionUrl) {
      const response = await fetch(contactFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Cloud Function contact submit failed.");
      }
      return NextResponse.json({ success: true, source: "function" });
    }

    await adminDb.collection("contactSubmissions").add({
      ...payload,
      createdAt: new Date(),
      source: "website"
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
