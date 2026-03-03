import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getAdminSystemsSummary } from "@/lib/firestore/admin-systems-dashboard";

const API_VERSION = "2026-03-01";

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "dashboard" });
  if (!user) return NextResponse.json({ error: "Unauthorized", apiVersion: API_VERSION }, { status: 401 });

  const summary = await getAdminSystemsSummary();
  return NextResponse.json({ summary, apiVersion: API_VERSION });
}
