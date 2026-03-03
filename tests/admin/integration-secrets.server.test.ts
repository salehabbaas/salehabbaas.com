import test from "node:test";
import assert from "node:assert/strict";

import { getSecretPresenceFromSettings, getSecretSourceMap } from "../../lib/admin/integration-secrets";
import type { AdminSecretSettings } from "../../types/site-settings";

function emptySecrets(): AdminSecretSettings {
  return {
    resendApiKey: "",
    sendgridApiKey: "",
    mailgunApiKey: "",
    mailgunDomain: "",
    gmailAppPassword: "",
    zohoSmtpHost: "",
    zohoSmtpPort: "",
    zohoSmtpSecure: "",
    zohoSmtpUsername: "",
    zohoSmtpPassword: "",
    googleServiceAccountEmail: "",
    googleServiceAccountPrivateKey: "",
    geminiApiKey: "",
    googleApiKey: "",
    telegramBotToken: "",
    telegramWebhookSecret: ""
  };
}

test("getAdminSecretPresenceFromSettings treats runtime or env values as configured", () => {
  const secrets = emptySecrets();
  secrets.resendApiKey = "runtime-resend";

  const env: Record<string, string | undefined> = {
    SENDGRID_API_KEY: "env-sendgrid",
    TELEGRAM_WEBHOOK_SECRET: "env-webhook"
  };

  const presence = getSecretPresenceFromSettings(secrets, env);

  assert.equal(presence.resendApiKey, true);
  assert.equal(presence.sendgridApiKey, true);
  assert.equal(presence.telegramWebhookSecret, true);
  assert.equal(presence.mailgunApiKey, false);
});

test("getAdminSecretSourceMap reports runtime/environment/both/missing correctly", () => {
  const secrets = emptySecrets();
  secrets.resendApiKey = "runtime-resend";
  secrets.mailgunApiKey = "runtime-mailgun";

  const env: Record<string, string | undefined> = {
    RESEND_API_KEY: "env-resend",
    SENDGRID_API_KEY: "env-sendgrid"
  };

  const sources = getSecretSourceMap(secrets, env);

  assert.equal(sources.resendApiKey, "both");
  assert.equal(sources.mailgunApiKey, "runtime");
  assert.equal(sources.sendgridApiKey, "environment");
  assert.equal(sources.googleApiKey, "missing");
});
