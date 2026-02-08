import { Metadata } from "next";

import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeExperiences } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Experience",
  description: "Professional experience of Saleh Abbaas.",
  path: "/experience"
});

export const revalidate = 300;

export default async function ExperiencePage() {
  const experiences = await safeExperiences();
  const webPageJsonLd = pageSchema({
    title: "Experience",
    description: "Professional experience of Saleh Abbaas.",
    path: "/experience"
  });

  return (
    <SectionShell title="Experience" description="Delivery-focused engineering across product, architecture, and growth systems.">
      <div className="space-y-4">
        {experiences.length ? (
          experiences.map((experience) => (
            <Card key={experience.id} className="bg-card/85">
              <CardHeader>
                <CardTitle>
                  {experience.role} · {experience.company}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {experience.startDate || ""} {experience.endDate ? `- ${experience.endDate}` : ""}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/85">{experience.summary}</p>
                {!!experience.achievements.length && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {experience.achievements.map((achievement) => (
                      <li key={achievement}>{achievement}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Add experience entries from admin CMS.</p>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </SectionShell>
  );
}
