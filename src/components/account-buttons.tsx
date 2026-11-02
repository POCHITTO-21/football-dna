"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteMyAccount, deleteShareLink, revokeShareLink, setShareLinkEnabled, signOut } from "@/app/actions/account";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await signOut();
          router.push("/");
          router.refresh();
        })
      }
    >
      ログアウト
    </Button>
  );
}

export function DeleteAccountButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        block
        disabled={pending}
        onClick={() => {
          if (!window.confirm("アカウントと、保存したすべての診断結果・共有リンクを削除します。元に戻せません。よろしいですか？")) return;
          start(async () => {
            const r = await deleteMyAccount();
            if (!r.ok) return setError(r.error);
            router.push("/");
            router.refresh();
          });
        }}
      >
        アカウントとすべてのデータを削除
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function ShareLinkControls({ id, enabled, revoked }: { id: string; enabled: boolean; revoked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "失敗しました");
      else {
        setError(null);
        router.refresh();
      }
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!revoked && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setShareLinkEnabled({ id, enabled: !enabled }))}>
            {enabled ? "公開を止める" : "公開する"}
          </Button>
        )}
        {!revoked && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => revokeShareLink(id))}>
            失効させる
          </Button>
        )}
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => window.confirm("この共有リンクを削除しますか？") && run(() => deleteShareLink(id))}
        >
          削除
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
