import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { PortfolioHome } from "@/components/site/home/portfolio-home";
import { ensurePublicPageVisible } from "@/lib/firestore/public-page-guard";
import { safeSocialLinks } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";

export const revalidate = 300;

const HOME_DESCRIPTION =
  "Saleh Abbaas — Software Engineer in Ottawa, Canada. Building AI systems, healthcare integrations (HL7/FHIR), and secure production software.";
const HOME_KEYWORDS = [
  "Saleh Abbaas",
  "Software Engineer Ottawa",
  "AI Engineer Canada",
  "Healthcare Interoperability HL7 FHIR",
  "Full Stack Developer",
  "Cloud Architecture",
  "Python TypeScript Developer",
];

const homeMetadata = buildPageMetadata({
  title: "Saleh Abbaas — Software Engineer",
  description: HOME_DESCRIPTION,
  path: "/",
  keywords: HOME_KEYWORDS,
});

export const metadata: Metadata = homeMetadata;

export default async function HomePage() {
  await ensurePublicPageVisible("/");
  const socialLinks = await safeSocialLinks();
  const links = socialLinks.map((l) => ({ label: l.label, url: l.url }));

  const webPageJsonLd = pageSchema({
    title: "Saleh Abbaas — Software Engineer",
    description: HOME_DESCRIPTION,
    path: "/",
    keywords: HOME_KEYWORDS,
  });
  const breadcrumbJsonLd = breadcrumbSchema([{ name: "Home", url: resolveAbsoluteUrl("/") }]);

  return (
    <>
      <PortfolioHome socialLinks={links} />
      <JsonLd id="schema-home-page" data={webPageJsonLd} />
      <JsonLd id="schema-home-breadcrumb" data={breadcrumbJsonLd} />
    </>
  );
}
