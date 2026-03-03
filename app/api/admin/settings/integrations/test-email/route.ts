import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { getAdminHealthStatus } from "@/lib/admin/health";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getAdminIntegrationSettings } from "@/lib/firestore/admin-settings";
import { getConfiguredEmailAdapter } from "@/lib/email/service";
import { renderConfiguredEmailTemplate } from "@/lib/email/templates";

export const runtime = "nodejs";

const bodySchema = z.object({
  to: z.string().email().optional()
});

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const [health, integrations] = await Promise.all([getAdminHealthStatus(), getAdminIntegrationSettings()]);
    const emailFeature = health.features.find((feature) => feature.feature === "email");

    if (!emailFeature) {
      return NextResponse.json({ error: "Email health diagnostics unavailable." }, { status: 500 });
    }

    if (emailFeature.status !== "healthy") {
      return NextResponse.json(
        {
          error: "Email settings are incomplete.",
          missing: emailFeature.missing
        },
        { status: 400 }
      );
    }

    const targetEmail = body.to || integrations.senderEmail || user.email || "";
    if (!targetEmail) {
      return NextResponse.json(
        {
          error: "No recipient email available. Provide a test recipient or configure sender email."
        },
        { status: 400 }
      );
    }

    const adapter = await getConfiguredEmailAdapter();
    const sentAtIso = new Date().toISOString();
    const rendered = await renderConfiguredEmailTemplate("settingsTest", {
      moduleName: "Settings",
      primaryActionLabel: "Open Integrations",
      primaryActionUrl: "/admin/settings/integrations",
      quickLinks: [
        { label: "System Inbox", url: "/admin/system-inbox" },
        { label: "Reminders", url: "/admin/settings/reminders" },
        { label: "Projects", url: "/admin/projects" },
        { label: "Bookings", url: "/admin/bookings" }
      ],
      provider: integrations.emailProvider,
      senderName: integrations.senderName,
      senderEmail: integrations.senderEmail,
      sentAt: sentAtIso
    });

    await adapter.send({
      to: targetEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      activity: {
        module: "Settings",
        templateId: "settingsTest",
        trigger: "test_email_settings"
      }
    });

    await writeAdminAuditLog(
      {
        module: "settings",
        action: "test_email_settings",
        targetType: "adminSettings",
        targetId: "integrations+secrets",
        summary: `Sent test email via ${integrations.emailProvider}`,
        metadata: {
          provider: integrations.emailProvider,
          to: targetEmail
        }
      },
      user,
      requestContext
    );

    return NextResponse.json({
      success: true,
      provider: integrations.emailProvider,
      to: targetEmail,
      sentAt: sentAtIso
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send test email";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
