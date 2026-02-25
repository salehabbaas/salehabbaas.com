import { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent } from "@/components/ui/card";
import { ensurePublicPageVisible } from "@/lib/firestore/public-page-guard";
import { safeCertificates } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";

const CERTIFICATES_DESCRIPTION =
  "Professional certificates earned by Saleh Abbaas across cloud, data, healthcare technology, and software engineering.";

export const metadata: Metadata = buildPageMetadata({
  title: "Certificates",
  description: CERTIFICATES_DESCRIPTION,
  path: "/certificates"
});

export const revalidate = 300;

export default async function CertificatesPage() {
  await ensurePublicPageVisible("/certificates");
  const certificates = await safeCertificates();
  const webPageJsonLd = pageSchema({
    title: "Certificates",
    description: CERTIFICATES_DESCRIPTION,
    path: "/certificates"
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Certificates", url: resolveAbsoluteUrl("/certificates") }
  ]);

  return (
    <SectionShell path="/certificates" title="Certificates" description="Industry credentials that support execution quality and technical depth.">
      <div className="grid gap-4 md:grid-cols-3">
        {certificates.length ? (
          certificates.map((certificate) => (
            <Card key={certificate.id} className="bg-card/75">
              <CardContent className="space-y-1 pt-6">
                <h3 className="font-semibold text-foreground">{certificate.title}</h3>
                <p className="text-sm text-foreground/75">{certificate.issuer}</p>
                <p className="text-sm text-muted-foreground">{certificate.year}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Add certificates from admin CMS.</p>
        )}
      </div>
      <JsonLd id="schema-certificates-page" data={webPageJsonLd} />
      <JsonLd id="schema-certificates-breadcrumb" data={breadcrumbJsonLd} />
    </SectionShell>
  );
}
