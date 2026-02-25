import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const DEFAULT_PRODUCTION_SITE_URL = "https://salehabbaas.com";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "";
  const parsed = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(parsed);
}

export function truncate(input: string, max = 150) {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1)}...`;
}

function normalizeSiteUrl(raw?: string) {
  const candidate = raw?.trim() || (process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_SITE_URL : "http://localhost:3000");
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  const url = new URL(withProtocol);

  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    url.protocol = "https:";
  }

  return url.toString();
}

export function resolveSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export function isIndexableEnvironment() {
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;

  const hostname = new URL(resolveSiteUrl()).hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;

  const nonProdMarkers = ["staging", "preview", "dev", "test"];
  return !nonProdMarkers.some((marker) => hostname.includes(marker));
}

export function resolveAbsoluteUrl(path = "") {
  return new URL(path, resolveSiteUrl()).toString();
}
