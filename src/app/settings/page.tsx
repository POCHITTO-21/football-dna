import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { Card, CardTitle } from "@/components/ui/card";
import { DeleteAccountButton, ShareLinkControls } from "@/components/account-buttons";
import { DeleteLocalData } from "@/components/delete-local-data";
import { listMyShareLinks } from "@/app/actions/account";
import { removeGuardianLink } from "@/app/actions/teams";
import { ActionButton } from "@/components/teams/action-button";
import { AgeBandForm } from "@/components/teams/forms";
import { GuardianLinkCreator } from "@/components/teams/guardian";
import { getCurrentUser } from "@/lib/supabase/server";
import { getAccountInfo, listMyGuardians } from "@/lib/teams/queries";

export const metadata: Metadata = { title: "プライバシー設定", robots: { index: false } };
export const dynamic = "force-dynamic";

function status(l: { enabled: boolean; revokedAt: string | null; expiresAt: string | null }) {
  if (l.revokedAt) return "失効済み";
  if (l.expiresAt && new Date(l.expiresAt) <= new Date()) return "期限切れ";
  return l.enabled ? "公開中" : "非公開";
}

export default async function SettingsPage() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  if (!user) redirect("/login?next=/settings");
  const [res, account, guardians] = await Promise.all([listMyShareLinks(), getAccountInfo(), listMyGuardians()]);
  const links = res.ok ? res.data : [];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">プライバシー設定</h1>
      <Card id="age-band">
        <CardTitle>アカウントの年代</CardTitle>
        <p className="mb-3 text-sm text-ink-muted">
          18歳未満の方（「回答しない」を含む）は、共有リンクの公開やチームの指導者に結果を見せるときに保護者の確認が必要です。診断結果をアカウントに保存したときにも、そのときの年代で更新されます。
        </p>
        <AgeBandForm current={account?.ageBand ?? null} />
      </Card>
      {!account?.isAdult && (
        <Card id="guardian">
          <CardTitle>保護者の確認</CardTitle>
          <p className="mb-3 text-sm text-ink-muted">
            {account?.consentStatus === "guardian_confirmed"
              ? "保護者の確認が済んでいます。共有リンクを公開できます。チームの指導者に結果を見せるときは、チームごとに保護者の同意が必要です。"
              : "保護者確認リンクを作って、おうちの人に送ってください。保護者の方が確認すると、共有リンクを公開できるようになり、チームへの共有にも同意してもらえます。"}
          </p>
          {guardians.length > 0 && (
            <ul className="mb-3 space-y-2">
              {guardians.map((g, i) => (
                <li key={g.guardianId} className="flex items-center justify-between rounded-xl bg-navy-800 p-3 text-sm">
                  <span>
                    保護者 {i + 1}（{new Date(g.createdAt).toLocaleDateString("ja-JP")} 登録）
                  </span>
                  <ActionButton
                    variant="ghost"
                    confirm="この保護者の登録を解除しますか？チームへの同意や公開中の共有リンクも止まります。"
                    action={removeGuardianLink.bind(null, { guardianId: g.guardianId, childId: user.id })}
                  >
                    解除
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}
          <GuardianLinkCreator />
        </Card>
      )}
      <Card>
        <CardTitle>共有リンク</CardTitle>
        <p className="mb-3 text-sm text-ink-muted">
          共有リンクは作成時は非公開です。「公開する」を押したリンクだけが、URLを知っている人に見えます。いつでも失効・削除できます。
        </p>
        {links.length === 0 ? (
          <p className="text-sm text-ink-muted">共有リンクはありません。</p>
        ) : (
          <ul className="space-y-3">
            {links.map((l) => (
              <li key={l.id} className="space-y-2 rounded-xl bg-navy-800 p-3 text-sm">
                <div className="flex justify-between">
                  <Link href={`/results/${l.resultId}`} className="underline underline-offset-2">
                    {new Date(l.createdAt).toLocaleString("ja-JP")} 作成
                  </Link>
                  <span className="font-bold">{status(l)}</span>
                </div>
                <p className="text-xs text-ink-muted">
                  期限：{l.expiresAt ? new Date(l.expiresAt).toLocaleString("ja-JP") : "なし"} ／ ニックネーム表示：{l.includeNickname ? "あり" : "なし"}
                </p>
                <ShareLinkControls id={l.id} enabled={l.enabled} revoked={!!l.revokedAt} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-muted">セキュリティのため、リンクのURLは作成時にしか表示されません。URLを忘れた場合は新しく作り直してください。</p>
      </Card>
      <Card>
        <CardTitle>この端末のデータ</CardTitle>
        <DeleteLocalData />
      </Card>
      <Card>
        <CardTitle>アカウントの削除</CardTitle>
        <p className="mb-3 text-sm text-ink-muted">アカウント、保存した診断結果、回答、共有リンクをすべて削除します。</p>
        <DeleteAccountButton />
      </Card>
    </div>
  );
}
