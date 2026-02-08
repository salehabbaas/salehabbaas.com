import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";

const eventSchema = z.object({
  name: z.enum([
    "page_view",
    "view_creator_item",
    "click_external_post",
    "download_resume",
    "contact_submit",
    "book_meeting",
    "social_click",
    "subscribe_newsletter"
  ]),
  path: z.string().optional(),
  slug: z.string().optional(),
  platform: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = eventSchema.parse(body);

    await adminDb.collection("analyticsEvents").add({
      ...payload,
      createdAt: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid analytics event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
