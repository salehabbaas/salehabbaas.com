import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, truncate } from "@/lib/utils";
import { ContentVariant } from "@/types/creator";

export function CreatorContentCard({ item }: { item: ContentVariant }) {
  return (
    <Card className="h-full border-border/70 bg-white/80 backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">{item.platform}</Badge>
          <Badge variant="secondary">{item.pillar}</Badge>
          <Badge variant="outline">{item.contentType}</Badge>
        </div>
        <CardTitle className="text-xl leading-snug">
          <Link href={`/creator/${item.slug}`} className="hover:text-primary">
            {item.seoTitle || item.contentTitle}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{truncate(item.hook || item.body || "No preview yet.", 145)}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(item.publishedAt)}</span>
          <Link href={`/creator/${item.slug}`} className="font-medium text-primary hover:underline">
            Read content
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
