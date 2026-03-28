import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { Card, CardContent } from "@/components/ui/card";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";

const PRIVACY_DESCRIPTION =
  "Privacy Policy for SalehAbbaas.com and the Saleh Abbaas portfolio app, describing what data is collected, why, and how to request support.";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy | Saleh Abbaas",
  description: PRIVACY_DESCRIPTION,
  path: "/privacy"
});

export const revalidate = 3600;

export default function PrivacyPage() {
  const webPageJsonLd = pageSchema({
    title: "Privacy Policy",
    description: PRIVACY_DESCRIPTION,
    path: "/privacy"
  });

  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Privacy Policy", url: resolveAbsoluteUrl("/privacy") }
  ]);

  return (
    <section className="container pb-16 pt-20 md:pb-20 md:pt-24">
      <div className="mb-10 max-w-3xl space-y-5">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-foreground/90">
          Privacy Policy
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Privacy Policy</h1>
        <p className="max-w-3xl text-base leading-8 text-foreground/75 md:text-lg">
          This policy explains how SalehAbbaas.com and the related portfolio app handle personal information.
        </p>
      </div>

      <Card className="bg-card/75">
        <CardContent className="space-y-5 pt-6 text-sm leading-7 text-foreground/80">
          <p>
            <strong>Effective date:</strong> March 28, 2026
          </p>

          <div>
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              We may collect basic contact information you provide directly, such as your name, email address, and message details when you
              submit forms or contact requests.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Information</h2>
            <p>
              We use information to respond to inquiries, manage communication, improve website functionality, and maintain service reliability
              and security.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">3. Data Sharing</h2>
            <p>
              We do not sell personal information. Data may be processed by trusted infrastructure providers only as needed to operate the
              website and related services.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">4. Security</h2>
            <p>
              Reasonable technical and organizational safeguards are used to protect data. No internet transmission or storage system can be
              guaranteed as fully secure.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">5. External Links</h2>
            <p>
              This website may contain links to third-party websites. Their privacy practices are governed by their own policies.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">6. Your Choices</h2>
            <p>
              You may request updates or deletion of personal information you submitted directly by contacting us.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
            <p>
              For privacy questions, contact:
              {" "}
              <Link href="mailto:salehabbaas97@gmail.com" className="text-primary hover:underline">
                salehabbaas97@gmail.com
              </Link>
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">8. Policy Updates</h2>
            <p>
              This policy may be updated from time to time. Any changes will be posted on this page with the revised effective date.
            </p>
          </div>
        </CardContent>
      </Card>

      <JsonLd id="schema-privacy-page" data={webPageJsonLd} />
      <JsonLd id="schema-privacy-breadcrumb" data={breadcrumbJsonLd} />
    </section>
  );
}
