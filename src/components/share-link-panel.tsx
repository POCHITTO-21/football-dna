"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ChoiceGroup } from "@/components/ui/choice-fields";
import { createShareLink, revokeShareLink, setShareLinkEnabled, type ShareLinkView } from "@/app/actions/account";

const EXPIRY = [
  { value: "1", label: "1日" },
  { value: "7", label: "7日" },
  { value: "30", label: "30日" },
  { value: "none", label: "期限なし" },
] as const;

/** 非公開の共有リンク: 作成 → 明示的に公開 → コピー/共有 → 失効。URLは作成時にしか表示しない。 */
export function ShareLinkPanel({ resultId, hasNickname }: { resultId: string; hasNickname: boolean }) {
  const [expiry, setExpiry] = useState<string>("7");
  const [includeNickname, setIncludeNickname] = useState(false);
  const [link, setLink] = useState<{ view: ShareLinkView; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      setError(null);
      const r = await createShareLink({
        resultId,
        expiresInDays: expiry === "none" ? null : Number(expiry),
        includeNickname,
      });
      if (r.ok) setLink({ view: r.data.link, url: r.data.url });
      else setError(r.error);
    });

  const toggle = (enabled: boolean) =>
    link &&
    start(async () => {
      setError(null);
      const r = await setShareLinkEnabled({ id: link.view.id, enabled });
      if (r.ok) setLink({ ...link, view: r.data });
      else setError(r.error);
    });

  const revoke = () =>
    link &&
    start(async () => {
      const r = await revokeShareLink(link.view.id);
      if (r.ok) setLink(null);
      else setError(r.error);
    });

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("コピーできませんでした。URLを長押しして手動でコピーしてください。");
    }
  };

  const text = "わたしのサッカーのプレースタイルはこちら #FOOTBALLDNA";
  const live = link?.view.enabled;

  return (
    <Card className="space-y-4">
      <CardTitle>共有リンク（URLで共有）</CardTitle>
      {!link ? (
        <>
          <ChoiceGroup name="expiry" legend="公開期限" options={EXPIRY} value={expiry} onChange={(v) => setExpiry(v as string)} />
          {hasNickname && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeNickname}
                onChange={(e) => setIncludeNickname(e.target.checked)}
                className="size-4 accent-[var(--green-500)]"
              />
              共有ページにニックネームを表示する
            </label>
          )}
          <Button block disabled={pending} onClick={create}>
            共有リンクを作る（まだ公開されません）
          </Button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="break-all rounded-lg bg-navy-800 p-3 font-mono text-xs">{link.url}</p>
          <p role="status" className="text-sm">
            状態：<span className={live ? "font-bold text-accent" : "font-bold"}>{live ? "公開中" : "非公開（まだ誰も見られません）"}</span>
          </p>
          <p className="text-xs text-warn">このURLは今だけ表示されます。必要ならコピーして保管してください。</p>
          {live ? (
            <Button variant="secondary" block disabled={pending} onClick={() => toggle(false)}>
              公開を止める
            </Button>
          ) : (
            <Button block disabled={pending} onClick={() => toggle(true)}>
              公開する
            </Button>
          )}
          {live && (
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="secondary" onClick={copy}>
                {copied ? "コピー済み" : "URLをコピー"}
              </Button>
              <a
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-navy-600 bg-navy-800 text-sm font-bold"
                href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(link.url)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                LINEで送る
              </a>
              <a
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-navy-600 bg-navy-800 text-sm font-bold"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link.url)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Xでポスト
              </a>
            </div>
          )}
          <Button variant="danger" size="sm" block disabled={pending} onClick={revoke}>
            このリンクを失効させる
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-ink-muted">
        共有ページに表示されるのは、タイプ名・8つの志向・ポジション候補（と、選んだ場合のニックネーム）だけです。リンクの管理は「プライバシー設定」からもできます。
      </p>
    </Card>
  );
}
