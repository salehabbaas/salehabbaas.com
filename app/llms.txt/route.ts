import { resolveAbsoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export function GET() {
  const content = [
    "# Saleh Abbaas",
    "",
    "> Official website of Saleh Abbaas, a software engineer based in Ottawa, Ontario, Canada.",
    "",
    "Saleh Abbas is an alternate spelling of the same name.",
    "",
    "## Canonical Website",
    `- ${resolveAbsoluteUrl("/")}`,
    "",
    "## Sitemap",
    `- ${resolveAbsoluteUrl("/sitemap.xml")}`,
    "",
    "## Key Pages",
    `- ${resolveAbsoluteUrl("/")} - Home page and primary identity summary.`,
    `- ${resolveAbsoluteUrl("/about")} - Biography, expertise, and entity summary.`,
    `- ${resolveAbsoluteUrl("/experience")} - Professional timeline and delivery scope.`,
    `- ${resolveAbsoluteUrl("/projects")} - Project case studies and implementation examples.`,
    `- ${resolveAbsoluteUrl("/services")} - Service catalog and engagement focus.`,
    `- ${resolveAbsoluteUrl("/blog")} - Technical articles and engineering notes.`,
    `- ${resolveAbsoluteUrl("/ai-news")} - AI updates and explainers.`,
    `- ${resolveAbsoluteUrl("/creator")} - Creator content hub and feed.`,
    `- ${resolveAbsoluteUrl("/public-statement")} - Public identity statement and verification references.`,
    `- ${resolveAbsoluteUrl("/contact")} - Contact and collaboration form.`,
    "",
    "## Feeds",
    `- ${resolveAbsoluteUrl("/blog/rss.xml")}`,
    `- ${resolveAbsoluteUrl("/creator/rss.xml")}`,
    "",
    "## Entity Summary",
    "- Name: Saleh Abbaas.",
    "- Alternate spelling: Saleh Abbas.",
    "- Role: Software Engineer.",
    "- Location: Ottawa, Ontario, Canada.",
    "- Focus: AI systems, healthcare interoperability (HL7/FHIR), and secure software delivery.",
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
