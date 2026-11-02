import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { SignOutButton } from "@/components/account-buttons";
import { listMyResults } from "@/app/actions/account";
import { getCurrentUser } from "@/lib/supabase/server";
import { typeDef } from "@/lib/scoring/config";

export const metadata: Metadata = { title: "診断履歴", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MePage() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  if (!user) redirect("/login?next=/me");
  const res = await listMyResults();
  const items = res.ok ? res.data : [];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">診断履歴</h1>
        <SignOutButton />
      </div>
      {!res.ok && (
        <p role="alert" className="text-sm text-danger">
          {res.error}
        </p>
      )}
      {items.length === 0 ? (
        <Card className="space-y-3 text-center">
          <p className="text-sm text-ink-muted">保存された診断結果はまだありません。診断後に「アカウントに保存」を押すと、ここに表示されます。</p>
          <LinkButton href="/diagnosis/profile" block>
            診断する
          </LinkButton>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id}>
              <Link
                href={`/results/${r.id}`}
                className="flex min-h-14 items-center justify-between rounded-2xl border border-navy-700 bg-navy-900/80 px-4 py-3 hover:border-accent/60"
              >
                <span>
                  <span className="block font-bold">{typeDef(r.typeId).name}</span>
                  <span className="text-xs text-ink-muted">{r.topPositions.join(" / ")}</span>
                </span>
                <span className="text-xs text-ink-muted">{new Date(r.createdAt).toLocaleDateString("ja-JP")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <LinkButton href="/settings" variant="secondary" block>
        共有リンク・データ削除の設定
      </LinkButton>
    </div>
  );
}
