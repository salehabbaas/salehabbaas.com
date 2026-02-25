import { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { ContactForm } from "@/components/site/contact-form";
import { SectionShell } from "@/components/site/section-shell";
import { ensurePublicPageVisible } from "@/lib/firestore/public-page-guard";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";

const CONTACT_DESCRIPTION =
  "Contact Saleh Abbaas for software engineering, healthcare interoperability, AI consulting, and project collaboration in Ottawa.";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: CONTACT_DESCRIPTION,
  path: "/contact"
});

export default async function ContactPage() {
  await ensurePublicPageVisible("/contact");
  const webPageJsonLd = pageSchema({
    title: "Contact",
    description: CONTACT_DESCRIPTION,
    path: "/contact"
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Contact", url: resolveAbsoluteUrl("/contact") }
  ]);

  return (
    <SectionShell path="/contact" title="Contact" description="Tell me what you are building and where you need support.">
      <div className="max-w-2xl">
        <ContactForm />
      </div>
      <JsonLd id="schema-contact-page" data={webPageJsonLd} />
      <JsonLd id="schema-contact-breadcrumb" data={breadcrumbJsonLd} />
    </SectionShell>
  );
}
