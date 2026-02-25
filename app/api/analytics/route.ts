import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

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
  platform: z.string().optional(),
  source: z.string().optional(),
  referrer: z.string().optional(),
  sessionId: z.string().optional(),
  deviceType: z.enum(["mobile", "desktop", "tablet", "bot", "unknown"]).optional(),
  userAgent: z.string().optional()
});

function deriveDeviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (!ua) return "unknown";
  if (/bot|crawler|spider|headless/i.test(ua)) return "bot";
  if (/ipad|tablet|kindle/i.test(ua)) return "tablet";
  if (/iphone|android.+mobile|mobile/i.test(ua)) return "mobile";
  return "desktop";
}

function deriveBrowser(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (!ua) return "unknown";
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "opera";
  if (ua.includes("firefox/")) return "firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "safari";
  if (ua.includes("chrome/")) return "chrome";
  return "unknown";
}

function hashIp(ip: string) {
  if (!ip) return "";
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = eventSchema.parse(body);
    const headers = request.headers;

    const forwardedFor = headers.get("x-forwarded-for") || "";
    const ip = forwardedFor.split(",")[0]?.trim() || headers.get("x-real-ip") || "";
    const userAgent = (payload.userAgent || headers.get("user-agent") || "").slice(0, 280);
    const deviceType = payload.deviceType || deriveDeviceType(userAgent);
    const browser = deriveBrowser(userAgent);
    const country = headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || "";
    const city = headers.get("x-vercel-ip-city") || "";

    await adminDb.collection("analyticsEvents").add({
      ...payload,
      userAgent,
      deviceType,
      browser,
      ipHash: hashIp(ip),
      country,
      city,
      createdAt: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid analytics event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
