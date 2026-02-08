"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { db, auth } from "@/lib/firebase/client";
import { formatDate, slugify } from "@/lib/utils";
import {
  ContentItem,
  ContentStatus,
  ContentVariant,
  CreatorSettings,
  CreatorTemplate,
  Platform,
  TopicPillar,
  Visibility
} from "@/types/creator";

function timestampToIso(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

function toDatetimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function fromDatetimeInput(value: string) {
  if (!value) return null;
  return new Date(value);
}

const defaultItem: Omit<ContentItem, "id"> = {
  title: "",
  pillar: "Software",
  type: "post",
  status: "idea",
  notes: "",
  tags: []
};

const defaultVariant: Omit<ContentVariant, "id"> = {
  contentItemId: "",
  contentTitle: "",
  contentType: "post",
  platform: "linkedin",
  slug: "",
  visibility: "private",
  hook: "",
  body: "",
  cta: "",
  hashtags: [],
  media: [],
  scheduledAt: null,
  publishedAt: null,
  externalUrl: "",
  seoTitle: "",
  seoDesc: "",
  ogImage: "",
  pillar: "Software",
  tags: [],
  metrics: {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    watchTime: 0,
    followersGained: 0,
    recordedAt: ""
  }
};

export function CreatorManager() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedContentId, setSelectedContentId] = useState("");
  const [variants, setVariants] = useState<ContentVariant[]>([]);
  const [itemForm, setItemForm] = useState(defaultItem);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState(defaultVariant);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [allVariants, setAllVariants] = useState<ContentVariant[]>([]);
  const [settings, setSettings] = useState<CreatorSettings>({
    pillars: ["AI", "HealthTech", "Software", "Cloud", "Cybersecurity", "Career", "Other"],
    platforms: ["linkedin", "youtube", "instagram", "tiktok", "x"],
    pinnedVariantSlugs: [],
    newsletterEnabled: true,
    defaultVisibility: "private",
    socialLinks: []
  });
  const [templates, setTemplates] = useState<CreatorTemplate[]>([]);
  const [hooks, setHooks] = useState<string[]>([]);
  const [ctas, setCtas] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const q = query(collection(db, "contentItems"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snap) => {
      const mapped = snap.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          title: data.title ?? "",
          pillar: data.pillar ?? "Software",
          type: data.type ?? "post",
          status: data.status ?? "idea",
          notes: data.notes ?? "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt)
        } satisfies ContentItem;
      });
      setContentItems(mapped);
      if (!selectedContentId && mapped[0]?.id) {
        setSelectedContentId(mapped[0].id);
      }
    });
  }, [selectedContentId]);

  useEffect(() => {
    if (!selectedContentId) {
      setVariants([]);
      return;
    }

    const q = query(collection(db, "contentItems", selectedContentId, "variants"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snap) => {
      const mapped = snap.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          contentItemId: data.contentItemId ?? selectedContentId,
          contentTitle: data.contentTitle ?? "",
          contentType: data.contentType ?? "post",
          platform: data.platform ?? "linkedin",
          slug: data.slug ?? "",
          visibility: data.visibility ?? "private",
          hook: data.hook ?? "",
          body: data.body ?? "",
          cta: data.cta ?? "",
          hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
          media: Array.isArray(data.media) ? data.media : [],
          scheduledAt: timestampToIso(data.scheduledAt),
          publishedAt: timestampToIso(data.publishedAt),
          externalUrl: data.externalUrl ?? "",
          seoTitle: data.seoTitle ?? "",
          seoDesc: data.seoDesc ?? "",
          ogImage: data.ogImage ?? "",
          pillar: data.pillar ?? "Software",
          tags: Array.isArray(data.tags) ? data.tags : [],
          metrics: data.metrics ?? defaultVariant.metrics,
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt)
        } satisfies ContentVariant;
      });
      setVariants(mapped);
    });
  }, [selectedContentId]);

  useEffect(() => {
    const q = query(
      collectionGroup(db, "variants"),
      where("visibility", "in", ["private", "unlisted", "public"]),
      orderBy("publishedAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setAllVariants(
        snap.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            contentItemId: data.contentItemId ?? "",
            contentTitle: data.contentTitle ?? "",
            contentType: data.contentType ?? "post",
            platform: data.platform ?? "linkedin",
            slug: data.slug ?? "",
            visibility: data.visibility ?? "private",
            hook: data.hook ?? "",
            body: data.body ?? "",
            cta: data.cta ?? "",
            hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
            media: Array.isArray(data.media) ? data.media : [],
            scheduledAt: timestampToIso(data.scheduledAt),
            publishedAt: timestampToIso(data.publishedAt),
            externalUrl: data.externalUrl ?? "",
            seoTitle: data.seoTitle ?? "",
            seoDesc: data.seoDesc ?? "",
            ogImage: data.ogImage ?? "",
            pillar: data.pillar ?? "Software",
            tags: Array.isArray(data.tags) ? data.tags : [],
            metrics: data.metrics ?? defaultVariant.metrics,
            createdAt: timestampToIso(data.createdAt),
            updatedAt: timestampToIso(data.updatedAt)
          } satisfies ContentVariant;
        })
      );
    });
  }, []);

  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, "creatorSettings", "default"), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setSettings((prev) => ({
        ...prev,
        pillars: data.pillars ?? prev.pillars,
        platforms: data.platforms ?? prev.platforms,
        pinnedVariantSlugs: data.pinnedVariantSlugs ?? prev.pinnedVariantSlugs,
        newsletterEnabled: data.newsletterEnabled ?? prev.newsletterEnabled,
        defaultVisibility: data.defaultVisibility ?? prev.defaultVisibility,
        socialLinks: data.socialLinks ?? prev.socialLinks
      }));
    });

    const unsubscribeTemplates = onSnapshot(collection(db, "creatorTemplates"), (snap) => {
      setTemplates(
        snap.docs.map((document) => ({
          id: document.id,
          name: document.data().name ?? "",
          platform: document.data().platform ?? "linkedin",
          hook: document.data().hook ?? "",
          body: document.data().body ?? "",
          cta: document.data().cta ?? "",
          hashtags: document.data().hashtags ?? []
        }))
      );
    });

    const unsubscribeHooks = onSnapshot(collection(db, "hookLibrary"), (snap) => {
      setHooks(snap.docs.map((document) => document.data().text).filter(Boolean));
    });

    const unsubscribeCtas = onSnapshot(collection(db, "ctaLibrary"), (snap) => {
      setCtas(snap.docs.map((document) => document.data().text).filter(Boolean));
    });

    return () => {
      unsubscribeSettings();
      unsubscribeTemplates();
      unsubscribeHooks();
      unsubscribeCtas();
    };
  }, []);

  const selectedContent = useMemo(
    () => contentItems.find((item) => item.id === selectedContentId) ?? null,
    [contentItems, selectedContentId]
  );

  const scheduledVariants = useMemo(
    () =>
      allVariants
        .filter((variant) => variant.scheduledAt)
        .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime()),
    [allVariants]
  );

  const growthInsights = useMemo(() => {
    const topicScores = new Map<string, number>();
    const platformScores = new Map<string, number>();
    const hookScores: Array<{ hook: string; views: number }> = [];

    allVariants.forEach((variant) => {
      const views = Number(variant.metrics?.views ?? 0);
      topicScores.set(variant.pillar, (topicScores.get(variant.pillar) ?? 0) + views);
      platformScores.set(variant.platform, (platformScores.get(variant.platform) ?? 0) + views);
      if (variant.hook) {
        hookScores.push({ hook: variant.hook, views });
      }
    });

    return {
      bestTopics: Array.from(topicScores.entries())
        .map(([topic, views]) => ({ topic, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
      bestPlatforms: Array.from(platformScores.entries())
        .map(([platform, views]) => ({ platform, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
      bestHooks: hookScores.sort((a, b) => b.views - a.views).slice(0, 5)
    };
  }, [allVariants]);

  async function saveContentItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...itemForm,
      tags: itemForm.tags,
      updatedAt: serverTimestamp()
    };

    if (editingItemId) {
      await updateDoc(doc(db, "contentItems", editingItemId), payload);
      setStatusMessage("Content item updated.");
    } else {
      const created = await addDoc(collection(db, "contentItems"), {
        ...payload,
        createdAt: serverTimestamp()
      });
      setSelectedContentId(created.id);
      setStatusMessage("Content item created.");
    }

    setEditingItemId(null);
    setItemForm(defaultItem);
  }

  async function ensureUniqueSlug(baseSlug: string) {
    let candidate = baseSlug;
    let offset = 1;

    while (true) {
      const existing = await getDocs(query(collectionGroup(db, "variants"), where("slug", "==", candidate)));
      const conflict = existing.docs.some((document) => document.id !== editingVariantId);
      if (!conflict) return candidate;
      candidate = `${baseSlug}-${offset}`;
      offset += 1;
    }
  }

  async function saveVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContent) return;

    const draftSlug = variantForm.slug || slugify(`${selectedContent.title}-${variantForm.platform}`);
    const uniqueSlug = await ensureUniqueSlug(draftSlug);

    const payload = {
      ...variantForm,
      contentItemId: selectedContent.id,
      contentTitle: selectedContent.title,
      contentType: selectedContent.type,
      pillar: selectedContent.pillar,
      tags: selectedContent.tags,
      slug: uniqueSlug,
      scheduledAt: fromDatetimeInput(variantForm.scheduledAt || ""),
      publishedAt: fromDatetimeInput(variantForm.publishedAt || ""),
      updatedAt: serverTimestamp()
    };

    if (editingVariantId) {
      await updateDoc(doc(db, "contentItems", selectedContent.id, "variants", editingVariantId), payload);
      setStatusMessage("Variant updated.");
    } else {
      await addDoc(collection(db, "contentItems", selectedContent.id, "variants"), {
        ...payload,
        createdAt: serverTimestamp()
      });
      setStatusMessage("Variant created.");
    }

    const inferredStatus: ContentStatus = payload.publishedAt
      ? "published"
      : payload.scheduledAt
        ? "scheduled"
        : "ready";

    await updateDoc(doc(db, "contentItems", selectedContent.id), {
      status: inferredStatus,
      updatedAt: serverTimestamp()
    });

    setEditingVariantId(null);
    setVariantForm({ ...defaultVariant, pillar: selectedContent.pillar, tags: selectedContent.tags, contentItemId: selectedContent.id });
  }

  async function markVariantPublished(variant: ContentVariant) {
    if (!selectedContent) return;

    await updateDoc(doc(db, "contentItems", selectedContent.id, "variants", variant.id), {
      publishedAt: new Date(),
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, "contentItems", selectedContent.id), {
      status: "published",
      updatedAt: serverTimestamp()
    });

    setStatusMessage("Variant marked as published.");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await setDoc(
      doc(db, "creatorSettings", "default"),
      {
        ...settings,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    setStatusMessage("Creator settings saved.");
  }

  async function createTemplate() {
    await addDoc(collection(db, "creatorTemplates"), {
      name: `Template ${templates.length + 1}`,
      platform: variantForm.platform,
      hook: variantForm.hook,
      body: variantForm.body,
      cta: variantForm.cta,
      hashtags: variantForm.hashtags,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    setStatusMessage("Template saved.");
  }

  async function addHook(text: string) {
    if (!text.trim()) return;
    await addDoc(collection(db, "hookLibrary"), {
      text: text.trim(),
      createdAt: serverTimestamp()
    });
    setStatusMessage("Hook saved.");
  }

  async function addCta(text: string) {
    if (!text.trim()) return;
    await addDoc(collection(db, "ctaLibrary"), {
      text: text.trim(),
      createdAt: serverTimestamp()
    });
    setStatusMessage("CTA saved.");
  }

  async function requestRevalidate() {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const response = await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ paths: ["/", "/creator"] })
    });

    if (response.ok) {
      setStatusMessage("Revalidation triggered.");
    } else {
      setStatusMessage("Failed to revalidate cache.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Creator OS</CardTitle>
          <CardDescription>Build, schedule, publish, and track platform-specific content variants.</CardDescription>
          {statusMessage ? <p className="text-sm text-primary">{statusMessage}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content Items</CardTitle>
            <CardDescription>Lifecycle: idea, draft, ready, scheduled, published.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={saveContentItem} className="space-y-3">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={itemForm.title}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Pillar</Label>
                  <Select
                    value={itemForm.pillar}
                    onChange={(event) => setItemForm((prev) => ({ ...prev, pillar: event.target.value as TopicPillar }))}
                  >
                    <option value="AI">AI</option>
                    <option value="HealthTech">HealthTech</option>
                    <option value="Software">Software</option>
                    <option value="Cloud">Cloud</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Career">Career</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={itemForm.type}
                    onChange={(event) => setItemForm((prev) => ({ ...prev, type: event.target.value as ContentItem["type"] }))}
                  >
                    <option value="short_video">Short video</option>
                    <option value="carousel">Carousel</option>
                    <option value="post">Post</option>
                    <option value="thread">Thread</option>
                    <option value="article">Article</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={itemForm.status}
                    onChange={(event) => setItemForm((prev) => ({ ...prev, status: event.target.value as ContentStatus }))}
                  >
                    <option value="idea">Idea</option>
                    <option value="draft">Draft</option>
                    <option value="ready">Ready</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={itemForm.tags.join(", ")}
                  onChange={(event) =>
                    setItemForm((prev) => ({
                      ...prev,
                      tags: event.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={itemForm.notes}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
              <Button type="submit">{editingItemId ? "Update Item" : "Create Item"}</Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setSelectedContentId(item.id)}
                        className={`text-left ${item.id === selectedContentId ? "font-semibold text-primary" : ""}`}
                      >
                        {item.title}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingItemId(item.id);
                          setItemForm({
                            title: item.title,
                            pillar: item.pillar,
                            type: item.type,
                            status: item.status,
                            notes: item.notes,
                            tags: item.tags
                          });
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Variants {selectedContent ? `for ${selectedContent.title}` : ""}</CardTitle>
            <CardDescription>Each variant has independent scheduling, URL, visibility, SEO, and metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={saveVariant} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Platform</Label>
                  <Select
                    value={variantForm.platform}
                    onChange={(event) => setVariantForm((prev) => ({ ...prev, platform: event.target.value as Platform }))}
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="x">X</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={variantForm.visibility}
                    onChange={(event) => setVariantForm((prev) => ({ ...prev, visibility: event.target.value as Visibility }))}
                  >
                    <option value="private">private</option>
                    <option value="unlisted">unlisted</option>
                    <option value="public">public</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={variantForm.slug}
                  onChange={(event) => setVariantForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                  placeholder="auto-generated-if-empty"
                />
              </div>

              <div className="space-y-2">
                <Label>Hook</Label>
                <Textarea value={variantForm.hook} onChange={(event) => setVariantForm((prev) => ({ ...prev, hook: event.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Body / Script</Label>
                <Textarea
                  className="min-h-[150px]"
                  value={variantForm.body}
                  onChange={(event) => setVariantForm((prev) => ({ ...prev, body: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>CTA</Label>
                <Textarea value={variantForm.cta} onChange={(event) => setVariantForm((prev) => ({ ...prev, cta: event.target.value }))} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Hashtags (comma separated)</Label>
                  <Input
                    value={variantForm.hashtags.join(", ")}
                    onChange={(event) =>
                      setVariantForm((prev) => ({
                        ...prev,
                        hashtags: event.target.value
                          .split(",")
                          .map((tag) => tag.trim().replace(/^#/, ""))
                          .filter(Boolean)
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Media URLs (comma separated)</Label>
                  <Input
                    value={variantForm.media.join(", ")}
                    onChange={(event) =>
                      setVariantForm((prev) => ({
                        ...prev,
                        media: event.target.value
                          .split(",")
                          .map((url) => url.trim())
                          .filter(Boolean)
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Scheduled At</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeInput(variantForm.scheduledAt)}
                    onChange={(event) => setVariantForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Published At</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeInput(variantForm.publishedAt)}
                    onChange={(event) => setVariantForm((prev) => ({ ...prev, publishedAt: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>External URL</Label>
                  <Input
                    value={variantForm.externalUrl}
                    onChange={(event) => setVariantForm((prev) => ({ ...prev, externalUrl: event.target.value }))}
                    placeholder="https://linkedin.com/posts/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>OG Image URL</Label>
                  <Input
                    value={variantForm.ogImage}
                    onChange={(event) => setVariantForm((prev) => ({ ...prev, ogImage: event.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>SEO Title</Label>
                <Input
                  value={variantForm.seoTitle}
                  onChange={(event) => setVariantForm((prev) => ({ ...prev, seoTitle: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>SEO Description</Label>
                <Textarea
                  value={variantForm.seoDesc}
                  onChange={(event) => setVariantForm((prev) => ({ ...prev, seoDesc: event.target.value }))}
                />
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                <p className="text-sm font-medium">Metrics</p>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {["views", "likes", "comments", "shares", "saves", "watchTime", "followersGained"].map((key) => (
                    <Input
                      key={key}
                      type="number"
                      placeholder={key}
                      value={(variantForm.metrics?.[key as keyof NonNullable<ContentVariant["metrics"]>] as number | undefined) ?? 0}
                      onChange={(event) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          metrics: {
                            ...prev.metrics,
                            [key]: Number(event.target.value || 0)
                          }
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit">{editingVariantId ? "Update Variant" : "Create Variant"}</Button>
                <Button type="button" variant="outline" onClick={createTemplate}>
                  Save as Template
                </Button>
                <Button type="button" variant="secondary" onClick={requestRevalidate}>
                  Revalidate Public Cache
                </Button>
              </div>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>{variant.platform}</TableCell>
                    <TableCell>{variant.visibility}</TableCell>
                    <TableCell>{formatDate(variant.publishedAt || variant.scheduledAt)}</TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingVariantId(variant.id);
                          setVariantForm({
                            ...variant,
                            scheduledAt: variant.scheduledAt,
                            publishedAt: variant.publishedAt,
                            metrics: {
                              views: variant.metrics?.views ?? 0,
                              likes: variant.metrics?.likes ?? 0,
                              comments: variant.metrics?.comments ?? 0,
                              shares: variant.metrics?.shares ?? 0,
                              saves: variant.metrics?.saves ?? 0,
                              watchTime: variant.metrics?.watchTime ?? 0,
                              followersGained: variant.metrics?.followersGained ?? 0,
                              recordedAt: variant.metrics?.recordedAt ?? ""
                            }
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => markVariantPublished(variant)}>
                        Mark Published
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Calendar View</CardTitle>
            <CardDescription>Chronological upcoming schedule for all platform variants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {scheduledVariants.length ? (
              scheduledVariants.map((variant) => (
                <div key={variant.id} className="rounded-2xl border border-border/70 bg-card/80 p-3 text-sm">
                  <p className="font-medium">{variant.contentTitle}</p>
                  <p className="text-muted-foreground">
                    {variant.platform} • {variant.visibility} • {formatDate(variant.scheduledAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No scheduled variants yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Templates + Hook/CTA Library</CardTitle>
            <CardDescription>Reusable blocks for faster ideation and writing workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Saved Templates</Label>
              <div className="max-h-52 space-y-2 overflow-auto pr-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="w-full rounded-2xl border border-border/70 bg-card/80 p-3 text-left"
                    onClick={() =>
                      setVariantForm((prev) => ({
                        ...prev,
                        platform: template.platform,
                        hook: template.hook,
                        body: template.body,
                        cta: template.cta,
                        hashtags: template.hashtags
                      }))
                    }
                  >
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.platform}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Hook Library</Label>
                <div className="max-h-36 space-y-1 overflow-auto pr-2 text-sm">
                  {hooks.map((hook) => (
                    <button
                      key={hook}
                      type="button"
                      className="w-full rounded-xl border border-border/70 bg-card/80 p-2 text-left hover:border-primary"
                      onClick={() => setVariantForm((prev) => ({ ...prev, hook }))}
                    >
                      {hook}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Add new hook"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const value = event.currentTarget.value;
                    addHook(value);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Library</Label>
                <div className="max-h-36 space-y-1 overflow-auto pr-2 text-sm">
                  {ctas.map((cta) => (
                    <button
                      key={cta}
                      type="button"
                      className="w-full rounded-xl border border-border/70 bg-card/80 p-2 text-left hover:border-primary"
                      onClick={() => setVariantForm((prev) => ({ ...prev, cta }))}
                    >
                      {cta}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Add new CTA"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const value = event.currentTarget.value;
                    addCta(value);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Creator Settings</CardTitle>
          <CardDescription>Pillars, platform options, default visibility, and pinned variants for homepage/public page.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveSettings} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Pillars</Label>
              <Input
                value={settings.pillars.join(", ")}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    pillars: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean)
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Platforms</Label>
              <Input
                value={settings.platforms.join(", ")}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    platforms: event.target.value
                      .split(",")
                      .map((value) => value.trim() as Platform)
                      .filter(Boolean)
                  }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Pinned Variant Slugs</Label>
              <Input
                value={settings.pinnedVariantSlugs.join(", ")}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    pinnedVariantSlugs: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean)
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Default Visibility</Label>
              <Select
                value={settings.defaultVisibility}
                onChange={(event) => setSettings((prev) => ({ ...prev, defaultVisibility: event.target.value as Visibility }))}
              >
                <option value="private">private</option>
                <option value="unlisted">unlisted</option>
                <option value="public">public</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Newsletter Enabled</Label>
              <Select
                value={String(settings.newsletterEnabled)}
                onChange={(event) => setSettings((prev) => ({ ...prev, newsletterEnabled: event.target.value === "true" }))}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboards</CardTitle>
          <CardDescription>Best topics, hooks, and platforms based on manually entered metrics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card/85 p-4">
            <p className="text-sm font-semibold">Best Topics</p>
            <div className="mt-3 space-y-2 text-sm">
              {growthInsights.bestTopics.map((item) => (
                <p key={item.topic}>
                  {item.topic} · {item.views} views
                </p>
              ))}
              {!growthInsights.bestTopics.length ? <p className="text-muted-foreground">No topic data yet.</p> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/85 p-4">
            <p className="text-sm font-semibold">Best Hooks</p>
            <div className="mt-3 space-y-2 text-sm">
              {growthInsights.bestHooks.map((item, index) => (
                <p key={`${item.hook}-${index}`}>{item.hook.slice(0, 60)} · {item.views} views</p>
              ))}
              {!growthInsights.bestHooks.length ? <p className="text-muted-foreground">No hook data yet.</p> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/85 p-4">
            <p className="text-sm font-semibold">Best Platforms</p>
            <div className="mt-3 space-y-2 text-sm">
              {growthInsights.bestPlatforms.map((item) => (
                <p key={item.platform}>
                  {item.platform} · {item.views} views
                </p>
              ))}
              {!growthInsights.bestPlatforms.length ? <p className="text-muted-foreground">No platform data yet.</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
