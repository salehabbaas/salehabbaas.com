import test from "node:test";
import assert from "node:assert/strict";

import { buildIntegrationSectionStatuses } from "../../lib/admin/integration-sections";
import type { AdminIntegrationSettings, AdminSecretSettings, SecretPresence } from "../../types/site-settings";
import type { SecretSource } from "../../lib/admin/integration-secrets";

function baseIntegrations(): AdminIntegrationSettings {
  return {
    emailProvider: "resend",
    senderEmail: "owner@example.com",
    senderName: "Owner",
    contactFunctionUrl: "https://example.com/contact",
    bookingFunctionUrl: "https://example.com/booking",
    googleCalendarId: "primary",
    geminiModel: "gemini-2.5-flash",
    geminiTextModel: "gemini-2.5-flash",
    telegramAllowedChatIds: "-100111",
    telegramDefaultChatId: "-100111",
    agentOwnerUid: "admin-uid",
    telegramActionsEnabled: true,
    resumeStudioV2Enabled: true,
    resumeEditorV2Enabled: true,
    resumeAi53Enabled: true,
    resumeJobUrlParserEnabled: true,
    resumeAdvancedTemplateBuilderEnabled: true
  };
}

function makePresence(value = false): SecretPresence {
  return {
    resendApiKey: value,
    sendgridApiKey: value,
    mailgunApiKey: value,
    mailgunDomain: value,
    gmailAppPassword: value,
    zohoSmtpHost: value,
    zohoSmtpPort: value,
    zohoSmtpSecure: value,
    zohoSmtpUsername: value,
    zohoSmtpPassword: value,
    googleServiceAccountEmail: value,
    googleServiceAccountPrivateKey: value,
    geminiApiKey: value,
    googleApiKey: value,
    telegramBotToken: value,
    telegramWebhookSecret: value
  };
}

function makeSources(value: SecretSource = "runtime"): Record<keyof AdminSecretSettings, SecretSource> {
  return {
    resendApiKey: value,
    sendgridApiKey: value,
    mailgunApiKey: value,
    mailgunDomain: value,
    gmailAppPassword: value,
    zohoSmtpHost: value,
    zohoSmtpPort: value,
    zohoSmtpSecure: value,
    zohoSmtpUsername: value,
    zohoSmtpPassword: value,
    googleServiceAccountEmail: value,
    googleServiceAccountPrivateKey: value,
    geminiApiKey: value,
    googleApiKey: value,
    telegramBotToken: value,
    telegramWebhookSecret: value
  };
}

function sectionById(id: string, sections: ReturnType<typeof buildIntegrationSectionStatuses>) {
  const section = sections.find((item) => item.id === id);
  if (!section) throw new Error(`Section ${id} not found`);
  return section;
}

test("buildIntegrationSectionStatuses creates all editor sections", () => {
  const sections = buildIntegrationSectionStatuses(baseIntegrations(), makePresence(true), makeSources("runtime"));
  assert.deepEqual(sections.map((item) => item.id), ["email", "runtime", "ai", "telegram", "resume", "secrets"]);
});

test("email section honors provider-specific required secrets", () => {
  const integrations = baseIntegrations();
  integrations.emailProvider = "mailgun";

  const presence = makePresence(false);
  presence.mailgunApiKey = true;
  presence.mailgunDomain = false;

  const sections = buildIntegrationSectionStatuses(integrations, presence, makeSources("runtime"));
  const email = sectionById("email", sections);

  assert.equal(email.status, "partial");
  assert.equal(email.configuredCount, 3);
  assert.equal(email.totalCount, 4);
});

test("runtime section requires URLs, calendar, and Google booking secrets", () => {
  const integrations = baseIntegrations();
  integrations.bookingFunctionUrl = "";

  const presence = makePresence(true);
  presence.googleServiceAccountPrivateKey = false;

  const sections = buildIntegrationSectionStatuses(integrations, presence, makeSources("runtime"));
  const runtime = sectionById("runtime", sections);

  assert.equal(runtime.status, "partial");
  assert.equal(runtime.configuredCount, 3);
  assert.equal(runtime.totalCount, 5);
});

test("ai section is configured when either Gemini or Google key is present", () => {
  const integrations = baseIntegrations();
  const presence = makePresence(false);
  presence.googleApiKey = true;

  const sections = buildIntegrationSectionStatuses(integrations, presence, makeSources("environment"));
  const ai = sectionById("ai", sections);

  assert.equal(ai.status, "configured");
  assert.equal(ai.configuredCount, 3);
  assert.equal(ai.totalCount, 3);
});

test("telegram section reports missing when default chat and webhook settings are absent", () => {
  const integrations = baseIntegrations();
  integrations.telegramDefaultChatId = "";

  const presence = makePresence(false);
  presence.telegramBotToken = true;

  const sections = buildIntegrationSectionStatuses(integrations, presence, makeSources("runtime"));
  const telegram = sectionById("telegram", sections);

  assert.equal(telegram.status, "partial");
  assert.equal(telegram.configuredCount, 1);
  assert.equal(telegram.totalCount, 3);
});

test("resume section reflects enabled flags", () => {
  const integrations = baseIntegrations();
  integrations.resumeStudioV2Enabled = false;
  integrations.resumeAi53Enabled = false;
  integrations.resumeJobUrlParserEnabled = false;
  integrations.resumeAdvancedTemplateBuilderEnabled = false;

  const sections = buildIntegrationSectionStatuses(integrations, makePresence(false), makeSources("missing"));
  const resume = sectionById("resume", sections);

  assert.equal(resume.status, "missing");
  assert.equal(resume.configuredCount, 0);
  assert.equal(resume.totalCount, 4);
});

test("secret vault section aggregates all secret presence flags", () => {
  const presence = makePresence(false);
  presence.resendApiKey = true;
  presence.geminiApiKey = true;

  const sections = buildIntegrationSectionStatuses(baseIntegrations(), presence, makeSources("runtime"));
  const secrets = sectionById("secrets", sections);

  assert.equal(secrets.status, "partial");
  assert.equal(secrets.configuredCount, 2);
  assert.equal(secrets.totalCount, 16);
});
