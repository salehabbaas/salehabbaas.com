import { adminDb } from "../admin";

import { createEmailAdapter } from "./adapters";

export async function getEmailAdapter() {
  const snap = await adminDb.collection("siteContent").doc("integrations").get();
  const data = snap.data() ?? {};

  return createEmailAdapter({
    provider: data.emailProvider ?? "resend",
    senderEmail: data.senderEmail ?? process.env.DEFAULT_SENDER_EMAIL ?? "noreply@salehabbaas.com",
    senderName: data.senderName ?? "Saleh Abbaas"
  });
}
