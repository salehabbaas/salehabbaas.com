"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AdminFieldLabel } from "@/components/admin/admin-field-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminIntegrationSettings, SecretPresence } from "@/types/site-settings";

type Payload = {
  integrations: AdminIntegrationSettings;
  secretPresence: SecretPresence;
};

const defaultIntegrations: AdminIntegrationSettings = {
  emailProvider: "resend",
  senderEmail: "",
  senderName: "Saleh Abbaas",
  contactFunctionUrl: "",
  bookingFunctionUrl: "",
  googleCalendarId: "primary",
  geminiModel: "gemini-2.5-flash",
  geminiTextModel: ""
};

const defaultPresence: SecretPresence = {
  resendApiKey: false,
  sendgridApiKey: false,
  mailgunApiKey: false,
  mailgunDomain: false,
  googleServiceAccountEmail: false,
  googleServiceAccountPrivateKey: false,
  geminiApiKey: false,
  googleApiKey: false
};

const secretDefinitions: Array<{ key: keyof SecretPresence; label: string }> = [
  { key: "resendApiKey", label: "Resend API Key" },
  { key: "sendgridApiKey", label: "SendGrid API Key" },
  { key: "mailgunApiKey", label: "Mailgun API Key" },
  { key: "mailgunDomain", label: "Mailgun Domain" },
  { key: "googleServiceAccountEmail", label: "Google Service Account Email" },
  { key: "googleServiceAccountPrivateKey", label: "Google Service Account Private Key" },
  { key: "geminiApiKey", label: "Gemini API Key" },
  { key: "googleApiKey", label: "Google API Key" }
];

export function SettingsIntegrations() {
  const [integrations, setIntegrations] = useState<AdminIntegrationSettings>(defaultIntegrations);
  const [presence, setPresence] = useState<SecretPresence>(defaultPresence);
  const [secretInput, setSecretInput] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const secretConfiguredCount = useMemo(
    () => secretDefinitions.filter((item) => presence[item.key]).length,
    [presence]
  );

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const secrets: Record<string, string> = {};
      Object.entries(secretInput).forEach(([key, value]) => {
        if (value.trim()) secrets[key] = value.trim();
      });

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
      setSecretInput({});
      setStatus("Settings saved.");
      setEditorOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

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
          <Button variant="outline" asChild>
            <Link href="/admin/settings/health">Open Health</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
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
            <p className="mt-2 text-2xl font-semibold">{secretConfiguredCount}/{secretDefinitions.length}</p>
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
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-5xl">
          <form onSubmit={onSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit Runtime Integrations</DialogTitle>
              <DialogDescription>Required and optional fields are labeled for faster setup.</DialogDescription>
            </DialogHeader>

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
                  <option value="zoho">Zoho (reserved)</option>
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

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="integration-calendar-id" label="Google Calendar ID" required />
                <Input
                  id="integration-calendar-id"
                  value={integrations.googleCalendarId}
                  onChange={(event) => setIntegrations((prev) => ({ ...prev, googleCalendarId: event.target.value }))}
                  required
                />
              </div>
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
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Secret Key Inputs (write-only)</p>
              <div className="grid gap-3 md:grid-cols-2">
                {secretDefinitions.map((item) => (
                  <div key={item.key} className="space-y-2 rounded-xl border border-border/70 bg-card/70 p-3">
                    <AdminFieldLabel htmlFor={`secret-${item.key}`} label={item.label} />
                    <Input
                      id={`secret-${item.key}`}
                      type={item.key.toLowerCase().includes("key") ? "password" : "text"}
                      value={secretInput[item.key] ?? ""}
                      onChange={(event) => setSecretInput((prev) => ({ ...prev, [item.key]: event.target.value }))}
                      placeholder={presence[item.key] ? "Configured (enter to replace)" : "Not configured"}
                    />
                    <p className={`text-xs ${presence[item.key] ? "text-success" : "text-destructive"}`}>
                      {presence[item.key] ? "Configured" : "Missing"}
                    </p>
                  </div>
                ))}
              </div>
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
