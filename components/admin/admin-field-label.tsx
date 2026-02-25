import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AdminFieldLabelProps = {
  htmlFor?: string;
  label: string;
  required?: boolean;
  helper?: string;
  className?: string;
};

export function AdminFieldLabel({ htmlFor, label, required = false, helper, className }: AdminFieldLabelProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
            required
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
          )}
        >
          {required ? "Required" : "Optional"}
        </span>
      </div>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
