import { adminDb } from "../admin";

import { createEmailAdapter } from "./adapters";
import type { EmailAdapter, EmailMessage } from "./types";

function extractModuleFromText(text?: string) {
  if (!text) return "";
  const match = text.match(/(?:^|\n)Module:\s*([^\n]+)/i);
  return match?.[1]?.trim() ?? "";
}

async function writeEmailActivity(input: {
  status: "sent" | "failed";
  provider: string;
  senderEmail: string;
  payload: EmailMessage;
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
      source: input.payload.activity?.source || "functions",
      metadata: input.payload.activity?.metadata ?? {},
      errorMessage: input.errorMessage ?? "",
      createdAt: new Date()
    });
  } catch {
    // Never break email delivery when activity logging fails.
  }
}

function withEmailActivityLogging(input: {
  adapter: EmailAdapter;
  provider: string;
  senderEmail: string;
}): EmailAdapter {
  return {
    async send(message) {
      try {
        await input.adapter.send(message);
        await writeEmailActivity({
          status: "sent",
          provider: input.provider,
          senderEmail: input.senderEmail,
          payload: message
        });
      } catch (error) {
        await writeEmailActivity({
          status: "failed",
          provider: input.provider,
          senderEmail: input.senderEmail,
          payload: message,
          errorMessage: error instanceof Error ? error.message : "unknown"
        });
        throw error;
      }
    }
  };
}

export async function getEmailAdapter() {
  const [legacySnap, settingsSnap, secretsSnap] = await Promise.all([
    adminDb.collection("siteContent").doc("integrations").get(),
    adminDb.collection("adminSettings").doc("integrations").get(),
    adminDb.collection("adminSettings").doc("secrets").get()
  ]);

  const legacyData = legacySnap.data() ?? {};
  const settingsData = settingsSnap.data() ?? {};
  const secretsData = secretsSnap.data() ?? {};
  const provider = settingsData.emailProvider ?? legacyData.emailProvider ?? "resend";
  const senderEmail = settingsData.senderEmail ?? legacyData.senderEmail ?? process.env.DEFAULT_SENDER_EMAIL ?? "noreply@salehabbaas.com";
  const adapter = createEmailAdapter({
    provider,
    senderEmail,
    senderName: settingsData.senderName ?? legacyData.senderName ?? "Saleh Abbaas",
    secrets: {
      resendApiKey: secretsData.resendApiKey ?? "",
      sendgridApiKey: secretsData.sendgridApiKey ?? "",
      mailgunApiKey: secretsData.mailgunApiKey ?? "",
      mailgunDomain: secretsData.mailgunDomain ?? "",
      gmailAppPassword: secretsData.gmailAppPassword ?? "",
      zohoSmtpHost: secretsData.zohoSmtpHost ?? "",
      zohoSmtpPort: secretsData.zohoSmtpPort ?? "",
      zohoSmtpSecure: secretsData.zohoSmtpSecure ?? "",
      zohoSmtpUsername: secretsData.zohoSmtpUsername ?? "",
      zohoSmtpPassword: secretsData.zohoSmtpPassword ?? ""
    }
  });

  return withEmailActivityLogging({
    adapter,
    provider,
    senderEmail
  });
}
