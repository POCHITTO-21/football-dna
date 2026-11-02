"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Result = { ok: true } | { ok: false; error: string };

/** サーバーアクションを呼んで、成功したら画面を更新する汎用ボタン */
export function ActionButton({
  action,
  children,
  confirm,
  redirectTo,
  variant = "secondary",
  size = "sm",
  block,
}: {
  action: () => Promise<Result>;
  children: React.ReactNode;
  confirm?: string;
  redirectTo?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className={block ? "block space-y-1" : "inline-flex flex-col gap-1"}>
      <Button
        variant={variant}
        size={size}
        block={block}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await action();
            if (!r.ok) return setError(r.error);
            setError(null);
            if (redirectTo) router.push(redirectTo);
            router.refresh();
          });
        }}
      >
        {children}
      </Button>
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
