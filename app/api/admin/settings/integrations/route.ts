import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminHealthStatus } from "@/lib/admin/health";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import {
  getAdminIntegrationSettings,
  getAdminSecretPresence,
  saveAdminIntegrationSettings,
  saveAdminSecretSettings
} from "@/lib/firestore/admin-settings";

const integrationPatchSchema = z
  .object({
    emailProvider: z.enum(["sendgrid", "resend", "mailgun", "zoho"]).optional(),
    senderEmail: z.string().optional(),
    senderName: z.string().optional(),
    contactFunctionUrl: z.string().optional(),
    bookingFunctionUrl: z.string().optional(),
    googleCalendarId: z.string().optional(),
    geminiModel: z.string().optional(),
    geminiTextModel: z.string().optional()
  })
  .partial();

const secretPatchSchema = z
  .object({
    resendApiKey: z.string().optional(),
    sendgridApiKey: z.string().optional(),
    mailgunApiKey: z.string().optional(),
    mailgunDomain: z.string().optional(),
    googleServiceAccountEmail: z.string().optional(),
    googleServiceAccountPrivateKey: z.string().optional(),
    geminiApiKey: z.string().optional(),
    googleApiKey: z.string().optional()
  })
  .partial();

const bodySchema = z.object({
  integrations: integrationPatchSchema.optional(),
  secrets: secretPatchSchema.optional()
});

export async function GET() {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [integrations, secretPresence, health] = await Promise.all([
    getAdminIntegrationSettings(),
    getAdminSecretPresence(),
    getAdminHealthStatus()
  ]);

  return NextResponse.json({
    integrations,
    secretPresence,
    health
  });
}

export async function PUT(request: Request) {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestContext = getAdminRequestContext(request);

  try {
    const body = bodySchema.parse(await request.json());
    if (!body.integrations && !body.secrets) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await Promise.all([
      body.integrations ? saveAdminIntegrationSettings(body.integrations) : Promise.resolve(),
      body.secrets ? saveAdminSecretSettings(body.secrets) : Promise.resolve()
    ]);

    await writeAdminAuditLog(
      {
        module: "settings",
        action: "update_integrations",
        targetType: "adminSettings",
        targetId: "integrations+secrets",
        summary: "Updated integration and secret settings",
        metadata: {
          integrationKeys: Object.keys(body.integrations ?? {}),
          secretKeys: Object.keys(body.secrets ?? {})
        }
      },
      user,
      requestContext
    );

    const [integrations, secretPresence, health] = await Promise.all([
      getAdminIntegrationSettings(),
      getAdminSecretPresence(),
      getAdminHealthStatus()
    ]);

    return NextResponse.json({
      success: true,
      integrations,
      secretPresence,
      health
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
