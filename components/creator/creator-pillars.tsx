import { Badge } from "@/components/ui/badge";

export function CreatorPillars({ pillars }: { pillars: Array<{ pillar: string; count: number }> }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/85 p-6">
      <h3 className="font-serif text-2xl">What I post about</h3>
      <p className="mt-2 text-sm text-muted-foreground">Core topic pillars across my content system.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {pillars.map((item) => (
          <Badge key={item.pillar} variant="secondary" className="text-sm">
            {item.pillar} ({item.count})
          </Badge>
        ))}
      </div>
    </div>
  );
}
