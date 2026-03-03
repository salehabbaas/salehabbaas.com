import { NextResponse } from "next/server";

import { getAdminHealthStatus } from "@/lib/admin/health";
import { verifyAdminRequest } from "@/lib/auth/admin-api";

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const health = await getAdminHealthStatus();
  return NextResponse.json(health);
}
