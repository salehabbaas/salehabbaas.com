import { adminDb } from "../admin";

import { createEmailAdapter } from "./adapters";

export async function getEmailAdapter() {
  const [legacySnap, settingsSnap, secretsSnap] = await Promise.all([
    adminDb.collection("siteContent").doc("integrations").get(),
    adminDb.collection("adminSettings").doc("integrations").get(),
    adminDb.collection("adminSettings").doc("secrets").get()
  ]);

  const legacyData = legacySnap.data() ?? {};
  const settingsData = settingsSnap.data() ?? {};
  const secretsData = secretsSnap.data() ?? {};

  return createEmailAdapter({
    provider: settingsData.emailProvider ?? legacyData.emailProvider ?? "resend",
    senderEmail: settingsData.senderEmail ?? legacyData.senderEmail ?? process.env.DEFAULT_SENDER_EMAIL ?? "noreply@salehabbaas.com",
    senderName: settingsData.senderName ?? legacyData.senderName ?? "Saleh Abbaas",
    secrets: {
      resendApiKey: secretsData.resendApiKey ?? "",
      sendgridApiKey: secretsData.sendgridApiKey ?? "",
      mailgunApiKey: secretsData.mailgunApiKey ?? "",
      mailgunDomain: secretsData.mailgunDomain ?? ""
    }
  });
}
