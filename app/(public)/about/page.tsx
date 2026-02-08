import { Metadata } from "next";

import { CreatorPillars } from "@/components/creator/creator-pillars";
import { ResumeDownloadLink } from "@/components/site/resume-download-link";
import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent } from "@/components/ui/card";
import { safeGetPillars } from "@/lib/firestore/public";
import { safeProfile } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description: "About Saleh Abbaas, software engineer and Firebase architect.",
  path: "/about"
});

export const revalidate = 300;

export default async function AboutPage() {
  const [pillars, profile] = await Promise.all([safeGetPillars(), safeProfile()]);

  const webPageJsonLd = pageSchema({
    title: "About",
    description: "About Saleh Abbaas, software engineer and Firebase architect.",
    path: "/about"
  });

  return (
    <SectionShell title="About" description={profile.headline || "I design and engineer product systems for measurable growth."}>
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card className="bg-card/85">
          <CardContent className="space-y-4 pt-6">
            <p className="text-lg leading-8 text-foreground/80">{profile.bio || "Update biography from the admin CMS."}</p>
            <ResumeDownloadLink url={profile.resumeUrl} />
          </CardContent>
        </Card>
        <CreatorPillars pillars={pillars} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </SectionShell>
  );
}
