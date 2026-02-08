import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface FilterProps {
  activePillar?: string;
  activePlatform?: string;
  activeType?: string;
  pillars: string[];
  platforms: string[];
  types: string[];
}

function formatLabel(input: string) {
  return input.replace(/_/g, " ");
}

export function CreatorFilters({ activePillar, activePlatform, activeType, pillars, platforms, types }: FilterProps) {
  return (
    <form className="grid gap-3 rounded-3xl border border-border/70 bg-card/85 p-5 md:grid-cols-5">
      <Select name="pillar" defaultValue={activePillar || ""}>
        <option value="">All Pillars</option>
        {pillars.map((pillar) => (
          <option key={pillar} value={pillar}>
            {pillar}
          </option>
        ))}
      </Select>
      <Select name="platform" defaultValue={activePlatform || ""}>
        <option value="">All Platforms</option>
        {platforms.map((platform) => (
          <option key={platform} value={platform}>
            {formatLabel(platform)}
          </option>
        ))}
      </Select>
      <Select name="type" defaultValue={activeType || ""}>
        <option value="">All Content Types</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {formatLabel(type)}
          </option>
        ))}
      </Select>
      <input type="hidden" name="page" value="1" />
      <Button type="submit" className="md:col-span-2">
        Apply Filters
      </Button>
    </form>
  );
}
