import { CreatorContentCard } from "@/components/creator/content-card";
import { ContentVariant } from "@/types/creator";

export function CreatorFromHome({ items }: { items: ContentVariant[] }) {
  return (
    <section className="container pb-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-primary/80">From the Creator</p>
          <h2 className="mt-2 font-serif text-3xl">Latest content from Saleh Abbaas</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <CreatorContentCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
