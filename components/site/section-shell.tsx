import {
  Award,
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  Clapperboard,
  FolderKanban,
  Mail,
  Newspaper,
  Sparkles,
  User,
  Wrench
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublicPagePath } from "@/types/site-settings";

const sectionIconMap: Record<PublicPagePath, React.ComponentType<{ className?: string }>> = {
  "/": Sparkles,
  "/about": User,
  "/ai-news": Newspaper,
  "/experience": BriefcaseBusiness,
  "/projects": FolderKanban,
  "/services": Wrench,
  "/certificates": Award,
  "/blog": BookOpenText,
  "/creator": Clapperboard,
  "/public-statement": BookOpenText,
  "/book-meeting": CalendarDays,
  "/contact": Mail
};

export function SectionShell({
  path,
  title,
  description,
  className,
  children
}: {
  path: PublicPagePath;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const Icon = sectionIconMap[path];

  return (
    <section className={cn("container pb-16 pt-20 md:pb-20 md:pt-24", className)}>
      <div className="mb-10 max-w-3xl space-y-5">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-foreground/90">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {title}
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">{title}</h1>
        {description ? <p className="max-w-3xl text-base leading-8 text-foreground/75 md:text-lg">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
