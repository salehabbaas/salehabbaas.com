import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getControlCenterSummary } from "@/lib/firestore/control-center";

const API_VERSION = "2026-03-01";

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "dashboard" });
  if (!user) return NextResponse.json({ error: "Unauthorized", apiVersion: API_VERSION }, { status: 401 });

  const summary = await getControlCenterSummary();
  return NextResponse.json({ summary, apiVersion: API_VERSION });
}
