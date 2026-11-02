import * as React from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/** ネイティブのラジオ/チェックボックスを大きなタップ領域（44px以上）で表示する */
export function ChoiceGroup({
  name,
  legend,
  options,
  type = "radio",
  value,
  onChange,
  error,
  hint,
  columns = 2,
}: {
  name: string;
  legend: string;
  options: readonly Option[];
  type?: "radio" | "checkbox";
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  error?: string;
  hint?: string;
  columns?: 1 | 2;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const selected = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <fieldset aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined}>
      <legend className="mb-1 text-base font-bold">{legend}</legend>
      {hint && (
        <p id={hintId} className="mb-2 text-sm text-ink-muted">
          {hint}
        </p>
      )}
      <div className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent-strong",
              selected(o.value)
                ? "border-accent bg-accent/15 text-ink"
                : "border-navy-600 bg-navy-800 text-ink-muted hover:border-navy-600 hover:text-ink",
            )}
          >
            <input
              type={type}
              name={name}
              value={o.value}
              checked={selected(o.value)}
              className="size-4 accent-[var(--green-500)]"
              onChange={(e) => {
                if (type === "checkbox") {
                  const cur = Array.isArray(value) ? value : [];
                  onChange(e.target.checked ? [...cur, o.value] : cur.filter((x) => x !== o.value));
                } else {
                  onChange(o.value);
                }
              }}
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
