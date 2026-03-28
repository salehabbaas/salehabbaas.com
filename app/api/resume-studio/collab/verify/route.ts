import { NextRequest, NextResponse } from "next/server";

import { verifyCollabToken } from "@/lib/resume-studio/collaboration";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: string };
    if (!body.token) return NextResponse.json({ error: "Token is required." }, { status: 400 });
    const payload = verifyCollabToken(body.token);
    if (!payload) return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    return NextResponse.json({ success: true, payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify collaboration token";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
