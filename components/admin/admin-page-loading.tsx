import { Loader2 } from "lucide-react";

export function AdminPageLoading({ label = "Loading admin data..." }: { label?: string }) {
  return (
    <div className="admin-workspace space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Please wait while we fetch the latest content and settings.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
        <div className="h-28 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
        <div className="h-28 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-border/60 bg-muted/35" />
    </div>
  );
}
