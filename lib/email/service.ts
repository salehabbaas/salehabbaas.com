import "server-only";

import { getRuntimeAdminSettings } from "@/lib/firestore/admin-settings";
import { createEmailAdapter, type EmailAdapter, type EmailPayload } from "@/lib/email/adapters";
import { adminDb } from "@/lib/firebase/admin";

function extractModuleFromText(text?: string) {
  if (!text) return "";
  const match = text.match(/(?:^|\n)Module:\s*([^\n]+)/i);
  return match?.[1]?.trim() ?? "";
}

async function writeEmailActivity(input: {
  status: "sent" | "failed";
  provider: string;
  senderEmail: string;
  payload: EmailPayload;
  errorMessage?: string;
}) {
  try {
    await adminDb.collection("emailActivity").add({
      status: input.status,
      provider: input.provider,
      senderEmail: input.senderEmail,
      recipient: input.payload.to,
      subject: input.payload.subject,
      module: input.payload.activity?.module || extractModuleFromText(input.payload.text),
      templateId: input.payload.activity?.templateId || "",
      trigger: input.payload.activity?.trigger || "",
      source: input.payload.activity?.source || "nextjs",
      attachmentCount: input.payload.attachments?.length ?? 0,
      metadata: input.payload.activity?.metadata ?? {},
      errorMessage: input.errorMessage ?? "",
      createdAt: new Date()
    });
  } catch {
    // Email delivery must not fail if logging fails.
  }
}

function withEmailActivityLogging(input: {
  adapter: EmailAdapter;
  provider: string;
  senderEmail: string;
}): EmailAdapter {
  return {
    async send(payload) {
      try {
        await input.adapter.send(payload);
        await writeEmailActivity({
          status: "sent",
          provider: input.provider,
          senderEmail: input.senderEmail,
          payload
        });
      } catch (error) {
        await writeEmailActivity({
          status: "failed",
          provider: input.provider,
          senderEmail: input.senderEmail,
          payload,
          errorMessage: error instanceof Error ? error.message : "unknown"
        });
        throw error;
      }
    }
  };
}

export async function getConfiguredEmailAdapter() {
  const runtime = await getRuntimeAdminSettings();
  const senderEmail = runtime.integrations.senderEmail || process.env.DEFAULT_SENDER_EMAIL || "noreply@salehabbaas.com";
  const adapter = createEmailAdapter({
    provider: runtime.integrations.emailProvider,
    senderEmail,
    senderName: runtime.integrations.senderName || "Saleh Abbaas",
    secrets: {
      resendApiKey: runtime.secrets.resendApiKey,
      sendgridApiKey: runtime.secrets.sendgridApiKey,
      mailgunApiKey: runtime.secrets.mailgunApiKey,
      mailgunDomain: runtime.secrets.mailgunDomain,
      gmailAppPassword: runtime.secrets.gmailAppPassword,
      zohoSmtpHost: runtime.secrets.zohoSmtpHost,
      zohoSmtpPort: runtime.secrets.zohoSmtpPort,
      zohoSmtpSecure: runtime.secrets.zohoSmtpSecure,
      zohoSmtpUsername: runtime.secrets.zohoSmtpUsername,
      zohoSmtpPassword: runtime.secrets.zohoSmtpPassword
    }
  });

  return withEmailActivityLogging({
    adapter,
    provider: runtime.integrations.emailProvider,
    senderEmail
  });
}
