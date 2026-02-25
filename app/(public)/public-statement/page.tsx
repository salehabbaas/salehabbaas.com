import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent } from "@/components/ui/card";
import { ensurePublicPageVisible } from "@/lib/firestore/public-page-guard";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqPageSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";

const PUBLIC_STATEMENT_DESCRIPTION =
  "Public statement for identity verification and professional context for Saleh Abbaas (Saleh Abbas), software engineer in Ottawa, Canada.";

const PUBLIC_STATEMENT_FAQ = [
  {
    question: "Who is Saleh Abbaas?",
    answer: "Saleh Abbaas is a software engineer based in Ottawa, Canada, focused on AI systems and healthcare interoperability."
  },
  {
    question: "Is Saleh Abbaas the same as Saleh Abbas?",
    answer: "Yes. Saleh Abbas is an alternate spelling of the same name."
  },
  {
    question: "How can I verify professional identity?",
    answer: "Use the LinkedIn profile and direct email listed on this page."
  },
  {
    question: "Where can I review technical work?",
    answer: "See the experience, projects, services, and blog pages for relevant work samples and delivery context."
  }
];

export const metadata: Metadata = buildPageMetadata({
  title: "Public Statement | Saleh Abbaas (Saleh Abbas) | Software Engineer in Ottawa, Canada",
  description: PUBLIC_STATEMENT_DESCRIPTION,
  path: "/public-statement"
});

export const revalidate = 3600;

export default async function PublicStatementPage() {
  await ensurePublicPageVisible("/public-statement");
  const webPageJsonLd = pageSchema({
    title: "Public Statement",
    description: PUBLIC_STATEMENT_DESCRIPTION,
    path: "/public-statement"
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Public Statement", url: resolveAbsoluteUrl("/public-statement") }
  ]);
  const faqJsonLd = faqPageSchema({
    path: "/public-statement",
    entries: PUBLIC_STATEMENT_FAQ
  });

  return (
    <SectionShell
      title="Public Statement"
      description="A factual identity and professional context statement for public reference."
    >
      <Card className="bg-card/75">
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm leading-7 text-foreground/80">
            Saleh Abbaas (Saleh Abbas) is a software engineer based in Ottawa, Canada. This page is provided as a clear, factual reference
            for identity verification and professional context. The primary areas of work are software engineering, AI-enabled systems, and
            healthcare interoperability (HL7/FHIR). The website documents current experience, services, projects, and technical writing.
          </p>
          <p className="text-sm leading-7 text-foreground/80">
            Verification links:
            {" "}
            <Link href="https://www.linkedin.com/in/salehabbaas" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              LinkedIn
            </Link>
            {" · "}
            <Link href="mailto:salehabbaas97@gmail.com" className="text-primary hover:underline">
              salehabbaas97@gmail.com
            </Link>
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/about" className="text-[hsl(var(--accent-strong))] hover:underline">
              About
            </Link>
            <Link href="/experience" className="text-[hsl(var(--accent-strong))] hover:underline">
              Experience
            </Link>
            <Link href="/projects" className="text-[hsl(var(--accent-strong))] hover:underline">
              Projects
            </Link>
            <Link href="/services" className="text-[hsl(var(--accent-strong))] hover:underline">
              Services
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-card/75">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-2xl font-semibold text-foreground">FAQ</h2>
          <div className="space-y-4">
            {PUBLIC_STATEMENT_FAQ.map((entry) => (
              <div key={entry.question} className="rounded-2xl border border-border/70 bg-card/70 p-4">
                <h3 className="text-base font-semibold text-foreground">{entry.question}</h3>
                <p className="mt-2 text-sm leading-7 text-foreground/75">{entry.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <JsonLd id="schema-public-statement-page" data={webPageJsonLd} />
      <JsonLd id="schema-public-statement-breadcrumb" data={breadcrumbJsonLd} />
      <JsonLd id="schema-public-statement-faq" data={faqJsonLd} />
    </SectionShell>
  );
}
