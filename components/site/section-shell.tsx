import { cn } from "@/lib/utils";

export function SectionShell({
  title,
  description,
  className,
  children
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("container py-16 md:py-20", className)}>
      <div className="mb-10 max-w-2xl space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--accent-muted))]">Section</p>
        <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">
          <span className="text-gradient">{title}</span>
        </h1>
        {description ? <p className="text-lg leading-8 text-foreground/75">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
