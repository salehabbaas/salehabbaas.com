import * as React from "react";

import { cn } from "@/lib/utils";

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-2xl border border-input/80 bg-card/75 px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Select };
