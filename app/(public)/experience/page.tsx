import { Metadata } from "next";

import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { experiences } from "@/lib/data/resume";

export const metadata: Metadata = {
  title: "Experience | Saleh Abbaas",
  description: "Professional experience of Saleh Abbaas."
};

export default function ExperiencePage() {
  return (
    <SectionShell title="Experience" description="Delivery-focused engineering across product, architecture, and growth systems.">
      <div className="space-y-4">
        {experiences.map((experience) => (
          <Card key={`${experience.company}-${experience.role}`} className="bg-white/85">
            <CardHeader>
              <CardTitle>
                {experience.role} · {experience.company}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{experience.period}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/85">{experience.summary}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {experience.achievements.map((achievement) => (
                  <li key={achievement}>{achievement}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}
