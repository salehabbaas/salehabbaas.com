import { NextResponse } from "next/server";
import { z } from "zod";
import type { AdminEmailTemplates } from "@/types/site-settings";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminHealthStatus } from "@/lib/admin/health";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import {
  getAdminEmailTemplates,
  getAdminIntegrationSettings,
  getAdminSecretPresence,
  getAdminSecretSources,
  saveAdminEmailTemplates,
  saveAdminIntegrationSettings,
  saveAdminSecretSettings
} from "@/lib/firestore/admin-settings";

const integrationPatchSchema = z
  .object({
    emailProvider: z.enum(["sendgrid", "resend", "mailgun", "zoho", "gmail"]).optional(),
    senderEmail: z.string().optional(),
    senderName: z.string().optional(),
    contactFunctionUrl: z.string().optional(),
    bookingFunctionUrl: z.string().optional(),
    googleCalendarId: z.string().optional(),
    geminiModel: z.string().optional(),
    geminiTextModel: z.string().optional(),
    telegramAllowedChatIds: z.string().optional(),
    telegramDefaultChatId: z.string().optional(),
    agentOwnerUid: z.string().optional(),
    telegramActionsEnabled: z.boolean().optional(),
    resumeStudioV2Enabled: z.boolean().optional(),
    resumeEditorV2Enabled: z.boolean().optional(),
    resumeAi53Enabled: z.boolean().optional(),
    resumeJobUrlParserEnabled: z.boolean().optional(),
    resumeAdvancedTemplateBuilderEnabled: z.boolean().optional()
  })
  .partial();

const secretPatchSchema = z
  .object({
    resendApiKey: z.string().optional(),
    sendgridApiKey: z.string().optional(),
    mailgunApiKey: z.string().optional(),
    mailgunDomain: z.string().optional(),
    gmailAppPassword: z.string().optional(),
    zohoSmtpHost: z.string().optional(),
    zohoSmtpPort: z.string().optional(),
    zohoSmtpSecure: z.string().optional(),
    zohoSmtpUsername: z.string().optional(),
    zohoSmtpPassword: z.string().optional(),
    googleServiceAccountEmail: z.string().optional(),
    googleServiceAccountPrivateKey: z.string().optional(),
    geminiApiKey: z.string().optional(),
    googleApiKey: z.string().optional(),
    telegramBotToken: z.string().optional(),
    telegramWebhookSecret: z.string().optional()
  })
  .partial();

const bodySchema = z.object({
  integrations: integrationPatchSchema.optional(),
  secrets: secretPatchSchema.optional(),
  emailTemplates: z
    .record(
      z.object({
        subject: z.string().optional(),
        html: z.string().optional(),
        text: z.string().optional()
      })
    )
    .optional()
});

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [integrations, secretPresence, secretSources, health, emailTemplates] = await Promise.all([
    getAdminIntegrationSettings(),
    getAdminSecretPresence(),
    getAdminSecretSources(),
    getAdminHealthStatus(),
    getAdminEmailTemplates()
  ]);

  return NextResponse.json({
    integrations,
    secretPresence,
    secretSources,
    health,
    emailTemplates
  });
}

export async function PUT(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestContext = getAdminRequestContext(request);

  try {
    const body = bodySchema.parse(await request.json());
    if (!body.integrations && !body.secrets && !body.emailTemplates) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await Promise.all([
      body.integrations ? saveAdminIntegrationSettings(body.integrations) : Promise.resolve(),
      body.secrets ? saveAdminSecretSettings(body.secrets) : Promise.resolve(),
      body.emailTemplates ? saveAdminEmailTemplates(body.emailTemplates as Partial<AdminEmailTemplates>) : Promise.resolve()
    ]);

    await writeAdminAuditLog(
      {
        module: "settings",
        action: "update_integrations",
        targetType: "adminSettings",
        targetId: "integrations+secrets+emailTemplates",
        summary: "Updated integration, secret, and email template settings",
        metadata: {
          integrationKeys: Object.keys(body.integrations ?? {}),
          secretKeys: Object.keys(body.secrets ?? {}),
          emailTemplateKeys: Object.keys(body.emailTemplates ?? {})
        }
      },
      user,
      requestContext
    );

    const [integrations, secretPresence, secretSources, health, emailTemplates] = await Promise.all([
      getAdminIntegrationSettings(),
      getAdminSecretPresence(),
      getAdminSecretSources(),
      getAdminHealthStatus(),
      getAdminEmailTemplates()
    ]);

    return NextResponse.json({
      success: true,
      integrations,
      secretPresence,
      secretSources,
      health,
      emailTemplates
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
