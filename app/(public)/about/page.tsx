import { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { CreatorPillars } from "@/components/creator/creator-pillars";
import { ResumeDownloadLink } from "@/components/site/resume-download-link";
import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent } from "@/components/ui/card";
import { ensurePublicPageVisible } from "@/lib/firestore/public-page-guard";
import { safeGetPillars } from "@/lib/firestore/public";
import { safeProfile } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { aboutPageSchema, breadcrumbSchema, faqPageSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";

const ABOUT_DESCRIPTION =
  "About Saleh Abbaas, a Software Engineer in Ottawa, Ontario, Canada specializing in AI systems, healthcare interoperability, and secure software delivery.";

export const metadata: Metadata = buildPageMetadata({
  title: "About Saleh Abbaas | Software Engineer in Ottawa, Canada",
  description: ABOUT_DESCRIPTION,
  path: "/about"
});

export const revalidate = 300;

const ABOUT_FAQ = [
  {
    question: "Is Saleh Abbaas the same person as Saleh Abbas?",
    answer:
      "Yes. Saleh Abbaas is the primary spelling used on this website, and Saleh Abbas is an alternate spelling of the same person."
  },
  {
    question: "Where is Saleh Abbaas based?",
    answer: "Saleh Abbaas is based in Ottawa, Ontario, Canada."
  },
  {
    question: "What does Saleh Abbaas specialize in?",
    answer: "Software engineering, applied AI systems, healthcare interoperability (HL7/FHIR), and secure cloud delivery."
  },
  {
    question: "How can I evaluate Saleh Abbaas for a project?",
    answer: "Review the experience, projects, and services pages, then reach out through the contact page or booking page."
  }
];

export default async function AboutPage() {
  await ensurePublicPageVisible("/about");
  const [pillars, profile] = await Promise.all([safeGetPillars(), safeProfile()]);

  const webPageJsonLd = pageSchema({
    title: "About Saleh Abbaas",
    description: ABOUT_DESCRIPTION,
    path: "/about"
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "About", url: resolveAbsoluteUrl("/about") }
  ]);
  const aboutPageJsonLd = aboutPageSchema({
    name: "About Saleh Abbaas",
    description: ABOUT_DESCRIPTION
  });
  const faqJsonLd = faqPageSchema({
    path: "/about",
    entries: ABOUT_FAQ
  });

  return (
    <SectionShell path="/about" title="About Saleh Abbaas" description={profile.headline || "I design and engineer product systems for measurable growth."}>
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card className="bg-card/75">
          <CardContent className="space-y-4 pt-6">
            <p className="text-lg leading-8 text-foreground/75">{profile.bio || "Update biography from the admin CMS."}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/experience" className="text-[hsl(var(--accent-strong))] hover:underline">
                View experience
              </Link>
              <Link href="/projects" className="text-[hsl(var(--accent-strong))] hover:underline">
                View projects
              </Link>
              <Link href="/services" className="text-[hsl(var(--accent-strong))] hover:underline">
                Explore services
              </Link>
              <Link href="/blog" className="text-[hsl(var(--accent-strong))] hover:underline">
                Read the blog
              </Link>
              <Link href="/public-statement" className="text-[hsl(var(--accent-strong))] hover:underline">
                Public statement
              </Link>
            </div>
            <ResumeDownloadLink url={profile.resumeUrl} />
          </CardContent>
        </Card>
        <CreatorPillars pillars={pillars} />
      </div>

      <Card className="mt-6 bg-card/75">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-2xl font-semibold text-foreground">Entity Summary</h2>
          <ul className="space-y-2 text-sm leading-7 text-foreground/75">
            <li>Saleh Abbaas is a Software Engineer based in Ottawa, Ontario, Canada.</li>
            <li>He designs AI-enabled and cloud-native software systems for production environments.</li>
            <li>Core expertise includes healthcare interoperability standards such as HL7 and FHIR.</li>
            <li>His work emphasizes reliability, observability, security, and maintainable architecture.</li>
            <li>He provides services across engineering execution, system integration, and technical strategy.</li>
            <li>This site documents projects, services, and technical writing for fast evaluation.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-card/75">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-2xl font-semibold text-foreground">FAQ</h2>
          <div className="space-y-4">
            {ABOUT_FAQ.map((item) => (
              <div key={item.question} className="rounded-2xl border border-border/70 bg-card/70 p-4">
                <h3 className="text-base font-semibold text-foreground">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-foreground/75">{item.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <JsonLd id="schema-about-page" data={webPageJsonLd} />
      <JsonLd id="schema-about-aboutpage" data={aboutPageJsonLd} />
      <JsonLd id="schema-about-breadcrumb" data={breadcrumbJsonLd} />
      <JsonLd id="schema-about-faq" data={faqJsonLd} />
    </SectionShell>
  );
}
