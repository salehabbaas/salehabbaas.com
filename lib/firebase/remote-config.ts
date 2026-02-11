import "server-only";

import { getRemoteConfig, type RemoteConfigTemplate } from "firebase-admin/remote-config";

import { adminAuth } from "@/lib/firebase/admin";

type FeatureFlagKey = "booking_enabled" | "pipeline_story_enabled" | "featured_carousel_enabled" | "experience_story_enabled";

function asBool(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

function readParamBool(template: RemoteConfigTemplate, key: FeatureFlagKey) {
  const raw = template.parameters?.[key]?.defaultValue;
  if (!raw || !("value" in raw)) return null;
  return asBool(raw.value);
}

let templateCache: { fetchedAt: number; template: RemoteConfigTemplate } | null = null;
const TEMPLATE_TTL_MS = 60_000;

async function getTemplateCached() {
  const now = Date.now();
  if (templateCache && now - templateCache.fetchedAt < TEMPLATE_TTL_MS) {
    return templateCache.template;
  }

  const remoteConfig = getRemoteConfig(adminAuth.app);
  const template = await remoteConfig.getTemplate();
  templateCache = { fetchedAt: now, template };
  return template;
}

export async function getRemoteFeatureFlags() {
  try {
    const template = await getTemplateCached();
    return {
      bookingEnabled: readParamBool(template, "booking_enabled"),
      pipelineStoryEnabled: readParamBool(template, "pipeline_story_enabled"),
      featuredCarouselEnabled: readParamBool(template, "featured_carousel_enabled"),
      experienceStoryEnabled: readParamBool(template, "experience_story_enabled")
    };
  } catch {
    return {
      bookingEnabled: null,
      pipelineStoryEnabled: null,
      featuredCarouselEnabled: null,
      experienceStoryEnabled: null
    };
  }
}

export async function getRemoteBookingFlag() {
  const flags = await getRemoteFeatureFlags();
  return flags.bookingEnabled;
}

export async function setRemoteFeatureFlags(input: Partial<Record<FeatureFlagKey, boolean>>) {
  const remoteConfig = getRemoteConfig(adminAuth.app);
  const template = await remoteConfig.getTemplate();
  const parameters = template.parameters ?? {};

  function setBool(key: FeatureFlagKey, enabled: boolean, description: string) {
    parameters[key] = {
      defaultValue: { value: enabled ? "true" : "false" },
      description
    };
  }

  if (typeof input.booking_enabled === "boolean") {
    setBool("booking_enabled", input.booking_enabled, "Controls visibility and activation of booking system");
  }
  if (typeof input.pipeline_story_enabled === "boolean") {
    setBool("pipeline_story_enabled", input.pipeline_story_enabled, "Controls the Home page clinical pipeline scroll story section");
  }
  if (typeof input.featured_carousel_enabled === "boolean") {
    setBool("featured_carousel_enabled", input.featured_carousel_enabled, "Controls the Home page React Spring featured projects carousel");
  }
  if (typeof input.experience_story_enabled === "boolean") {
    setBool("experience_story_enabled", input.experience_story_enabled, "Controls the Experience page pinned timeline scroll story section");
  }

  template.parameters = parameters;
  await remoteConfig.publishTemplate(template);
  templateCache = null;
}

export async function setRemoteBookingFlag(enabled: boolean) {
  await setRemoteFeatureFlags({ booking_enabled: enabled });
}
