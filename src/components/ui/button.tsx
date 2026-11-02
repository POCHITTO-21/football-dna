import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-accent text-navy-950 hover:bg-accent-strong",
        secondary: "border border-navy-600 bg-navy-800 text-ink hover:bg-navy-700",
        ghost: "text-ink-muted hover:bg-navy-800 hover:text-ink",
        danger: "border border-danger/60 text-danger hover:bg-danger/10",
      },
      size: {
        md: "h-11",
        lg: "h-14 text-lg",
        sm: "min-h-9 h-9 px-3 text-sm",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

export function LinkButton({ className, variant, size, block, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}
