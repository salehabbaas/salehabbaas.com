import { MetadataRoute } from "next";

import { resolveAbsoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const rules = {
    allow: ["/", "/api/og/"],
    disallow: ["/admin", "/api", "/api/admin"]
  };

  return {
    rules: [
      {
        userAgent: "*",
        ...rules
      },
      {
        userAgent: "Googlebot",
        ...rules
      },
      {
        userAgent: "AdsBot-Google",
        ...rules
      },
      {
        userAgent: "GPTBot",
        ...rules
      },
      {
        userAgent: "ChatGPT-User",
        ...rules
      },
      {
        userAgent: "ClaudeBot",
        ...rules
      },
      {
        userAgent: "PerplexityBot",
        ...rules
      }
    ],
    host: resolveAbsoluteUrl("/"),
    sitemap: [resolveAbsoluteUrl("/sitemap.xml")]
  };
}
