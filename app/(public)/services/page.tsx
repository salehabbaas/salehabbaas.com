import { Metadata } from "next";

import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { services } from "@/lib/data/resume";

export const metadata: Metadata = {
  title: "Services | Saleh Abbaas",
  description: "Services provided by Saleh Abbaas."
};

export default function ServicesPage() {
  return (
    <SectionShell title="Services" description="Product engineering and growth systems delivered with a pragmatic, production-first mindset.">
      <div className="grid gap-4 md:grid-cols-3">
        {services.map((service) => (
          <Card key={service.title} className="bg-white/85">
            <CardHeader>
              <CardTitle>{service.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{service.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}
