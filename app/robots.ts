import { MetadataRoute } from "next";

import { resolveAbsoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/admin"]
      }
    ],
    host: resolveAbsoluteUrl("/"),
    sitemap: [resolveAbsoluteUrl("/sitemap.xml")]
  };
}
