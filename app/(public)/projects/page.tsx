import Link from "next/link";
import { Metadata } from "next";

import { SectionShell } from "@/components/site/section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { projects } from "@/lib/data/resume";

export const metadata: Metadata = {
  title: "Projects | Saleh Abbaas",
  description: "Portfolio and shipped systems by Saleh Abbaas."
};

export default function ProjectsPage() {
  return (
    <SectionShell title="Projects" description="Selected systems designed and built for performance, usability, and growth.">
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.slug} className="bg-white/85">
            <CardHeader>
              <CardTitle>{project.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{project.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-secondary px-2 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              <Link href={`/projects/${project.slug}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                View details
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}
