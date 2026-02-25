"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CirclePlus, Sparkles, WandSparkles } from "lucide-react";

import { AdminFieldLabel } from "@/components/admin/admin-field-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { defaultStudioConfig } from "@/lib/linkedin-studio/defaults";
import { formatDate } from "@/lib/utils";
import type { StudioCompany, StudioConfig, StudioExperience, StudioPostRecord, StudioPostVersion } from "@/types/linkedin-studio";

type PostDetailResponse = {
  post: StudioPostRecord;
  versions: StudioPostVersion[];
};

const cadenceOptions: Array<{ key: StudioConfig["settings"]["cadenceDaysOfWeek"][number]; label: string }> = [
  { key: "MO", label: "Mon" },
  { key: "TU", label: "Tue" },
  { key: "WE", label: "Wed" },
  { key: "TH", label: "Thu" },
  { key: "FR", label: "Fri" },
  { key: "SA", label: "Sat" },
  { key: "SU", label: "Sun" }
];

function toLines(input: string[]) {
  return input.join("\n");
}

function fromLines(input: string) {
  return input
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

function defaultCompany(): StudioCompany {
  return {
    name: "",
    website: "",
    notes: "",
    priority: 1,
    rotationWeight: 1
  };
}

function defaultExperience(): StudioExperience {
  return {
    roleTitle: "",
    company: "",
    industry: "",
    startDate: "",
    endDate: "",
    bullets: [],
    technologies: [],
    lessonsLearned: []
  };
}

export function LinkedinStudioManager() {
  const [config, setConfig] = useState<StudioConfig>(defaultStudioConfig);
  const [industriesText, setIndustriesText] = useState("");
  const [technologiesText, setTechnologiesText] = useState("");
  const [pillarsText, setPillarsText] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [status, setStatus] = useState("");

  const [manualCompany, setManualCompany] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [manualPillar, setManualPillar] = useState("");
  const [generating, setGenerating] = useState(false);
  const [syncingFromWebsite, setSyncingFromWebsite] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [profileVoiceOpen, setProfileVoiceOpen] = useState(false);
  const [companiesOpen, setCompaniesOpen] = useState(false);
  const [targetingOpen, setTargetingOpen] = useState(false);
  const [experienceConfigOpen, setExperienceConfigOpen] = useState(false);
  const [companyDraft, setCompanyDraft] = useState<StudioCompany>(defaultCompany());
  const [experienceDraft, setExperienceDraft] = useState<StudioExperience>(defaultExperience());

  const [posts, setPosts] = useState<StudioPostRecord[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedPost, setSelectedPost] = useState<StudioPostRecord | null>(null);
  const [versions, setVersions] = useState<StudioPostVersion[]>([]);
  const [loadingPost, setLoadingPost] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const postStats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((post) => post.status === "published").length;
    const scheduled = posts.filter((post) => post.status === "scheduled").length;
    const draft = posts.filter((post) => post.status === "draft").length;
    return { total, published, scheduled, draft };
  }, [posts]);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setStatus("");

      try {
        const [configResponse, postsResponse] = await Promise.all([
          fetch("/api/admin/linkedin/profile", { cache: "no-store" }),
          fetch("/api/admin/linkedin/posts", { cache: "no-store" })
        ]);

        const configPayload = await configResponse.json();
        const postsPayload = await postsResponse.json();

        if (!configResponse.ok) {
          throw new Error(configPayload.error ?? "Unable to load LinkedIn Studio profile.");
        }

        if (!postsResponse.ok) {
          throw new Error(postsPayload.error ?? "Unable to load LinkedIn Studio posts.");
        }

        if (!active) return;

        const loadedConfig = (configPayload.config ?? defaultStudioConfig) as StudioConfig;
        setConfig({
          ...defaultStudioConfig,
          ...loadedConfig,
          profile: {
            ...defaultStudioConfig.profile,
            ...(loadedConfig.profile ?? {}),
            voiceStyle: {
              ...defaultStudioConfig.profile.voiceStyle,
              ...(loadedConfig.profile?.voiceStyle ?? {})
            }
          },
          targeting: {
            ...defaultStudioConfig.targeting,
            ...(loadedConfig.targeting ?? {})
          },
          settings: {
            ...defaultStudioConfig.settings,
            ...(loadedConfig.settings ?? {})
          },
          experience: Array.isArray(loadedConfig.experience) ? loadedConfig.experience : []
        });

        setIndustriesText(toLines(loadedConfig.targeting?.industries ?? []));
        setTechnologiesText(toLines(loadedConfig.targeting?.technologies ?? []));
        setPillarsText(toLines(loadedConfig.targeting?.pillars ?? []));

        const loadedPosts = (postsPayload.posts ?? []) as StudioPostRecord[];
        setPosts(loadedPosts);

        if (loadedPosts[0]?.id) {
          const firstId = loadedPosts[0].id;
          setSelectedPostId(firstId);

          const detailResponse = await fetch(`/api/admin/linkedin/posts/${firstId}`, { cache: "no-store" });
          const detailPayload = (await detailResponse.json()) as PostDetailResponse & { error?: string };

          if (detailResponse.ok) {
            setSelectedPost(detailPayload.post);
            setVersions(detailPayload.versions ?? []);
          }
        }
      } catch (error) {
        if (!active) return;
        setStatus(error instanceof Error ? error.message : "Unable to load LinkedIn Studio.");
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  async function loadPostDetail(postId: string) {
    setLoadingPost(true);

    try {
      const response = await fetch(`/api/admin/linkedin/posts/${postId}`, { cache: "no-store" });
      const payload = (await response.json()) as PostDetailResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load post detail.");
      }

      setSelectedPost(payload.post);
      setVersions(payload.versions ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load post detail.");
    } finally {
      setLoadingPost(false);
    }
  }

  function toggleCadenceDay(day: StudioConfig["settings"]["cadenceDaysOfWeek"][number]) {
    setConfig((prev) => {
      const exists = prev.settings.cadenceDaysOfWeek.includes(day);
      return {
        ...prev,
        settings: {
          ...prev.settings,
          cadenceDaysOfWeek: exists
            ? prev.settings.cadenceDaysOfWeek.filter((item) => item !== day)
            : [...prev.settings.cadenceDaysOfWeek, day]
        }
      };
    });
  }

  function updateCompany(index: number, key: keyof StudioCompany, value: string) {
    setConfig((prev) => {
      const next = [...prev.targeting.companies];
      const current = { ...next[index] };

      if (key === "priority" || key === "rotationWeight") {
        current[key] = Number(value || 1);
      } else {
        current[key] = value;
      }

      next[index] = current;
      return {
        ...prev,
        targeting: {
          ...prev.targeting,
          companies: next
        }
      };
    });
  }

  function removeCompany(index: number) {
    setConfig((prev) => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        companies: prev.targeting.companies.filter((_, idx) => idx !== index)
      }
    }));
  }

  function updateExperience(index: number, key: keyof StudioExperience, value: string) {
    setConfig((prev) => {
      const next = [...prev.experience];
      const current = { ...next[index] };

      if (key === "bullets") {
        current.bullets = fromLines(value);
      } else if (key === "technologies") {
        current.technologies = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      } else if (key === "lessonsLearned") {
        current.lessonsLearned = fromLines(value);
      } else {
        current[key] = value;
      }

      next[index] = current;
      return {
        ...prev,
        experience: next
      };
    });
  }

  function removeExperience(index: number) {
    setConfig((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, idx) => idx !== index)
    }));
  }

  function openGenerateDialog() {
    setManualCompany(config.targeting.companies[0]?.name ?? "");
    setManualPillar(config.targeting.pillars[0] ?? "");
    setManualTopic("");
    setGenerateOpen(true);
  }

  function openCompanyDialog() {
    setCompanyDraft(defaultCompany());
    setCompanyOpen(true);
  }

  function saveCompanyDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = companyDraft.name.trim();
    if (!normalizedName) return;

    const payload: StudioCompany = {
      ...companyDraft,
      name: normalizedName,
      website: companyDraft.website?.trim() || "",
      notes: companyDraft.notes?.trim() || "",
      priority: Number(companyDraft.priority ?? 1),
      rotationWeight: Number(companyDraft.rotationWeight ?? 1)
    };

    setConfig((prev) => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        companies: [...prev.targeting.companies, payload]
      }
    }));

    setCompanyOpen(false);
    setStatus(`Company \"${payload.name}\" added to targeting. Save setup to persist.`);
  }

  function openExperienceDialog() {
    const draft = defaultExperience();
    draft.startDate = String(new Date().getFullYear());
    setExperienceDraft(draft);
    setExperienceOpen(true);
  }

  function saveExperienceDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const roleTitle = experienceDraft.roleTitle.trim();
    const company = experienceDraft.company.trim();
    if (!roleTitle || !company) return;

    const payload: StudioExperience = {
      ...experienceDraft,
      roleTitle,
      company,
      industry: experienceDraft.industry?.trim() || "",
      startDate: experienceDraft.startDate?.trim() || "",
      endDate: experienceDraft.endDate?.trim() || "",
      bullets: experienceDraft.bullets.filter(Boolean),
      technologies: experienceDraft.technologies.filter(Boolean),
      lessonsLearned: experienceDraft.lessonsLearned.filter(Boolean)
    };

    setConfig((prev) => ({
      ...prev,
      experience: [...prev.experience, payload]
    }));

    setExperienceOpen(false);
    setStatus(`Experience \"${payload.roleTitle} @ ${payload.company}\" added. Save setup to persist.`);
  }

  async function persistConfig() {
    setSavingConfig(true);
    setStatus("");

    try {
      const payload: StudioConfig = {
        ...config,
        targeting: {
          ...config.targeting,
          companies: config.targeting.companies
            .filter((company) => company.name.trim())
            .map((company) => ({
              ...company,
              name: company.name.trim(),
              website: company.website?.trim() || "",
              notes: company.notes?.trim() || "",
              priority: Number(company.priority ?? 1),
              rotationWeight: Number(company.rotationWeight ?? 1)
            })),
          industries: fromLines(industriesText),
          technologies: fromLines(technologiesText),
          pillars: fromLines(pillarsText)
        },
        settings: {
          ...config.settings,
          cadenceDaysOfWeek: config.settings.cadenceDaysOfWeek.length ? config.settings.cadenceDaysOfWeek : ["TU", "TH"]
        },
        experience: config.experience.filter((entry) => entry.roleTitle.trim() && entry.company.trim())
      };

      const response = await fetch("/api/admin/linkedin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save setup.");
      }

      setConfig(payload);
      setStatus("LinkedIn Studio setup saved.");
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save setup.");
      return false;
    } finally {
      setSavingConfig(false);
    }
  }

  async function saveConfigAndClose(setter: (open: boolean) => void) {
    const saved = await persistConfig();
    if (saved) setter(false);
  }

  async function generatePost() {
    setGenerating(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/linkedin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualCompany: manualCompany.trim() || undefined,
          manualTopic: manualTopic.trim() || undefined,
          manualPillar: manualPillar.trim() || undefined
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate draft.");
      }

      const post = payload.post as StudioPostRecord;
      setPosts((prev) => [post, ...prev.filter((item) => item.id !== post.id)]);
      setSelectedPostId(post.id);
      setManualCompany("");
      setManualTopic("");
      setManualPillar("");
      setGenerateOpen(false);
      await loadPostDetail(post.id);
      setStatus("Draft generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate draft.");
    } finally {
      setGenerating(false);
    }
  }

  async function syncProfileFromWebsite() {
    setSyncingFromWebsite(true);
    setStatus("");

    try {
      const syncResponse = await fetch("/api/admin/profile-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "website_to_linkedin" })
      });
      const syncPayload = await syncResponse.json();
      if (!syncResponse.ok) {
        throw new Error(syncPayload.error ?? "Unable to sync profile.");
      }

      const profileResponse = await fetch("/api/admin/profile-sync", { cache: "no-store" });
      const profilePayload = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error(profilePayload.error ?? "Unable to reload synced profile.");
      }

      setConfig((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          displayName: profilePayload.websiteProfile?.name ?? prev.profile.displayName,
          headline: profilePayload.websiteProfile?.headline ?? prev.profile.headline,
          location: profilePayload.websiteProfile?.location ?? prev.profile.location,
          about: profilePayload.websiteProfile?.bio ?? prev.profile.about
        }
      }));

      setStatus("LinkedIn profile fields synced from website profile.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sync profile.");
    } finally {
      setSyncingFromWebsite(false);
    }
  }

  async function refineSelectedPost() {
    if (!selectedPostId) return;
    setRefining(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/linkedin/posts/${selectedPostId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() || undefined })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to refine post.");
      }

      await loadPostDetail(selectedPostId);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === selectedPostId
            ? {
                ...post,
                title: payload.title ?? post.title,
                finalText: payload.finalText ?? post.finalText,
                updatedAt: new Date().toISOString()
              }
            : post
        )
      );
      setStatus("Post refined and versioned.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to refine post.");
    } finally {
      setRefining(false);
    }
  }

  async function publishSelectedPost() {
    if (!selectedPostId) return;
    setPublishing(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/linkedin/posts/${selectedPostId}/publish`, {
        method: "POST"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to mark as published.");
      }

      setPosts((prev) =>
        prev.map((post) =>
          post.id === selectedPostId
            ? {
                ...post,
                status: "published",
                publishedAt: new Date().toISOString()
              }
            : post
        )
      );

      if (selectedPost) {
        setSelectedPost({
          ...selectedPost,
          status: "published",
          publishedAt: new Date().toISOString()
        });
      }

      setStatus("Post marked as published.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to publish post.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LinkedIn Studio (Integrated)</CardTitle>
          <CardDescription>
            Generate, version, and publish LinkedIn drafts with cleaner actions and popup-based forms.
          </CardDescription>
          <p className="admin-hint">
            Build profile and targeting once, then use quick actions to generate drafts and update context without overwhelming the page.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={openGenerateDialog}>
              <Sparkles className="h-4 w-4" />
              Generate Draft
            </Button>
            <Button type="button" variant="outline" onClick={openCompanyDialog}>
              <CirclePlus className="h-4 w-4" />
              Add Company
            </Button>
            <Button type="button" variant="secondary" onClick={openExperienceDialog}>
              <CirclePlus className="h-4 w-4" />
              Add Experience
            </Button>
            <Button type="button" variant="outline" onClick={syncProfileFromWebsite} disabled={syncingFromWebsite}>
              {syncingFromWebsite ? "Syncing..." : "Sync Profile From Website CMS"}
            </Button>
          </div>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Drafts</p>
            <p className="mt-2 text-2xl font-semibold">{postStats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="mt-2 text-2xl font-semibold">{postStats.published}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="mt-2 text-2xl font-semibold">{postStats.scheduled}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Draft</p>
            <p className="mt-2 text-2xl font-semibold">{postStats.draft}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profile + Voice</CardTitle>
            <CardDescription>{config.profile.displayName || "No display name set"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="line-clamp-2 text-muted-foreground">{config.profile.headline || "No headline set."}</p>
            <p className="text-xs text-muted-foreground">Tone: {config.profile.voiceStyle.tone || "n/a"}</p>
            <Button size="sm" onClick={() => setProfileVoiceOpen(true)}>
              Edit
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Target Companies</CardTitle>
            <CardDescription>{config.targeting.companies.length} company records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="line-clamp-2 text-muted-foreground">
              {config.targeting.companies.slice(0, 3).map((item) => item.name).join(", ") || "No companies yet."}
            </p>
            <Button size="sm" onClick={() => setCompaniesOpen(true)}>
              Edit
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Targeting + Cadence</CardTitle>
            <CardDescription>
              {config.targeting.industries.length} industries · {config.settings.cadenceDaysOfWeek.length} cadence days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="line-clamp-2 text-muted-foreground">Timezone: {config.settings.timezone || "n/a"}</p>
            <Button size="sm" onClick={() => setTargetingOpen(true)}>
              Edit
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Experience Context</CardTitle>
            <CardDescription>{config.experience.length} role records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="line-clamp-2 text-muted-foreground">
              {config.experience.slice(0, 2).map((item) => `${item.roleTitle} @ ${item.company}`).join(" | ") || "No experience records yet."}
            </p>
            <Button size="sm" onClick={() => setExperienceConfigOpen(true)}>
              Edit
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Drafts</CardTitle>
            <CardDescription>Select a draft to inspect version history and refine.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[32rem] space-y-2 overflow-auto pr-1 text-sm">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selectedPostId === post.id ? "border-primary bg-primary/10" : "border-border/70 bg-card/70 hover:border-primary"
                }`}
                onClick={async () => {
                  setSelectedPostId(post.id);
                  await loadPostDetail(post.id);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{post.title || post.selectedCompany}</p>
                  <Badge variant="secondary">{post.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{post.selectedCompany} · {post.selectedTopics.join(", ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{post.createdAt ? formatDate(post.createdAt) : ""}</p>
              </button>
            ))}
            {!posts.length ? <p className="text-muted-foreground">No drafts yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected Draft</CardTitle>
            <CardDescription>Refine, publish, and review versions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loadingPost ? (
              <p className="text-muted-foreground">Loading draft...</p>
            ) : selectedPost ? (
              <>
                <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{selectedPost.title}</p>
                    <Badge variant="secondary">{selectedPost.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedPost.selectedCompany}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{selectedPost.finalText}</p>
                  <p className="mt-2 text-xs text-muted-foreground">#{selectedPost.hashtags.join(" #")}</p>
                </div>

                <div className="space-y-2">
                  <AdminFieldLabel htmlFor="linkedin-refinement-feedback" label="Refinement Feedback" helper="Optional guidance for the next version." />
                  <Textarea
                    id="linkedin-refinement-feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Tighten intro and emphasize measurable outcomes."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={refineSelectedPost} disabled={refining}>
                    {refining ? "Refining..." : "Refine + New Version"}
                  </Button>
                  <Button variant="outline" onClick={publishSelectedPost} disabled={publishing}>
                    {publishing ? "Publishing..." : "Mark Published"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Version History</p>
                  <div className="max-h-48 space-y-2 overflow-auto pr-1">
                    {versions.map((version) => (
                      <div key={version.id} className="rounded-xl border border-border/70 bg-card/70 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">Version {version.versionNumber}</p>
                          <p className="text-xs text-muted-foreground">{version.createdAt ? formatDate(version.createdAt) : ""}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{version.feedbackApplied || "No feedback"}</p>
                      </div>
                    ))}
                    {!versions.length ? <p className="text-muted-foreground">No versions yet.</p> : null}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Select a draft to inspect details.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={profileVoiceOpen} onOpenChange={setProfileVoiceOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveConfigAndClose(setProfileVoiceOpen);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Profile + Voice</DialogTitle>
              <DialogDescription>Update identity and writing voice settings used by generated posts.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-display-name" label="Display Name" required />
                <Input
                  id="linkedin-display-name"
                  value={config.profile.displayName}
                  onChange={(event) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, displayName: event.target.value } }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-headline" label="Headline" required />
                <Input
                  id="linkedin-headline"
                  value={config.profile.headline}
                  onChange={(event) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, headline: event.target.value } }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <AdminFieldLabel htmlFor="linkedin-about" label="About" required />
              <Textarea
                id="linkedin-about"
                value={config.profile.about}
                onChange={(event) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, about: event.target.value } }))}
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-goals" label="Goals (one per line)" />
                <Textarea
                  id="linkedin-goals"
                  value={toLines(config.profile.goals)}
                  onChange={(event) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, goals: fromLines(event.target.value) } }))}
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-location" label="Location" />
                <Input
                  id="linkedin-location"
                  value={config.profile.location || ""}
                  onChange={(event) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, location: event.target.value } }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-tone" label="Voice Tone" required />
                <Input
                  id="linkedin-tone"
                  value={config.profile.voiceStyle.tone}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        voiceStyle: {
                          ...prev.profile.voiceStyle,
                          tone: event.target.value
                        }
                      }
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-length" label="Post Length" required />
                <Select
                  id="linkedin-length"
                  value={config.profile.voiceStyle.length}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        voiceStyle: {
                          ...prev.profile.voiceStyle,
                          length: event.target.value
                        }
                      }
                    }))
                  }
                >
                  <option value="Short">Short</option>
                  <option value="Medium">Medium</option>
                  <option value="Long">Long</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-do" label="Do List (one per line)" />
                <Textarea
                  id="linkedin-do"
                  value={toLines(config.profile.voiceStyle.dos)}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        voiceStyle: {
                          ...prev.profile.voiceStyle,
                          dos: fromLines(event.target.value)
                        }
                      }
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-dont" label="Don't List (one per line)" />
                <Textarea
                  id="linkedin-dont"
                  value={toLines(config.profile.voiceStyle.donts)}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        voiceStyle: {
                          ...prev.profile.voiceStyle,
                          donts: fromLines(event.target.value)
                        }
                      }
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileVoiceOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingConfig}>
                {savingConfig ? "Saving..." : "Save Profile + Voice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={companiesOpen} onOpenChange={setCompaniesOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveConfigAndClose(setCompaniesOpen);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Target Companies</DialogTitle>
              <DialogDescription>Manage the company pool used by LinkedIn draft generation.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {config.targeting.companies.map((company, index) => (
                <div key={`${company.name}-${index}`} className="grid gap-2 rounded-xl border border-border/70 bg-card/70 p-3 md:grid-cols-5">
                  <Input placeholder="Company" value={company.name} onChange={(event) => updateCompany(index, "name", event.target.value)} />
                  <Input placeholder="Website" value={company.website || ""} onChange={(event) => updateCompany(index, "website", event.target.value)} />
                  <Input
                    placeholder="Priority 1-5"
                    type="number"
                    value={company.priority ?? 1}
                    onChange={(event) => updateCompany(index, "priority", event.target.value)}
                  />
                  <Input
                    placeholder="Rotation weight"
                    type="number"
                    value={company.rotationWeight ?? 1}
                    onChange={(event) => updateCompany(index, "rotationWeight", event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input placeholder="Notes" value={company.notes || ""} onChange={(event) => updateCompany(index, "notes", event.target.value)} />
                    <Button type="button" variant="outline" onClick={() => removeCompany(index)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={openCompanyDialog}>
                <CirclePlus className="h-4 w-4" />
                Add Company
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompaniesOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingConfig}>
                {savingConfig ? "Saving..." : "Save Companies"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={targetingOpen} onOpenChange={setTargetingOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveConfigAndClose(setTargetingOpen);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Targeting + Cadence</DialogTitle>
              <DialogDescription>Configure lists and automation cadence behavior.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-industries" label="Industries (one per line)" />
                <Textarea id="linkedin-industries" value={industriesText} onChange={(event) => setIndustriesText(event.target.value)} />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-technologies" label="Technologies (one per line)" />
                <Textarea id="linkedin-technologies" value={technologiesText} onChange={(event) => setTechnologiesText(event.target.value)} />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-pillars" label="Pillars (one per line)" />
                <Textarea id="linkedin-pillars" value={pillarsText} onChange={(event) => setPillarsText(event.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <AdminFieldLabel label="Cadence Days" />
                <div className="flex flex-wrap gap-2">
                  {cadenceOptions.map((option) => {
                    const active = config.settings.cadenceDaysOfWeek.includes(option.key);
                    return (
                      <Button key={option.key} type="button" size="sm" variant={active ? "default" : "outline"} onClick={() => toggleCadenceDay(option.key)}>
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-reminder-time" label="Reminder Time" required />
                <Input
                  id="linkedin-reminder-time"
                  type="time"
                  value={config.settings.reminderTimeLocal}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, reminderTimeLocal: event.target.value }
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-timezone" label="Timezone" required />
                <Input
                  id="linkedin-timezone"
                  value={config.settings.timezone}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, timezone: event.target.value }
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.settings.webResearchEnabled}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, webResearchEnabled: checked }
                    }));
                  }}
                />
                Web research enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.settings.autoSelectCompany}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, autoSelectCompany: checked }
                    }));
                  }}
                />
                Auto-select company
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.settings.autoSelectTopic}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, autoSelectTopic: checked }
                    }));
                  }}
                />
                Auto-select topic
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.settings.autoShareLinkedIn}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, autoShareLinkedIn: checked }
                    }));
                  }}
                />
                Auto-share LinkedIn
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTargetingOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingConfig}>
                {savingConfig ? "Saving..." : "Save Targeting"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={experienceConfigOpen} onOpenChange={setExperienceConfigOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveConfigAndClose(setExperienceConfigOpen);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Experience Context</DialogTitle>
              <DialogDescription>Maintain experience records used by the generator for factual context.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {config.experience.map((entry, index) => (
                <div key={`${entry.roleTitle}-${index}`} className="space-y-2 rounded-xl border border-border/70 bg-card/70 p-3">
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input placeholder="Role title" value={entry.roleTitle} onChange={(event) => updateExperience(index, "roleTitle", event.target.value)} />
                    <Input placeholder="Company" value={entry.company} onChange={(event) => updateExperience(index, "company", event.target.value)} />
                    <Input placeholder="Industry" value={entry.industry || ""} onChange={(event) => updateExperience(index, "industry", event.target.value)} />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input placeholder="Start date" value={entry.startDate || ""} onChange={(event) => updateExperience(index, "startDate", event.target.value)} />
                    <Input placeholder="End date" value={entry.endDate || ""} onChange={(event) => updateExperience(index, "endDate", event.target.value)} />
                  </div>
                  <Textarea
                    placeholder="Bullets (one per line)"
                    value={toLines(entry.bullets)}
                    onChange={(event) => updateExperience(index, "bullets", event.target.value)}
                  />
                  <Input
                    placeholder="Technologies (comma separated)"
                    value={entry.technologies.join(", ")}
                    onChange={(event) => updateExperience(index, "technologies", event.target.value)}
                  />
                  <Textarea
                    placeholder="Lessons learned (one per line)"
                    value={toLines(entry.lessonsLearned)}
                    onChange={(event) => updateExperience(index, "lessonsLearned", event.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={() => removeExperience(index)}>
                    Remove Experience
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={openExperienceDialog}>
              <CirclePlus className="h-4 w-4" />
              Add Experience
            </Button>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExperienceConfigOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingConfig}>
                {savingConfig ? "Saving..." : "Save Experience Context"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void generatePost();
            }}
          >
            <DialogHeader>
              <DialogTitle>Generate LinkedIn Draft</DialogTitle>
              <DialogDescription>
                Leave optional overrides empty to use auto-selection from your current targeting setup.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-manual-company" label="Manual Company" helper="Optional override." />
                <Input
                  id="linkedin-manual-company"
                  placeholder="Optional company"
                  value={manualCompany}
                  onChange={(event) => setManualCompany(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-manual-topic" label="Manual Topic" helper="Optional override." />
                <Input
                  id="linkedin-manual-topic"
                  placeholder="Optional topic"
                  value={manualTopic}
                  onChange={(event) => setManualTopic(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <AdminFieldLabel htmlFor="linkedin-manual-pillar" label="Manual Pillar" helper="Optional override." />
              <Input
                id="linkedin-manual-pillar"
                placeholder="Optional pillar"
                value={manualPillar}
                onChange={(event) => setManualPillar(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={generating}>
                <WandSparkles className="h-4 w-4" />
                {generating ? "Generating..." : "Generate Draft"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={companyOpen} onOpenChange={setCompanyOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={saveCompanyDraft} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add Target Company</DialogTitle>
              <DialogDescription>Add a reusable company profile for auto-selection and routing priority.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-company-name" label="Company Name" required />
                <Input
                  id="linkedin-company-name"
                  value={companyDraft.name}
                  onChange={(event) => setCompanyDraft((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-company-website" label="Website" />
                <Input
                  id="linkedin-company-website"
                  value={companyDraft.website || ""}
                  onChange={(event) => setCompanyDraft((prev) => ({ ...prev, website: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-company-priority" label="Priority" required helper="Higher priority can be favored in selection." />
                <Input
                  id="linkedin-company-priority"
                  type="number"
                  min={1}
                  value={companyDraft.priority ?? 1}
                  onChange={(event) => setCompanyDraft((prev) => ({ ...prev, priority: Number(event.target.value || 1) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-company-weight" label="Rotation Weight" required />
                <Input
                  id="linkedin-company-weight"
                  type="number"
                  min={1}
                  value={companyDraft.rotationWeight ?? 1}
                  onChange={(event) => setCompanyDraft((prev) => ({ ...prev, rotationWeight: Number(event.target.value || 1) }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <AdminFieldLabel htmlFor="linkedin-company-notes" label="Notes" />
              <Textarea
                id="linkedin-company-notes"
                value={companyDraft.notes || ""}
                onChange={(event) => setCompanyDraft((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompanyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Company</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={experienceOpen} onOpenChange={setExperienceOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
          <form onSubmit={saveExperienceDraft} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add Experience Context</DialogTitle>
              <DialogDescription>Add truthful career context that can be reused in generated posts.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-experience-role" label="Role Title" required />
                <Input
                  id="linkedin-experience-role"
                  value={experienceDraft.roleTitle}
                  onChange={(event) => setExperienceDraft((prev) => ({ ...prev, roleTitle: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-experience-company" label="Company" required />
                <Input
                  id="linkedin-experience-company"
                  value={experienceDraft.company}
                  onChange={(event) => setExperienceDraft((prev) => ({ ...prev, company: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-experience-industry" label="Industry" />
                <Input
                  id="linkedin-experience-industry"
                  value={experienceDraft.industry || ""}
                  onChange={(event) => setExperienceDraft((prev) => ({ ...prev, industry: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-experience-start" label="Start Date" helper="Defaults to current year." />
                <Input
                  id="linkedin-experience-start"
                  value={experienceDraft.startDate || ""}
                  onChange={(event) => setExperienceDraft((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="linkedin-experience-end" label="End Date" />
                <Input
                  id="linkedin-experience-end"
                  value={experienceDraft.endDate || ""}
                  onChange={(event) => setExperienceDraft((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <AdminFieldLabel htmlFor="linkedin-experience-bullets" label="Bullets (one per line)" />
              <Textarea
                id="linkedin-experience-bullets"
                value={toLines(experienceDraft.bullets)}
                onChange={(event) => setExperienceDraft((prev) => ({ ...prev, bullets: fromLines(event.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <AdminFieldLabel htmlFor="linkedin-experience-tech" label="Technologies (comma separated)" />
              <Input
                id="linkedin-experience-tech"
                value={experienceDraft.technologies.join(", ")}
                onChange={(event) =>
                  setExperienceDraft((prev) => ({
                    ...prev,
                    technologies: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <AdminFieldLabel htmlFor="linkedin-experience-lessons" label="Lessons Learned (one per line)" />
              <Textarea
                id="linkedin-experience-lessons"
                value={toLines(experienceDraft.lessonsLearned)}
                onChange={(event) => setExperienceDraft((prev) => ({ ...prev, lessonsLearned: fromLines(event.target.value) }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExperienceOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Experience</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
