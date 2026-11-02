"use client";
import { useState, useTransition } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveResultToAccount } from "@/app/actions/account";
import type { StoredResult } from "@/lib/storage";

/** ゲストの結果を、本人の明示的な操作でアカウントへ保存する */
export function SaveToAccount({ entry }: { entry: StoredResult }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ kind: "idle" } | { kind: "saved"; id: string } | { kind: "login" } | { kind: "error"; msg: string }>({
    kind: "idle",
  });
  return (
    <Card className="space-y-3">
      <h2 className="font-bold">アカウントに保存</h2>
      <p className="text-sm text-ink-muted">
        保存すると、履歴として残り、別の端末からも見られます。共有リンク（URLでの共有）も作れるようになります。
      </p>
      {state.kind === "saved" ? (
        <LinkButton href={`/results/${state.id}`} block>
          保存しました。アカウントの結果を開く
        </LinkButton>
      ) : state.kind === "login" ? (
        <LinkButton href={`/login?next=${encodeURIComponent(`/results/${entry.id}`)}`} block>
          ログインして保存する
        </LinkButton>
      ) : (
        <Button
          block
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveResultToAccount({ profile: entry.profile, answers: entry.answers });
              if (r.ok) setState({ kind: "saved", id: r.data.id });
              else if (r.error.includes("ログイン")) setState({ kind: "login" });
              else setState({ kind: "error", msg: r.error });
            })
          }
        >
          {pending ? "保存中…" : "アカウントに保存する"}
        </Button>
      )}
      {state.kind === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.msg}
        </p>
      )}
    </Card>
  );
}
