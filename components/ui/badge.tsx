import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors backdrop-blur",
  {
    variants: {
      variant: {
        default: "border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.18)] text-[hsl(var(--accent-strong))]",
        secondary: "border-border/70 bg-card/90 text-foreground/80",
        outline: "border-border/70 text-foreground/80"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
