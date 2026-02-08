import { Metadata } from "next";

import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent } from "@/components/ui/card";
import { certificates } from "@/lib/data/resume";

export const metadata: Metadata = {
  title: "Certificates | Saleh Abbaas",
  description: "Professional certificates earned by Saleh Abbaas."
};

export default function CertificatesPage() {
  return (
    <SectionShell title="Certificates" description="Industry credentials that support execution quality and technical depth.">
      <div className="grid gap-4 md:grid-cols-3">
        {certificates.map((certificate) => (
          <Card key={certificate.title} className="bg-white/85">
            <CardContent className="space-y-1 pt-6">
              <h3 className="font-semibold">{certificate.title}</h3>
              <p className="text-sm text-muted-foreground">{certificate.issuer}</p>
              <p className="text-sm text-muted-foreground">{certificate.year}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}
