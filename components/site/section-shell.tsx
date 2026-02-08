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
      <div className="mb-10 max-w-2xl">
        <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">{title}</h1>
        {description ? <p className="mt-4 text-lg text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
