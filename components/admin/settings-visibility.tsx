"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Eye, EyeOff, PencilLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicPagePath, PublicPageSettings } from "@/types/site-settings";

type VisibilityPayload = {
  pages: PublicPageSettings;
  error?: string;
};

const pageMeta: Array<{ path: PublicPagePath; helper: string }> = [
  { path: "/", helper: "Main landing page" },
  { path: "/about", helper: "Profile and background page" },
  { path: "/ai-news", helper: "AI update feed page" },
  { path: "/experience", helper: "Experience timeline page" },
  { path: "/projects", helper: "Projects listing and detail routes" },
  { path: "/services", helper: "Services listing page" },
  { path: "/certificates", helper: "Certificates page" },
  { path: "/blog", helper: "Blog listing and detail routes" },
  { path: "/creator", helper: "Creator listing and detail routes" },
  { path: "/public-statement", helper: "Identity statement page" },
  { path: "/book-meeting", helper: "Booking entry page" },
  { path: "/contact", helper: "Contact page" }
];

const helperByPath = new Map(pageMeta.map((item) => [item.path, item.helper] as const));

const defaultPages: PublicPageSettings = pageMeta.map((item, index) => ({
  path: item.path,
  enabled: true,
  name: pathToName(item.path),
  description: helperByPath.get(item.path) ?? "",
  link: item.path,
  menuOrder: index,
  seoTitle: pathToName(item.path),
  seoDescription: helperByPath.get(item.path) ?? "",
  seoKeywords: "",
  seoImage: ""
}));

function pathToName(path: PublicPagePath) {
  if (path === "/") return "Home";
  if (path === "/ai-news") return "AI News";
  if (path === "/public-statement") return "Public Statement";
  if (path === "/book-meeting") return "Book Meeting";
  return path.slice(1).charAt(0).toUpperCase() + path.slice(2);
}

function canonicalizePages(pages: PublicPageSettings) {
  return [...pages]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((item) => ({
      path: item.path,
      enabled: item.enabled,
      name: item.name.trim(),
      description: item.description.trim(),
      link: item.link.trim(),
      menuOrder: item.menuOrder,
      seoTitle: item.seoTitle.trim(),
      seoDescription: item.seoDescription.trim(),
      seoKeywords: item.seoKeywords.trim(),
      seoImage: item.seoImage.trim()
    }));
}

export function SettingsVisibility() {
  const [pages, setPages] = useState<PublicPageSettings>(defaultPages);
  const [savedPages, setSavedPages] = useState<PublicPageSettings>(defaultPages);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPath, setEditingPath] = useState<PublicPagePath | null>(null);

  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.menuOrder - b.menuOrder || a.name.localeCompare(b.name) || a.path.localeCompare(b.path)),
    [pages]
  );

  const hasChanges = useMemo(
    () => JSON.stringify(canonicalizePages(pages)) !== JSON.stringify(canonicalizePages(savedPages)),
    [pages, savedPages]
  );

  const publishedCount = useMemo(() => pages.filter((item) => item.enabled).length, [pages]);
  const hiddenCount = pages.length - publishedCount;
  const editingPage = useMemo(() => pages.find((item) => item.path === editingPath) ?? null, [editingPath, pages]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setStatus("");
      try {
        const response = await fetch("/api/admin/settings/visibility");
        const payload = (await response.json()) as VisibilityPayload;
        if (!response.ok) throw new Error(payload.error ?? "Unable to load page settings");
        if (!mounted) return;
        const loadedPages = payload.pages?.length ? payload.pages : defaultPages;
        setPages(loadedPages);
        setSavedPages(loadedPages);
      } catch (error) {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Unable to load page settings");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  function updatePage(path: PublicPagePath, patch: Partial<(typeof pages)[number]>) {
    setPages((prev) => prev.map((item) => (item.path === path ? { ...item, ...patch } : item)));
  }

  function movePage(path: PublicPagePath, direction: -1 | 1) {
    const sorted = [...pages].sort(
      (a, b) => a.menuOrder - b.menuOrder || a.name.localeCompare(b.name) || a.path.localeCompare(b.path)
    );
    const index = sorted.findIndex((item) => item.path === path);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;

    const current = sorted[index];
    const target = sorted[targetIndex];

    setPages((prev) =>
      prev.map((item) => {
        if (item.path === current.path) return { ...item, menuOrder: target.menuOrder };
        if (item.path === target.path) return { ...item, menuOrder: current.menuOrder };
        return item;
      })
    );
  }

  async function onSave(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/settings/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages })
      });

      const payload = (await response.json()) as VisibilityPayload;
      if (!response.ok) throw new Error(payload.error ?? "Unable to save page settings");
      const updatedPages = payload.pages?.length ? payload.pages : pages;
      setPages(updatedPages);
      setSavedPages(updatedPages);
      setStatus("Page settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save page settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--accent)/0.2),transparent_45%),radial-gradient(circle_at_100%_100%,hsl(var(--primary)/0.15),transparent_40%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Page Control Center</CardTitle>
              <CardDescription>
                Publish/unpublish pages, edit labels and descriptions, set links, and reorder menu items from one screen.
              </CardDescription>
              {status ? <p className="mt-2 text-sm text-primary">{status}</p> : null}
            </div>
            <Button onClick={() => void onSave()} disabled={saving || loading || !hasChanges}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Published</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{publishedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hidden</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{hiddenCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Changes</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {hasChanges ? "Unsaved changes" : "All changes saved"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Public Pages</CardTitle>
          <CardDescription>
            Click Edit to open settings for a page. Use arrows to sort menu order. Save when finished.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-3">
            {sortedPages.map((page, index) => (
              <div key={page.path} className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-elev1">
                <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr] lg:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">#{String(index + 1).padStart(2, "0")}</Badge>
                      <p className="text-base font-semibold text-foreground">{page.name}</p>
                      <Badge variant={page.enabled ? "default" : "outline"}>{page.enabled ? "Published" : "Hidden"}</Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">{page.path}</p>
                    <p className="text-sm text-foreground/75">{page.description || helperByPath.get(page.path) || "No description set."}</p>
                    <p className="text-xs text-muted-foreground">
                      SEO: {page.seoTitle ? "title set" : "title missing"} · {page.seoDescription ? "meta description set" : "meta description missing"}
                    </p>

                    <Link
                      href={page.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                    >
                      {page.link}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant={page.enabled ? "outline" : "default"}
                      size="sm"
                      disabled={loading || saving}
                      onClick={() => updatePage(page.path, { enabled: !page.enabled })}
                    >
                      {page.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {page.enabled ? "Unpublish" : "Publish"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={loading || saving || index === 0}
                      onClick={() => movePage(page.path, -1)}
                      aria-label={`Move ${page.name} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={loading || saving || index === sortedPages.length - 1}
                      onClick={() => movePage(page.path, 1)}
                      aria-label={`Move ${page.name} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>

                    <Button type="button" variant="outline" size="sm" disabled={loading || saving} onClick={() => setEditingPath(page.path)}>
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving || loading || !hasChanges}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingPage)} onOpenChange={(open) => (!open ? setEditingPath(null) : undefined)}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto">
          {editingPage ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit {editingPage.name}</DialogTitle>
                <DialogDescription>Update visibility, menu settings, and SEO fields for this page.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2">
                  <Label htmlFor={`edit-enabled-${editingPage.path}`}>Published</Label>
                  <Checkbox
                    id={`edit-enabled-${editingPage.path}`}
                    checked={editingPage.enabled}
                    disabled={saving}
                    onChange={(event) => updatePage(editingPage.path, { enabled: event.currentTarget.checked })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`edit-name-${editingPage.path}`}>Page name</Label>
                  <Input
                    id={`edit-name-${editingPage.path}`}
                    value={editingPage.name}
                    disabled={saving}
                    onChange={(event) => updatePage(editingPage.path, { name: event.currentTarget.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`edit-link-${editingPage.path}`}>Link</Label>
                  <Input
                    id={`edit-link-${editingPage.path}`}
                    value={editingPage.link}
                    disabled={saving}
                    onChange={(event) => updatePage(editingPage.path, { link: event.currentTarget.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`edit-order-${editingPage.path}`}>Menu order</Label>
                  <Input
                    id={`edit-order-${editingPage.path}`}
                    type="number"
                    min={0}
                    step={1}
                    value={editingPage.menuOrder}
                    disabled={saving}
                    onChange={(event) => {
                      const value = Number.parseInt(event.currentTarget.value, 10);
                      updatePage(editingPage.path, { menuOrder: Number.isFinite(value) ? Math.max(0, value) : 0 });
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`edit-desc-${editingPage.path}`}>Description</Label>
                  <Textarea
                    id={`edit-desc-${editingPage.path}`}
                    rows={3}
                    value={editingPage.description}
                    disabled={saving}
                    onChange={(event) => updatePage(editingPage.path, { description: event.currentTarget.value })}
                  />
                </div>

                <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">SEO Settings</p>
                  <div className="mt-3 grid gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-seo-title-${editingPage.path}`}>SEO title</Label>
                      <Input
                        id={`edit-seo-title-${editingPage.path}`}
                        value={editingPage.seoTitle}
                        disabled={saving}
                        onChange={(event) => updatePage(editingPage.path, { seoTitle: event.currentTarget.value })}
                        placeholder={editingPage.name}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-seo-description-${editingPage.path}`}>Meta description</Label>
                      <Textarea
                        id={`edit-seo-description-${editingPage.path}`}
                        rows={3}
                        value={editingPage.seoDescription}
                        disabled={saving}
                        onChange={(event) => updatePage(editingPage.path, { seoDescription: event.currentTarget.value })}
                        placeholder={editingPage.description}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-seo-keywords-${editingPage.path}`}>SEO keywords (comma-separated)</Label>
                      <Textarea
                        id={`edit-seo-keywords-${editingPage.path}`}
                        rows={2}
                        value={editingPage.seoKeywords}
                        disabled={saving}
                        onChange={(event) => updatePage(editingPage.path, { seoKeywords: event.currentTarget.value })}
                        placeholder="software engineer, AI, healthcare"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-seo-image-${editingPage.path}`}>SEO image URL</Label>
                      <Input
                        id={`edit-seo-image-${editingPage.path}`}
                        value={editingPage.seoImage}
                        disabled={saving}
                        onChange={(event) => updatePage(editingPage.path, { seoImage: event.currentTarget.value })}
                        placeholder="/og-image.png"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingPath(null)} disabled={saving}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
