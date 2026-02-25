import { Metadata } from "next";

import { resolveAbsoluteUrl, isIndexableEnvironment } from "@/lib/utils";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TITLE } from "@/lib/brand";
import { keywords as resumeKeywords } from "@/lib/data/resume";

export const DEFAULT_TITLE = BRAND_NAME;
export const DEFAULT_DESCRIPTION = BRAND_DESCRIPTION;
export const DEFAULT_SOCIAL_IMAGE = "/og-image.png";

const BASE_KEYWORDS = [
  BRAND_NAME,
  "Saleh Abbaas",
  "Saleh",
  "Abbaas",
  "Saleh Abbaas Ottawa",
  "Saleh Abbaas software engineer",
  "Ottawa software engineer",
  "Software Engineer",
  ...resumeKeywords
];

export function normalizePageTitle(input: string) {
  const title = input.trim();
  if (!title) return "Home";

  return title
    .replace(/\s*\|\s*Saleh\s+Abbaas\s*$/i, "")
    .replace(/\s*\|\s*Saleh\s+Abbaas\s*\|\s*Software\s+Engineer(?:\s+and\s+Content\s+Creator)?\s*$/i, "")
    .replace(new RegExp(`\\s*\\|\\s*${BRAND_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "")
    .trim();
}

function dedupeKeywords(input: string[]) {
  return [...new Set(input.map((keyword) => keyword.trim()).filter(Boolean))];
}

function pathKeywords(path: string) {
  if (path === "/") {
    return [
      "Saleh Abbaas software engineer",
      "Saleh Abbaas ottawa",
      "AI agent developer Canada",
      "Ottawa software engineer",
      "Healthcare interoperability engineer",
      "AI news creator",
      "HL7 FHIR specialist"
    ];
  }
  if (path.startsWith("/services")) {
    return [
      "Saleh Abbaas services",
      "AI agent services Ottawa",
      "Healthcare systems consulting",
      "Software engineering services"
    ];
  }
  if (path.startsWith("/experience")) {
    return [
      "Saleh Abbaas experience",
      "Software engineer experience",
      "Healthcare integration experience",
      "Clinical systems engineering"
    ];
  }
  if (path.startsWith("/projects")) {
    return [
      "Saleh Abbaas projects",
      "Software engineering portfolio",
      "Healthcare integration projects",
      "AI and cloud projects"
    ];
  }
  if (path.startsWith("/ai-news")) {
    return ["Saleh Abbaas AI news", "AI news creator", "AI updates", "AI trends and explainers"];
  }
  if (path.startsWith("/blog") || path.startsWith("/knowledge")) {
    return [
      "Saleh Abbaas blog",
      "Software engineering blog",
      "AI engineering articles",
      "Healthcare tech insights"
    ];
  }
  if (path.startsWith("/creator")) {
    return ["Saleh Abbaas creator", "Content creator", "AI content creator", "short-form creator"];
  }
  if (path.startsWith("/about")) {
    return ["About Saleh Abbaas", "Software engineer in Ottawa", "healthcare and AI engineer"];
  }
  if (path.startsWith("/contact")) {
    return ["Contact Saleh Abbaas", "Hire software engineer", "Book AI consulting"];
  }
  if (path.startsWith("/book-meeting")) {
    return ["Book meeting with Saleh Abbaas", "Software consultation booking", "AI strategy call"];
  }
  if (path.startsWith("/certificates")) {
    return ["Saleh Abbaas certificates", "Software engineer certificates", "cloud and healthcare certifications", "professional credentials"];
  }
  return [];
}

function resolveSocialImage(input?: string) {
  if (!input) return resolveAbsoluteUrl(DEFAULT_SOCIAL_IMAGE);
  if (/^https?:\/\//i.test(input)) return input;
  return resolveAbsoluteUrl(input);
}

export function defaultRobotsMetadata(indexable = isIndexableEnvironment()): Metadata["robots"] {
  return {
    index: indexable,
    follow: indexable,
    googleBot: {
      index: indexable,
      follow: indexable,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  };
}

export function buildPageMetadata(input: {
  title?: string;
  description?: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  keywords?: string[];
  robots?: Metadata["robots"];
}): Metadata {
  const title = normalizePageTitle(input.title || DEFAULT_TITLE) || "Home";
  const description = input.description || DEFAULT_DESCRIPTION;
  const canonical = resolveAbsoluteUrl(input.path);
  const image = resolveSocialImage(input.image);
  const keywords = dedupeKeywords([...BASE_KEYWORDS, ...pathKeywords(input.path), ...(input.keywords ?? [])]);

  return {
    title,
    description,
    keywords,
    robots: input.robots ?? defaultRobotsMetadata(),
    alternates: {
      canonical
    },
    openGraph: {
      type: input.type ?? "website",
      title,
      description,
      url: canonical,
      siteName: BRAND_NAME,
      images: [{ url: image, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
}

export function pageSchema(input: { title: string; description: string; path: string; keywords?: string[] }) {
  const keywords = dedupeKeywords([...BASE_KEYWORDS, ...pathKeywords(input.path), ...(input.keywords ?? [])]);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: resolveAbsoluteUrl(input.path),
    keywords: keywords.join(", ")
  };
}
