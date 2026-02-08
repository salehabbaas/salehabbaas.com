import { Metadata } from "next";

import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeServices } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Services",
  description: "Services provided by Saleh Abbaas.",
  path: "/services"
});

export const revalidate = 300;

export default async function ServicesPage() {
  const services = await safeServices();
  const webPageJsonLd = pageSchema({
    title: "Services",
    description: "Services provided by Saleh Abbaas.",
    path: "/services"
  });

  return (
    <SectionShell title="Services" description="Product engineering and growth systems delivered with a pragmatic, production-first mindset.">
      <div className="grid gap-4 md:grid-cols-3">
        {services.length ? (
          services.map((service) => (
            <Card key={service.id} className="bg-card/85">
              <CardHeader>
                <CardTitle>{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{service.detail}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Add services from admin CMS.</p>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </SectionShell>
  );
}
