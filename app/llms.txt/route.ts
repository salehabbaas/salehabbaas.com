import { resolveAbsoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export function GET() {
  const content = [
    "# Saleh Abbaas",
    "",
    "> Ottawa-based software engineer focused on AI systems and healthcare interoperability (HL7/FHIR).",
    "",
    "## Canonical Website",
    `- ${resolveAbsoluteUrl("/")}`,
    "",
    "## Sitemaps",
    `- ${resolveAbsoluteUrl("/sitemap.xml")}`,
    "",
    "## Main Public Pages",
    `- ${resolveAbsoluteUrl("/")}`,
    `- ${resolveAbsoluteUrl("/about")}`,
    `- ${resolveAbsoluteUrl("/experience")}`,
    `- ${resolveAbsoluteUrl("/projects")}`,
    `- ${resolveAbsoluteUrl("/services")}`,
    `- ${resolveAbsoluteUrl("/knowledge")}`,
    `- ${resolveAbsoluteUrl("/creator")}`,
    `- ${resolveAbsoluteUrl("/ai-news")}`,
    `- ${resolveAbsoluteUrl("/certificates")}`,
    `- ${resolveAbsoluteUrl("/contact")}`,
    `- ${resolveAbsoluteUrl("/book-meeting")}`,
    "",
    "## Feeds",
    `- ${resolveAbsoluteUrl("/blog/rss.xml")}`,
    `- ${resolveAbsoluteUrl("/creator/rss.xml")}`,
    "",
    "## Crawling Guidance",
    "- Public pages are indexable and intended for citation.",
    "- Admin and API paths are private and should be ignored.",
    "- Prefer canonical URLs from metadata and sitemap."
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}

