import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[-0.01em] transition-[transform,colors,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary text-primary-foreground shadow-[0_14px_40px_-24px_hsl(var(--primary)/0.8)] hover:bg-primary/90 hover:shadow-[0_18px_50px_-24px_hsl(var(--primary)/0.7)]",
        secondary: "bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        ghost: "hover:bg-muted/40",
        outline:
          "border border-border/70 bg-card/75 text-foreground/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur hover:bg-card/95",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        cta:
          "bg-[linear-gradient(135deg,hsl(var(--accent-strong)),hsl(var(--accent)))] text-[hsl(var(--surface-950))] shadow-[0_18px_50px_-24px_hsl(var(--accent-strong)/0.8)] hover:shadow-[0_24px_60px_-26px_hsl(var(--accent)/0.8)]"
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-4",
        lg: "h-12 px-6",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref as never} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
