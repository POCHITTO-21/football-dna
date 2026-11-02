"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requestLoginLink } from "@/app/actions/account";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await requestLoginLink({ email, next });
            setMessage(
              r.ok
                ? { ok: true, text: "ログイン用のメールを送りました。メール内のリンクを開いてください。" }
                : { ok: false, text: r.error },
            );
          });
        }}
      >
        <label htmlFor="email" className="block font-bold">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-navy-600 bg-navy-800 px-3 text-ink"
        />
        <Button type="submit" block disabled={pending || !email}>
          {pending ? "送信中…" : "ログインリンクを送る"}
        </Button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-accent" : "text-sm text-danger"}>
            {message.text}
          </p>
        )}
      </form>
    </Card>
  );
}
