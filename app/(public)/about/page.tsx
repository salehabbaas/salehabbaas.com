import { Metadata } from "next";

import { CreatorPillars } from "@/components/creator/creator-pillars";
import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent } from "@/components/ui/card";
import { aboutSummary } from "@/lib/data/resume";
import { safeGetPillars } from "@/lib/firestore/public";

export const metadata: Metadata = {
  title: "About | Saleh Abbaas",
  description: "About Saleh Abbaas, full-stack engineer and Firebase architect."
};

export const revalidate = 300;

export default async function AboutPage() {
  const pillars = await safeGetPillars();

  return (
    <SectionShell
      title="About"
      description="I design and engineer product systems that combine technology, storytelling, and measurable growth."
    >
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card className="bg-white/80">
          <CardContent className="pt-6">
            <p className="text-lg leading-8 text-foreground/80">{aboutSummary}</p>
          </CardContent>
        </Card>
        <CreatorPillars pillars={pillars} />
      </div>
    </SectionShell>
  );
}
