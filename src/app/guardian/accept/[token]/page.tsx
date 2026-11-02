import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { GuardianAcceptForm } from "@/components/teams/guardian";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";
import { isWellFormedShareToken } from "@/lib/share-token";

export const metadata: Metadata = { title: "保護者の確認", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function GuardianAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  if (!isWellFormedShareToken(token)) {
    return (
      <Card>
        <p className="text-sm">このリンクは正しくありません。お子さんに新しいリンクを作ってもらってください。</p>
      </Card>
    );
  }
  if (!user) redirect(`/login?next=${encodeURIComponent(`/guardian/accept/${token}`)}`);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">保護者の確認</h1>
      <Card className="space-y-3 text-sm leading-relaxed">
        <p>お子さんから、FOOTBALL DNA の保護者確認の依頼が届いています。保護者として登録すると、次のことができるようになります。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>お子さんが共有リンク（URLで結果を見せる機能）を公開できるようになります</li>
          <li>お子さんがチームの指導者に結果を見せたいと希望したとき、同意・取り消しができます</li>
        </ul>
        <p className="text-ink-muted">
          必ずお子さんとは別の、保護者ご自身のメールアドレスでログインしてください。登録はいつでも解除できます。
        </p>
      </Card>
      <Card>
        <GuardianAcceptForm token={token} />
      </Card>
    </div>
  );
}
