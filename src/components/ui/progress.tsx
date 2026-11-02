import { cn } from "@/lib/utils";

export function Progress({ value, max, label, className }: { value: number; max: number; label: string; className?: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-navy-700", className)}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}
