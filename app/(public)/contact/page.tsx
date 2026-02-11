import { Metadata } from "next";

import { ContactForm } from "@/components/site/contact-form";
import { SectionShell } from "@/components/site/section-shell";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

const CONTACT_DESCRIPTION =
  "Contact Saleh Abbaas (Saleh Abbas) for software engineering, healthcare interoperability, AI consulting, and project collaboration in Ottawa.";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: CONTACT_DESCRIPTION,
  path: "/contact"
});

export default function ContactPage() {
  const webPageJsonLd = pageSchema({
    title: "Contact",
    description: CONTACT_DESCRIPTION,
    path: "/contact"
  });

  return (
    <SectionShell title="Contact" description="Tell me what you are building and where you need support.">
      <div className="max-w-2xl">
        <ContactForm />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </SectionShell>
  );
}
