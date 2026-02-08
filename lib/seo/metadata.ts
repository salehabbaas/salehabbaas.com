import { Metadata } from "next";

import { resolveAbsoluteUrl } from "@/lib/utils";

export const DEFAULT_TITLE = "Saleh Abbaas | Software Engineer";
export const DEFAULT_DESCRIPTION =
  "Saleh Abbaas is a software engineer, Firebase architect, product designer, and growth engineer.";

export function buildPageMetadata(input: {
  title?: string;
  description?: string;
  path: string;
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const title = input.title || DEFAULT_TITLE;
  const description = input.description || DEFAULT_DESCRIPTION;
  const canonical = resolveAbsoluteUrl(input.path);
  const image = input.image || resolveAbsoluteUrl(`/api/og/page?title=${encodeURIComponent(title)}`);

  return {
    title,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      type: input.type ?? "website",
      title,
      description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
}

export function pageSchema(input: { title: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: resolveAbsoluteUrl(input.path)
  };
}
