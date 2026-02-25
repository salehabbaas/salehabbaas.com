import "server-only";

import { createHash } from "node:crypto";

export type AdminRequestContext = {
  ip: string;
  ipMasked: string;
  ipHash: string;
  userAgent: string;
  deviceType: "mobile" | "desktop" | "tablet" | "bot" | "unknown";
  browser: string;
  country: string;
  city: string;
  path: string;
};

function hashIp(ip: string) {
  if (!ip) return "";
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

function maskIp(ip: string) {
  if (!ip) return "";

  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length !== 4) return ip;
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }

  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    if (parts.length < 2) return ip;
    return `${parts.slice(0, 3).join(":")}:*`;
  }

  return ip;
}

function deriveDeviceType(userAgent: string): AdminRequestContext["deviceType"] {
  const ua = userAgent.toLowerCase();
  if (!ua) return "unknown";
  if (/bot|crawler|spider|headless/i.test(ua)) return "bot";
  if (/ipad|tablet|kindle/i.test(ua)) return "tablet";
  if (/iphone|android.+mobile|mobile/i.test(ua)) return "mobile";
  return "desktop";
}

function deriveBrowser(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (!ua) return "unknown";
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "opera";
  if (ua.includes("firefox/")) return "firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "safari";
  if (ua.includes("chrome/")) return "chrome";
  return "unknown";
}

function resolveIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for") || "";
  const realIp = headers.get("x-real-ip") || "";

  return forwardedFor.split(",")[0]?.trim() || realIp.trim() || "";
}

export function getAdminRequestContext(request: Request): AdminRequestContext {
  const headers = request.headers;
  const userAgent = (headers.get("user-agent") || "").slice(0, 280);
  const ip = resolveIp(headers);

  return {
    ip,
    ipMasked: maskIp(ip),
    ipHash: hashIp(ip),
    userAgent,
    deviceType: deriveDeviceType(userAgent),
    browser: deriveBrowser(userAgent),
    country: headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || "",
    city: headers.get("x-vercel-ip-city") || "",
    path: new URL(request.url).pathname
  };
}
