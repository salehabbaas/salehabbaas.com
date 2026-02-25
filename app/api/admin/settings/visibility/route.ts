import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { getPageVisibilitySettings, savePageVisibilitySettings } from "@/lib/firestore/admin-settings";
import type { PublicPagePath } from "@/types/site-settings";

const visibilityKeys = [
  "/",
  "/about",
  "/ai-news",
  "/experience",
  "/projects",
  "/services",
  "/certificates",
  "/blog",
  "/creator",
  "/public-statement",
  "/book-meeting",
  "/contact"
] as const satisfies readonly PublicPagePath[];

const bodySchema = z
  .object({
    "/": z.boolean().optional(),
    "/about": z.boolean().optional(),
    "/ai-news": z.boolean().optional(),
    "/experience": z.boolean().optional(),
    "/projects": z.boolean().optional(),
    "/services": z.boolean().optional(),
    "/certificates": z.boolean().optional(),
    "/blog": z.boolean().optional(),
    "/creator": z.boolean().optional(),
    "/public-statement": z.boolean().optional(),
    "/book-meeting": z.boolean().optional(),
    "/contact": z.boolean().optional()
  })
  .partial();

export async function GET() {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const visibility = await getPageVisibilitySettings();
  return NextResponse.json({ visibility });
}

export async function PUT(request: Request) {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestContext = getAdminRequestContext(request);

  try {
    const body = bodySchema.parse(await request.json());
    const hasAny = visibilityKeys.some((key) => typeof body[key] === "boolean");
    if (!hasAny) {
      return NextResponse.json({ error: "No visibility values provided" }, { status: 400 });
    }

    await savePageVisibilitySettings(body);

    await writeAdminAuditLog(
      {
        module: "settings",
        action: "update_visibility",
        targetType: "siteContent",
        targetId: "pageVisibility",
        summary: "Updated page visibility controls",
        metadata: {
          changed: Object.keys(body)
        }
      },
      user,
      requestContext
    );

    const visibility = await getPageVisibilitySettings();
    return NextResponse.json({ success: true, visibility });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save visibility";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
