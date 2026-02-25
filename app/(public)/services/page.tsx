import { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ensurePublicPageVisible } from "@/lib/firestore/public-page-guard";
import { safeServices } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqPageSchema, servicesOfferCatalogSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";

const SERVICES_DESCRIPTION =
  "Software engineering services by Saleh Abbaas in Ottawa, Canada: AI implementation, healthcare interoperability, and secure cloud delivery.";

export const metadata: Metadata = buildPageMetadata({
  title: "Software Engineering Services | Saleh Abbaas",
  description: SERVICES_DESCRIPTION,
  path: "/services"
});

export const revalidate = 300;

const SERVICES_FAQ = [
  {
    question: "What services does Saleh Abbaas provide?",
    answer:
      "Saleh Abbaas provides software engineering services focused on AI implementation, healthcare interoperability (HL7/FHIR), and secure cloud delivery."
  },
  {
    question: "Can Saleh Abbaas support projects in Ottawa and across Canada?",
    answer: "Yes. Services are provided from Ottawa, Ontario, Canada, and can support remote engagements across Canada."
  },
  {
    question: "Is Saleh Abbaas also listed as Saleh Abbas?",
    answer: "Yes. Saleh Abbas is an alternate spelling used in some profiles and references."
  },
  {
    question: "Where can I see proof of delivery?",
    answer: "Review the projects, experience, and blog pages for implementation details, case studies, and technical writing."
  }
];

export default async function ServicesPage() {
  await ensurePublicPageVisible("/services");
  const services = await safeServices();
  const webPageJsonLd = pageSchema({
    title: "Software Engineering Services",
    description: SERVICES_DESCRIPTION,
    path: "/services"
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Services", url: resolveAbsoluteUrl("/services") }
  ]);
  const servicesJsonLd = servicesOfferCatalogSchema(services.map((service) => ({ title: service.title, detail: service.detail })));
  const faqJsonLd = faqPageSchema({
    path: "/services",
    entries: SERVICES_FAQ
  });

  return (
    <SectionShell
      title="Software Engineering Services"
      description="Product engineering and growth systems delivered with a pragmatic, production-first mindset."
    >
      <div className="mb-6 rounded-2xl border border-border/70 bg-card/75 p-4 text-sm text-foreground/80">
        <p className="font-medium text-foreground">Related pages:</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/projects" className="text-[hsl(var(--accent-strong))] hover:underline">
            Projects
          </Link>
          <Link href="/experience" className="text-[hsl(var(--accent-strong))] hover:underline">
            Experience
          </Link>
          <Link href="/blog" className="text-[hsl(var(--accent-strong))] hover:underline">
            Blog
          </Link>
          <Link href="/about" className="text-[hsl(var(--accent-strong))] hover:underline">
            About
          </Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {services.length ? (
          services.map((service) => (
            <Card key={service.id} className="bg-card/75">
              <CardHeader>
                <CardTitle>{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/75">{service.detail}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Add services from admin CMS.</p>
        )}
      </div>

      <Card className="mt-6 bg-card/75">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {SERVICES_FAQ.map((item) => (
            <div key={item.question} className="rounded-2xl border border-border/70 bg-card/70 p-4">
              <h2 className="text-base font-semibold text-foreground">{item.question}</h2>
              <p className="mt-2 text-sm leading-7 text-foreground/75">{item.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <JsonLd id="schema-services-page" data={webPageJsonLd} />
      <JsonLd id="schema-services-breadcrumb" data={breadcrumbJsonLd} />
      <JsonLd id="schema-services-catalog" data={servicesJsonLd} />
      <JsonLd id="schema-services-faq" data={faqJsonLd} />
    </SectionShell>
  );
}
