import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("rounded-2xl border border-navy-700 bg-navy-900/80 p-5 shadow-lg shadow-black/20", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("mb-3 text-lg font-bold text-ink", className)} {...props} />;
}
