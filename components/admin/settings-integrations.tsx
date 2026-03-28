"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AdminFieldLabel } from "@/components/admin/admin-field-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildIntegrationSectionStatuses, type IntegrationSectionId } from "@/lib/admin/integration-sections";
import { SECRET_DEFINITIONS, type SecretSource } from "@/lib/admin/integration-secrets";
import { EMAIL_TEMPLATE_DEFINITIONS, getDefaultAdminEmailTemplates } from "@/lib/email/template-catalog";
import { renderEmailTemplate } from "@/lib/email/template-render";
import type {
  AdminEmailTemplates,
  AdminIntegrationSettings,
  AdminSecretSettings,
  EmailTemplateId,
  SecretPresence
} from "@/types/site-settings";

type SecretSourceMap = Record<keyof AdminSecretSettings, SecretSource>;

type Payload = {
  integrations: AdminIntegrationSettings;
  secretPresence: SecretPresence;
  secretSources: SecretSourceMap;
  emailTemplates: AdminEmailTemplates;
};

const defaultIntegrations: AdminIntegrationSettings = {
  emailProvider: "resend",
  senderEmail: "",
  senderName: "Saleh Abbaas",
  contactFunctionUrl: "",
  bookingFunctionUrl: "",
  googleCalendarId: "primary",
  geminiModel: "gemini-2.5-flash",
  geminiTextModel: "",
  telegramAllowedChatIds: "",
  telegramDefaultChatId: "",
  agentOwnerUid: "",
  telegramActionsEnabled: false,
  resumeStudioV2Enabled: false,
  resumeEditorV2Enabled: false,
  resumeAi53Enabled: false,
  resumeJobUrlParserEnabled: false,
  resumeAdvancedTemplateBuilderEnabled: false
};

const defaultPresence: SecretPresence = {
  resendApiKey: false,
  sendgridApiKey: false,
  mailgunApiKey: false,
  mailgunDomain: false,
  gmailAppPassword: false,
  zohoSmtpHost: false,
  zohoSmtpPort: false,
  zohoSmtpSecure: false,
  zohoSmtpUsername: false,
  zohoSmtpPassword: false,
  googleServiceAccountEmail: false,
  googleServiceAccountPrivateKey: false,
  geminiApiKey: false,
  googleApiKey: false,
  telegramBotToken: false,
  telegramWebhookSecret: false
};

const defaultSourceMap: SecretSourceMap = {
  resendApiKey: "missing",
  sendgridApiKey: "missing",
  mailgunApiKey: "missing",
  mailgunDomain: "missing",
  gmailAppPassword: "missing",
  zohoSmtpHost: "missing",
  zohoSmtpPort: "missing",
  zohoSmtpSecure: "missing",
  zohoSmtpUsername: "missing",
  zohoSmtpPassword: "missing",
  googleServiceAccountEmail: "missing",
  googleServiceAccountPrivateKey: "missing",
  geminiApiKey: "missing",
  googleApiKey: "missing",
  telegramBotToken: "missing",
  telegramWebhookSecret: "missing"
};

function getStatusTone(status: "configured" | "partial" | "missing") {
  if (status === "configured") return "text-success";
  if (status === "partial") return "text-warning";
  return "text-destructive";
}

function getStatusLabel(status: "configured" | "partial" | "missing") {
  if (status === "configured") return "Configured";
  if (status === "partial") return "Partial";
  return "Missing";
}

function getSourceLabel(source: SecretSource) {
  if (source === "runtime") return "Runtime";
  if (source === "environment") return "Environment";
  if (source === "both") return "Runtime + Env";
  return "Missing";
}

function getSourceTone(source: SecretSource) {
  if (source === "runtime") return "text-success";
  if (source === "environment") return "text-warning";
  if (source === "both") return "text-primary";
  return "text-destructive";
}

export function SettingsIntegrations() {
  const [integrations, setIntegrations] = useState<AdminIntegrationSettings>(defaultIntegrations);
  const [presence, setPresence] = useState<SecretPresence>(defaultPresence);
  const [secretSources, setSecretSources] = useState<SecretSourceMap>(defaultSourceMap);
  const [emailTemplates, setEmailTemplates] = useState<AdminEmailTemplates>(getDefaultAdminEmailTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateId>("settingsTest");
  const [secretInput, setSecretInput] = useState<Partial<Record<keyof AdminSecretSettings, string>>>({});
  const [revealedSecrets, setRevealedSecrets] = useState<AdminSecretSettings | null>(null);
  const [secretVisibility, setSecretVisibility] = useState<Partial<Record<keyof AdminSecretSettings, boolean>>>({});
  const [revealPassword, setRevealPassword] = useState("");
  const [revealError, setRevealError] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [templatesCollapsed, setTemplatesCollapsed] = useState(true);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setStatus("");
      try {
        const response = await fetch("/api/admin/settings/integrations");
        const payload = (await response.json()) as Payload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load settings");
        if (!mounted) return;
        setIntegrations(payload.integrations);
        setPresence(payload.secretPresence);
        setSecretSources(payload.secretSources ?? defaultSourceMap);
        setEmailTemplates(payload.emailTemplates ?? getDefaultAdminEmailTemplates());
        setTestRecipient(payload.integrations.senderEmail || "");
      } catch (error) {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Unable to load settings");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (editorOpen) return;
    setRevealError("");
    setRevealPassword("");
    setSecretVisibility({});
    setRevealedSecrets(null);
  }, [editorOpen]);

  const secretConfiguredCount = useMemo(
    () => SECRET_DEFINITIONS.filter((item) => presence[item.key]).length,
    [presence]
  );

  const sectionStatuses = useMemo(
    () => buildIntegrationSectionStatuses(integrations, presence, secretSources),
    [integrations, presence, secretSources]
  );

  const fullyConfiguredSectionCount = useMemo(
    () => sectionStatuses.filter((section) => section.status === "configured").length,
    [sectionStatuses]
  );

  function renderSectionFields(sectionId: IntegrationSectionId) {
    if (sectionId === "email") {
      return (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <AdminFieldLabel htmlFor="integration-email-provider" label="Email Provider" required />
            <Select
              id="integration-email-provider"
              value={integrations.emailProvider}
              onChange={(event) =>
                setIntegrations((prev) => ({
                  ...prev,
                  emailProvider: event.target.value as AdminIntegrationSettings["emailProvider"]
                }))
              }
            >
              <option value="resend">Resend</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
              <option value="gmail">Gmail SMTP (App Password)</option>
              <option value="zoho">Zoho SMTP</option>
            </Select>
          </div>
          <div className="space-y-2">
            <AdminFieldLabel htmlFor="integration-sender-email" label="Sender Email" required />
            <Input
              id="integration-sender-email"
              value={integrations.senderEmail}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, senderEmail: event.target.value }))}
              placeholder="noreply@salehabbaas.com"
              required
            />
          </div>
          <div className="space-y-2">
            <AdminFieldLabel htmlFor="integration-sender-name" label="Sender Name" required />
            <Input
              id="integration-sender-name"
              value={integrations.senderName}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, senderName: event.target.value }))}
              required
            />
          </div>
        </div>
      );
    }

    if (sectionId === "runtime") {
      return (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="integration-contact-url" label="Contact Function URL" />
              <Input
                id="integration-contact-url"
                value={integrations.contactFunctionUrl}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, contactFunctionUrl: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="integration-booking-url" label="Booking Function URL" />
              <Input
                id="integration-booking-url"
                value={integrations.bookingFunctionUrl}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, bookingFunctionUrl: event.target.value }))}
              />
            </div>
          </div>
          <div className="max-w-md space-y-2">
            <AdminFieldLabel htmlFor="integration-calendar-id" label="Google Calendar ID" required />
            <Input
              id="integration-calendar-id"
              value={integrations.googleCalendarId}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, googleCalendarId: event.target.value }))}
              required
            />
          </div>
        </div>
      );
    }

    if (sectionId === "ai") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <AdminFieldLabel htmlFor="integration-gemini-model" label="Gemini Model" required />
            <Input
              id="integration-gemini-model"
              value={integrations.geminiModel}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, geminiModel: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <AdminFieldLabel htmlFor="integration-gemini-text-model" label="Gemini Text Model" />
            <Input
              id="integration-gemini-text-model"
              value={integrations.geminiTextModel}
              onChange={(event) => setIntegrations((prev) => ({ ...prev, geminiTextModel: event.target.value }))}
              placeholder="optional override"
            />
          </div>
        </div>
      );
    }

    if (sectionId === "telegram") {
      return (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="integration-telegram-default-chat" label="Telegram Default Chat ID" />
              <Input
                id="integration-telegram-default-chat"
                value={integrations.telegramDefaultChatId}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, telegramDefaultChatId: event.target.value }))}
                placeholder="-100..."
              />
            </div>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="integration-telegram-allowlist" label="Telegram Allowed Chat IDs" />
              <Input
                id="integration-telegram-allowlist"
                value={integrations.telegramAllowedChatIds}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, telegramAllowedChatIds: event.target.value }))}
                placeholder="comma-separated chat ids"
              />
            </div>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="integration-agent-owner-uid" label="Agent Owner UID" />
              <Input
                id="integration-agent-owner-uid"
                value={integrations.agentOwnerUid}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, agentOwnerUid: event.target.value }))}
                placeholder="Firebase UID used for Telegram agent"
              />
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/60 p-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={integrations.telegramActionsEnabled}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, telegramActionsEnabled: event.target.checked }))}
              />
              Enable Telegram write actions (use carefully)
            </label>
          </div>
        </div>
      );
    }

    if (sectionId === "resume") {
      return (
        <div className="rounded-xl border border-border/70 bg-card/60 p-3">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={integrations.resumeStudioV2Enabled}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, resumeStudioV2Enabled: event.target.checked }))}
              />
              Enable Resume Studio v2
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={integrations.resumeEditorV2Enabled}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, resumeEditorV2Enabled: event.target.checked }))}
              />
              Enable Editor v2 foundations
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={integrations.resumeAi53Enabled}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, resumeAi53Enabled: event.target.checked }))}
              />
              Enable GPT-5.3 default
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={integrations.resumeJobUrlParserEnabled}
                onChange={(event) => setIntegrations((prev) => ({ ...prev, resumeJobUrlParserEnabled: event.target.checked }))}
              />
              Enable JD URL parser
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={integrations.resumeAdvancedTemplateBuilderEnabled}
                onChange={(event) =>
                  setIntegrations((prev) => ({ ...prev, resumeAdvancedTemplateBuilderEnabled: event.target.checked }))
                }
              />
              Enable advanced template builder
            </label>
          </div>
        </div>
      );
    }

    if (sectionId === "secrets") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card/60 p-3">
            <p className="text-sm font-medium">Reveal Configured Values</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter the admin reveal password to see currently stored runtime secret values. Secrets configured only via environment variables
              remain hidden and are labeled as Environment.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                value={revealPassword}
                onChange={(event) => setRevealPassword(event.target.value)}
                placeholder="Admin reveal password"
                type="password"
                className="min-w-[260px] flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void onRevealSecrets()}
                disabled={revealing || !revealPassword.trim()}
              >
                {revealing ? "Unlocking..." : "Unlock Values"}
              </Button>
            </div>
            {revealError ? <p className="mt-2 text-xs text-destructive">{revealError}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {SECRET_DEFINITIONS.map((item) => {
              const source = secretSources[item.key] ?? "missing";
              const sourceClass = getSourceTone(source);
              const sourceLabel = getSourceLabel(source);
              const canReveal = source === "runtime" || source === "both";
              const currentValue = revealedSecrets?.[item.key] ?? "";
              const visible = Boolean(secretVisibility[item.key]);
              const inputType = item.sensitive && !visible ? "password" : "text";

              return (
                <div key={item.key} className="space-y-2 rounded-xl border border-border/70 bg-card/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <AdminFieldLabel htmlFor={`secret-${item.key}`} label={item.label} />
                    <span className={`text-xs ${sourceClass}`}>{sourceLabel}</span>
                  </div>
                  {revealedSecrets && canReveal ? (
                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2">
                      <p className="text-xs text-muted-foreground">Current stored value</p>
                      <div className="flex gap-2">
                        <Input type={inputType} value={currentValue} readOnly />
                        {item.sensitive ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSecretVisibility((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                          >
                            {visible ? "Hide" : "Show"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {revealedSecrets && source === "environment" ? (
                    <p className="text-xs text-muted-foreground">Configured via environment variable. Runtime value is not stored in admin settings.</p>
                  ) : null}
                  <Input
                    id={`secret-${item.key}`}
                    type={item.sensitive ? "password" : "text"}
                    value={secretInput[item.key] ?? ""}
                    onChange={(event) => setSecretInput((prev) => ({ ...prev, [item.key]: event.target.value }))}
                    placeholder={presence[item.key] ? "Configured (enter to replace)" : "Not configured"}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const secrets: Partial<Record<keyof AdminSecretSettings, string>> = {};
      for (const [key, value] of Object.entries(secretInput) as Array<[keyof AdminSecretSettings, string]>) {
        if (value.trim()) secrets[key] = value.trim();
      }

      const response = await fetch("/api/admin/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrations,
          secrets
        })
      });

      const payload = (await response.json()) as Payload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save settings");

      setIntegrations(payload.integrations);
      setPresence(payload.secretPresence);
      setSecretSources(payload.secretSources ?? defaultSourceMap);
      setEmailTemplates(payload.emailTemplates ?? getDefaultAdminEmailTemplates());
      setTestRecipient((current) => current || payload.integrations.senderEmail || "");
      setSecretInput({});
      setStatus("Settings saved.");
      setEditorOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function onRevealSecrets() {
    setRevealing(true);
    setRevealError("");

    try {
      const response = await fetch("/api/admin/settings/integrations/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: revealPassword })
      });

      const payload = (await response.json()) as { error?: string; secrets?: AdminSecretSettings };
      if (!response.ok) throw new Error(payload.error ?? "Unable to unlock secrets");

      setRevealedSecrets(payload.secrets ?? null);
      setRevealPassword("");
      setRevealError("");
      setStatus("Stored runtime secret values unlocked.");
    } catch (error) {
      setRevealError(error instanceof Error ? error.message : "Unable to unlock secrets");
    } finally {
      setRevealing(false);
    }
  }

  async function onTestEmail() {
    setTestingEmail(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/settings/integrations/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testRecipient.trim() || undefined
        })
      });

      const payload = (await response.json()) as { error?: string; missing?: string[]; to?: string; provider?: string };
      if (!response.ok) {
        if (payload.missing?.length) {
          throw new Error(`${payload.error ?? "Email settings are incomplete."} Missing: ${payload.missing.join(", ")}`);
        }
        throw new Error(payload.error ?? "Unable to send test email");
      }

      setStatus(`Test email sent via ${payload.provider ?? integrations.emailProvider} to ${payload.to ?? testRecipient}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send test email");
    } finally {
      setTestingEmail(false);
    }
  }

  async function onSaveTemplates() {
    setSavingTemplates(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailTemplates
        })
      });

      const payload = (await response.json()) as Payload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save email templates");

      setEmailTemplates(payload.emailTemplates ?? getDefaultAdminEmailTemplates());
      setStatus("Email templates saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save email templates");
    } finally {
      setSavingTemplates(false);
    }
  }

  function onTemplateFieldChange(id: EmailTemplateId, field: "subject" | "html" | "text", value: string) {
    setEmailTemplates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  }

  function onResetSelectedTemplate() {
    const defaults = getDefaultAdminEmailTemplates();
    setEmailTemplates((prev) => ({
      ...prev,
      [selectedTemplateId]: defaults[selectedTemplateId]
    }));
  }

  function buildPreviewVariables(templateId: EmailTemplateId) {
    const nowIso = new Date().toISOString();
    const branding = {
      senderName: integrations.senderName || "Saleh Abbaas",
      senderEmail: integrations.senderEmail || "salehabbas123@gmail.com",
      siteUrl: "https://salehabbaas.com",
      logoUrl: "https://salehabbaas.com/SA-Logo.png",
      year: String(new Date().getUTCFullYear()),
      quickLinks: [
        { label: "System Inbox", url: "/admin/system-inbox" },
        { label: "Projects", url: "/admin/projects" },
        { label: "Reminders", url: "/admin/settings/reminders" }
      ]
    };

    if (templateId === "settingsTest") {
      return {
        ...branding,
        moduleName: "Settings",
        primaryActionLabel: "Open Integrations",
        primaryActionUrl: "/admin/settings/integrations",
        provider: integrations.emailProvider,
        sentAt: nowIso
      };
    }

    if (templateId === "adminInvitation") {
      return {
        ...branding,
        moduleName: "Settings Access",
        primaryActionLabel: "Set Password",
        primaryActionUrl: "https://salehabbaas.com/admin/login?action=reset",
        invitationType: "created",
        recipientEmail: "new-admin@example.com",
        invitedBy: integrations.senderEmail || "owner@salehabbaas.com",
        expiresAtIso: "March 10, 2026 09:00 AM UTC",
        setupLink: "https://salehabbaas.com/admin/login?action=reset",
        loginLink: "https://salehabbaas.com/admin/login",
        modulesText: "dashboard, settings, projects",
        projectsText: "Project Atlas (editor), Project Nova (viewer)",
        modulesListHtml: "<li>dashboard</li><li>settings</li><li>projects</li>",
        projectsListHtml: "<li>Project Atlas (editor)</li><li>Project Nova (viewer)</li>"
      };
    }

    if (templateId === "resumeExport") {
      return {
        ...branding,
        moduleName: "Resume Studio",
        primaryActionLabel: "Open Resume Studio",
        primaryActionUrl: "/admin/resume-studio",
        documentTitle: "Senior Software Engineer Resume"
      };
    }

    if (templateId === "contactSubmission") {
      return {
        ...branding,
        moduleName: "Contact",
        primaryActionLabel: "Open System Inbox",
        primaryActionUrl: "/admin/system-inbox",
        name: "Alex Carter",
        email: "alex@example.com",
        subject: "Integration support",
        message: "Hi, I want to discuss a healthcare interoperability project."
      };
    }

    if (templateId === "bookingConfirmation") {
      return {
        ...branding,
        moduleName: "Bookings",
        primaryActionLabel: "Open Meet Link",
        primaryActionUrl: "https://meet.google.com/abc-defg-hij",
        quickLinks: [
          { label: "Book Meeting", url: "/book-meeting" },
          { label: "Contact", url: "/contact" },
          { label: "Website", url: "/" }
        ],
        name: "Alex Carter",
        meetingType: "Project Discovery",
        startAt: "March 5, 2026 10:00 AM",
        timezone: "America/Toronto",
        meetLink: "https://meet.google.com/abc-defg-hij"
      };
    }

    if (templateId === "bookingOwnerNotification") {
      return {
        ...branding,
        moduleName: "Bookings",
        primaryActionLabel: "Open Bookings",
        primaryActionUrl: "/admin/bookings",
        quickLinks: [
          { label: "Bookings", url: "/admin/bookings" },
          { label: "System Inbox", url: "/admin/system-inbox" },
          { label: "Reminders", url: "/admin/settings/reminders" }
        ],
        meetingType: "Project Discovery",
        startAt: "March 5, 2026 10:00 AM",
        timezone: "America/Toronto",
        name: "Alex Carter",
        email: "alex@example.com",
        reason: "Discuss integration roadmap.",
        meetLink: "https://meet.google.com/abc-defg-hij"
      };
    }

    if (templateId === "taskReminder24h" || templateId === "taskReminder1h") {
      return {
        ...branding,
        moduleName: "Project Management",
        primaryActionLabel: "Open Task",
        primaryActionUrl: "https://salehabbaas.com/admin/projects/sample?taskId=abc123",
        taskTitle: "Finalize dashboard rollout",
        dueLabel: "March 6, 2026 3:00 PM",
        taskDescription: "Review QA checklist and deployment timeline.",
        taskUrl: "https://salehabbaas.com/admin/projects/sample?taskId=abc123"
      };
    }

    return {
      ...branding,
      moduleName: "Project Management",
      primaryActionLabel: "Open Projects",
      primaryActionUrl: "/admin/projects",
      taskCount: 3,
      overdueItemsText:
        "- Finalize dashboard rollout — overdue since March 1, 2026 3:00 PM (https://salehabbaas.com/admin/projects/sample?taskId=abc123)\n- Confirm API contract — overdue since March 1, 2026 5:00 PM (https://salehabbaas.com/admin/projects/sample?taskId=def456)",
      overdueItemsHtml:
        '<li><strong>Finalize dashboard rollout</strong> — overdue since March 1, 2026 3:00 PM (<a href="https://salehabbaas.com/admin/projects/sample?taskId=abc123">Open</a>)</li><li><strong>Confirm API contract</strong> — overdue since March 1, 2026 5:00 PM (<a href="https://salehabbaas.com/admin/projects/sample?taskId=def456">Open</a>)</li>'
    };
  }

  const selectedTemplate = emailTemplates[selectedTemplateId];
  const selectedTemplateDefinition = EMAIL_TEMPLATE_DEFINITIONS.find((item) => item.id === selectedTemplateId);
  const templatePreview = selectedTemplate
    ? renderEmailTemplate(selectedTemplate, buildPreviewVariables(selectedTemplateId))
    : null;

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrations and Keys</CardTitle>
          <CardDescription>Main integrations are shown as preview cards. Full forms open in a popup.</CardDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          <Button onClick={() => setEditorOpen(true)} disabled={loading}>
            Edit Integrations
          </Button>
          <Input
            value={testRecipient}
            onChange={(event) => setTestRecipient(event.target.value)}
            placeholder="Test recipient email"
            className="min-w-[260px] flex-1"
            type="email"
          />
          <Button variant="outline" onClick={() => void onTestEmail()} disabled={loading || saving || testingEmail}>
            {testingEmail ? "Testing..." : "Send Test Email"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/settings/health">Open Health</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Email Provider</p>
            <p className="mt-2 text-2xl font-semibold">{integrations.emailProvider}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Sender</p>
            <p className="mt-2 text-sm font-semibold">{integrations.senderName || "-"}</p>
            <p className="text-xs text-muted-foreground">{integrations.senderEmail || "No sender email"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Secrets Configured</p>
            <p className="mt-2 text-2xl font-semibold">
              {secretConfiguredCount}/{SECRET_DEFINITIONS.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Sections Ready</p>
            <p className="mt-2 text-2xl font-semibold">
              {fullyConfiguredSectionCount}/{sectionStatuses.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runtime Snapshot</CardTitle>
          <CardDescription>These values are used at runtime before env fallback.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Contact Function URL</p>
            <p className="mt-1 break-all">{integrations.contactFunctionUrl || "Not set"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Booking Function URL</p>
            <p className="mt-1 break-all">{integrations.bookingFunctionUrl || "Not set"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Google Calendar ID</p>
            <p className="mt-1">{integrations.googleCalendarId || "Not set"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Gemini Models</p>
            <p className="mt-1">{integrations.geminiModel || "Not set"}</p>
            <p className="text-xs text-muted-foreground">{integrations.geminiTextModel || "No text model override"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Telegram Agent Runtime</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Default chat: {integrations.telegramDefaultChatId || "Not set"} · Allowlist: {integrations.telegramAllowedChatIds || "Not set"} · Owner UID: {" "}
              {integrations.agentOwnerUid || "Not set"} · Write actions: {integrations.telegramActionsEnabled ? "ON" : "OFF"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Resume Studio Flags</p>
            <p className="mt-1 text-xs text-muted-foreground">
              V2: {integrations.resumeStudioV2Enabled ? "ON" : "OFF"} · Editor v2: {integrations.resumeEditorV2Enabled ? "ON" : "OFF"} · AI 5.3: {integrations.resumeAi53Enabled ? "ON" : "OFF"} · JD URL parser: {" "}
              {integrations.resumeJobUrlParserEnabled ? "ON" : "OFF"} · Advanced template builder: {" "}
              {integrations.resumeAdvancedTemplateBuilderEnabled ? "ON" : "OFF"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Edit and preview email templates with sample data before saving.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => setTemplatesCollapsed((prev) => !prev)}>
              {templatesCollapsed ? "Expand Templates" : "Collapse Templates"}
            </Button>
          </div>
        </CardHeader>
        {!templatesCollapsed ? <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="email-template-picker" label="Template" required />
              <Select
                id="email-template-picker"
                value={selectedTemplateId}
                onChange={(event) => {
                  setSelectedTemplateId(event.target.value as EmailTemplateId);
                  setTemplatePreviewOpen(false);
                }}
              >
                {EMAIL_TEMPLATE_DEFINITIONS.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">{selectedTemplateDefinition?.description ?? ""}</p>
            </div>
            <div className="space-y-2 rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Placeholders</p>
              <p className="text-xs text-muted-foreground">
                {(selectedTemplateDefinition?.placeholders ?? []).map((placeholder) => `{{${placeholder}}}`).join(", ") || "None"}
              </p>
              <p className="text-xs text-muted-foreground">Use triple braces for raw HTML placeholders, e.g. {"{{{overdueItemsHtml}}}"}.</p>
              <p className="text-xs text-muted-foreground">Action button and quick links are injected by module runtime variables.</p>
            </div>
          </div>

          {selectedTemplate ? (
            <>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="email-template-subject" label="Subject" required />
                <Input
                  id="email-template-subject"
                  value={selectedTemplate.subject}
                  onChange={(event) => onTemplateFieldChange(selectedTemplateId, "subject", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <AdminFieldLabel htmlFor="email-template-html" label="HTML Body" required />
                <Textarea
                  id="email-template-html"
                  value={selectedTemplate.html}
                  onChange={(event) => onTemplateFieldChange(selectedTemplateId, "html", event.target.value)}
                  className="min-h-[220px] font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <AdminFieldLabel htmlFor="email-template-text" label="Text Body" required />
                <Textarea
                  id="email-template-text"
                  value={selectedTemplate.text}
                  onChange={(event) => onTemplateFieldChange(selectedTemplateId, "text", event.target.value)}
                  className="min-h-[140px] font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTemplatePreviewOpen(true)}
                  disabled={loading || savingTemplates}
                >
                  Preview Template
                </Button>
                <Button type="button" variant="outline" onClick={onResetSelectedTemplate} disabled={loading || savingTemplates}>
                  Reset Selected to Default
                </Button>
                <Button type="button" onClick={() => void onSaveTemplates()} disabled={loading || savingTemplates || saving}>
                  {savingTemplates ? "Saving..." : "Save Email Templates"}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent> : null}
      </Card>

      <Dialog open={templatePreviewOpen} onOpenChange={setTemplatePreviewOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              {selectedTemplateDefinition?.label ?? "Email Template"} rendered with sample data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Subject</p>
            <p className="text-sm">{templatePreview?.subject || "-"}</p>

            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">HTML Preview</p>
            <div
              className="rounded-lg border border-border/60 bg-background p-3"
              dangerouslySetInnerHTML={{ __html: templatePreview?.html ?? "" }}
            />

            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Text Preview</p>
            <pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background p-3 text-xs">
              {templatePreview?.text || "-"}
            </pre>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTemplatePreviewOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-5xl">
          <form onSubmit={onSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit Runtime Integrations</DialogTitle>
              <DialogDescription>
                Integrations are grouped into collapsible sections. Open each section to update fields, verify configuration state, and fix missing dependencies.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {sectionStatuses.map((section, index) => {
                const toneClass = getStatusTone(section.status);
                return (
                  <details
                    key={section.id}
                    open={index === 0 || section.status !== "configured"}
                    className="rounded-xl border border-border/70 bg-card/70"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                      <div>
                        <p className="text-sm font-semibold">{section.title}</p>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={toneClass}>
                          {getStatusLabel(section.status)}
                        </Badge>
                        <span className={`text-xs font-medium ${toneClass}`}>
                          {section.configuredCount}/{section.totalCount}
                        </span>
                      </div>
                    </summary>
                    <div className="space-y-3 border-t border-border/60 p-3 pt-4">
                      {renderSectionFields(section.id)}
                      <div className="grid gap-2 md:grid-cols-2">
                        {section.dependencies.map((dependency) => (
                          <div key={dependency.id} className="rounded-lg border border-border/60 bg-muted/20 p-2 text-xs">
                            <p className="font-medium">{dependency.label}</p>
                            <p className={dependency.configured ? "text-success" : "text-destructive"}>
                              {dependency.configured ? "Configured" : "Missing"}
                              {dependency.source && dependency.source !== "missing" ? ` · ${getSourceLabel(dependency.source)}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || loading}>
                {saving ? "Saving..." : "Save Integrations"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
