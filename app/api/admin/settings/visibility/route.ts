import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import {
  getPageVisibilitySettings,
  getPublicPageSettings,
  savePageVisibilitySettings,
  savePublicPageSettings
} from "@/lib/firestore/admin-settings";
import type { PublicPagePath, PublicPageSettingsItem } from "@/types/site-settings";

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

const fullSettingsSchema = z.object({
  pages: z.array(
    z.object({
      path: z.enum(visibilityKeys),
      enabled: z.boolean(),
      name: z.string().trim().min(1).max(90),
      description: z.string().trim().max(260),
      link: z.string().trim().min(1).max(360),
      menuOrder: z.number().int().min(0).max(1000),
      seoTitle: z.string().trim().max(140),
      seoDescription: z.string().trim().max(320),
      seoKeywords: z.string().trim().max(600),
      seoImage: z.string().trim().max(360)
    })
  )
});

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [visibility, pages] = await Promise.all([getPageVisibilitySettings(), getPublicPageSettings()]);
  return NextResponse.json({ visibility, pages });
}

export async function PUT(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestContext = getAdminRequestContext(request);

  try {
    const json = await request.json();
    const fullSettingsResult = fullSettingsSchema.safeParse(json);

    if (fullSettingsResult.success) {
      const existing = await getPublicPageSettings();
      const inputByPath = new Map(fullSettingsResult.data.pages.map((item) => [item.path, item] as const));
      const merged = existing.map((item) => {
        const update = inputByPath.get(item.path);
        return update
          ? ({
              path: update.path,
              enabled: update.enabled,
              name: update.name,
              description: update.description,
              link: update.link,
              menuOrder: update.menuOrder,
              seoTitle: update.seoTitle,
              seoDescription: update.seoDescription,
              seoKeywords: update.seoKeywords,
              seoImage: update.seoImage
            } satisfies PublicPageSettingsItem)
          : item;
      });

      await savePublicPageSettings(merged);

      await writeAdminAuditLog(
        {
          module: "settings",
          action: "update_visibility",
          targetType: "siteContent",
          targetId: "pageVisibility",
          summary: "Updated page visibility, menu, and SEO settings",
          metadata: {
            changed: Array.from(inputByPath.keys())
          }
        },
        user,
        requestContext
      );

      const [visibility, pages] = await Promise.all([getPageVisibilitySettings(), getPublicPageSettings()]);
      return NextResponse.json({ success: true, visibility, pages });
    }

    const body = bodySchema.parse(json);
    const hasAny = visibilityKeys.some((key) => typeof body[key] === "boolean");
    if (!hasAny) return NextResponse.json({ error: "No settings values provided" }, { status: 400 });

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

    const [visibility, pages] = await Promise.all([getPageVisibilitySettings(), getPublicPageSettings()]);
    return NextResponse.json({ success: true, visibility, pages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save visibility";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
