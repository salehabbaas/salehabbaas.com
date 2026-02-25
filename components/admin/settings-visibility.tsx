"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { PageVisibilitySettings, PublicPagePath } from "@/types/site-settings";

type VisibilityPayload = {
  visibility: PageVisibilitySettings;
};

const pageMeta: Array<{ path: PublicPagePath; label: string; helper: string }> = [
  { path: "/", label: "Home", helper: "Main landing page" },
  { path: "/about", label: "About", helper: "Profile and background page" },
  { path: "/ai-news", label: "AI News", helper: "AI update feed page" },
  { path: "/experience", label: "Experience", helper: "Experience timeline page" },
  { path: "/projects", label: "Projects", helper: "Projects listing and detail routes" },
  { path: "/services", label: "Services", helper: "Services listing page" },
  { path: "/certificates", label: "Certificates", helper: "Certificates page" },
  { path: "/blog", label: "Blog", helper: "Blog listing and detail routes" },
  { path: "/creator", label: "Creator", helper: "Creator listing and detail routes" },
  { path: "/public-statement", label: "Public Statement", helper: "Identity statement page" },
  { path: "/book-meeting", label: "Book Meeting", helper: "Booking entry page" },
  { path: "/contact", label: "Contact", helper: "Contact page" }
];

const defaultVisibility: PageVisibilitySettings = {
  "/": true,
  "/about": true,
  "/ai-news": true,
  "/experience": true,
  "/projects": true,
  "/services": true,
  "/certificates": true,
  "/blog": true,
  "/creator": true,
  "/public-statement": true,
  "/book-meeting": true,
  "/contact": true
};

export function SettingsVisibility() {
  const [visibility, setVisibility] = useState<PageVisibilitySettings>(defaultVisibility);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setStatus("");
      try {
        const response = await fetch("/api/admin/settings/visibility");
        const payload = (await response.json()) as VisibilityPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load visibility");
        if (!mounted) return;
        setVisibility(payload.visibility);
      } catch (error) {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Unable to load visibility");
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
      const response = await fetch("/api/admin/settings/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visibility)
      });
      const payload = (await response.json()) as VisibilityPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save visibility");
      setVisibility(payload.visibility);
      setStatus("Visibility saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save visibility");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Page Visibility</CardTitle>
          <CardDescription>
            Hidden pages are hard-blocked publicly (404) and removed from header, footer, search, and sitemap.
          </CardDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top-level Public Routes</CardTitle>
          <CardDescription>Content-level publish/hide controls are managed in each CMS owner page.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {pageMeta.map((item) => (
                <div key={item.path} className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-sm normal-case tracking-normal">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.path}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                    </div>
                    <Checkbox
                      checked={visibility[item.path]}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setVisibility((prev) => ({
                          ...prev,
                          [item.path]: checked
                        }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button type="submit" disabled={saving || loading}>
              {saving ? "Saving..." : "Save Visibility"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
