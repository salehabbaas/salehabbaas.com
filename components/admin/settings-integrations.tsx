"use client";

import { FormEvent, useEffect, useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function SettingsIntegrations() {
  const [integrations, setIntegrations] = useState<AdminIntegrationSettings>(defaultIntegrations);
  const [presence, setPresence] = useState<SecretPresence>(defaultPresence);
  const [secretInput, setSecretInput] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    load();
    return () => {
      mounted = false;
    };
  }, []);

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
          <CardDescription>Admin-managed integration settings and masked secret configuration.</CardDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Runtime Integrations</CardTitle>
          <CardDescription>These values are used first at runtime, then fallback to environment variables.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Email Provider</Label>
                <Select
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
                <Label>Sender Email</Label>
                <Input
                  value={integrations.senderEmail}
                  onChange={(event) => setIntegrations((prev) => ({ ...prev, senderEmail: event.target.value }))}
                  placeholder="noreply@salehabbaas.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Sender Name</Label>
                <Input
                  value={integrations.senderName}
                  onChange={(event) => setIntegrations((prev) => ({ ...prev, senderName: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Contact Function URL</Label>
                <Input
                  value={integrations.contactFunctionUrl}
                  onChange={(event) => setIntegrations((prev) => ({ ...prev, contactFunctionUrl: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Booking Function URL</Label>
                <Input
                  value={integrations.bookingFunctionUrl}
                  onChange={(event) => setIntegrations((prev) => ({ ...prev, bookingFunctionUrl: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Google Calendar ID</Label>
                <Input
                  value={integrations.googleCalendarId}
                  onChange={(event) => setIntegrations((prev) => ({ ...prev, googleCalendarId: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Gemini Model</Label>
                <Input
                  value={integrations.geminiModel}
                  onChange={(event) => setIntegrations((prev) => ({ ...prev, geminiModel: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Gemini Text Model</Label>
                <Input
                  value={integrations.geminiTextModel}
                  onChange={(event) => setIntegrations((prev) => ({ ...prev, geminiTextModel: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Secret Key Inputs (write-only)</p>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { key: "resendApiKey", label: "Resend API Key" },
                  { key: "sendgridApiKey", label: "SendGrid API Key" },
                  { key: "mailgunApiKey", label: "Mailgun API Key" },
                  { key: "mailgunDomain", label: "Mailgun Domain" },
                  { key: "googleServiceAccountEmail", label: "Google Service Account Email" },
                  { key: "googleServiceAccountPrivateKey", label: "Google Service Account Private Key" },
                  { key: "geminiApiKey", label: "Gemini API Key" },
                  { key: "googleApiKey", label: "Google API Key" }
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <Label>{item.label}</Label>
                    <Input
                      type={item.key.toLowerCase().includes("key") ? "password" : "text"}
                      value={secretInput[item.key] ?? ""}
                      onChange={(event) => setSecretInput((prev) => ({ ...prev, [item.key]: event.target.value }))}
                      placeholder={presence[item.key as keyof SecretPresence] ? "Configured (enter to replace)" : "Not configured"}
                    />
                    <p className={`text-xs ${presence[item.key as keyof SecretPresence] ? "text-success" : "text-destructive"}`}>
                      {presence[item.key as keyof SecretPresence] ? "Configured" : "Missing"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving || loading}>
              {saving ? "Saving..." : "Save Integrations"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health Owner Page</CardTitle>
          <CardDescription>Detailed diagnostics are owned by Settings / Health.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/settings/health" className="text-sm text-primary hover:text-primary/80">
            Open Settings / Health
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
