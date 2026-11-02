import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { ActionButton } from "@/components/teams/action-button";
import { Card, CardTitle } from "@/components/ui/card";
import { guardianSetTeamShare, removeGuardianLink } from "@/app/actions/teams";
import { getCurrentUser } from "@/lib/supabase/server";
import { loadGuardianOverview, type GuardianChildRow } from "@/lib/teams/queries";

export const metadata: Metadata = { title: "保護者の方へ", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATE: Record<string, string> = {
  none: "お子さんは共有していません",
  self: "共有中",
  guardian_pending: "お子さんが共有を希望しています（あなたの同意待ち）",
  guardian_confirmed: "あなたが同意済み（指導者に表示中）",
};

export default async function GuardianPage() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  if (!user) redirect("/login?next=/guardian");
  const rows = await loadGuardianOverview();
  const children = new Map<string, GuardianChildRow[]>();
  for (const r of rows) children.set(r.childId, [...(children.get(r.childId) ?? []), r]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">保護者の方へ</h1>
      <p className="text-sm leading-relaxed text-ink-muted">
        お子さんがチームに参加し、診断結果を指導者に見せたいと希望したとき、あなたが同意するまで指導者には表示されません。同意はいつでも取り消せます。
      </p>
      {children.size === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            登録されているお子さんはいません。お子さんのアカウントの「プライバシー設定」で保護者確認リンクを作ってもらい、そのリンクを開いてください。
          </p>
        </Card>
      ) : (
        [...children.entries()].map(([childId, list]) => (
          <Card key={childId} className="space-y-3">
            <CardTitle>{list[0].childName ? `${list[0].childName} さん` : "お子さん"}</CardTitle>
            {list.filter((r) => r.memberId).length === 0 ? (
              <p className="text-sm text-ink-muted">参加しているチームはありません。</p>
            ) : (
              <ul className="space-y-2">
                {list
                  .filter((r) => r.memberId)
                  .map((r) => (
                    <li key={r.memberId} className="space-y-2 rounded-xl bg-navy-800 p-3 text-sm">
                      <p className="font-bold">{r.teamName}</p>
                      <p className="text-xs text-ink-muted">
                        チーム内の名前：{r.memberName}
                        {r.memberStatus === "pending" ? "（参加承認待ち）" : ""}
                      </p>
                      <p>{STATE[r.consentStatus ?? "none"]}</p>
                      {r.consentStatus === "guardian_pending" && (
                        <ActionButton
                          variant="primary"
                          confirm={`「${r.teamName}」の指導者に、お子さんの診断結果（タイプ・8つの志向・ポジション候補）を見せることに同意しますか？`}
                          action={guardianSetTeamShare.bind(null, { memberId: r.memberId!, approve: true })}
                        >
                          指導者に見せることに同意する
                        </ActionButton>
                      )}
                      {r.consentStatus === "guardian_confirmed" && (
                        <ActionButton variant="secondary" action={guardianSetTeamShare.bind(null, { memberId: r.memberId!, approve: false })}>
                          同意を取り消す
                        </ActionButton>
                      )}
                    </li>
                  ))}
              </ul>
            )}
            <ActionButton
              variant="ghost"
              confirm="このお子さんの保護者登録を解除しますか？チームへの同意も取り消されます。"
              action={removeGuardianLink.bind(null, { guardianId: user.id, childId })}
            >
              保護者の登録を解除
            </ActionButton>
          </Card>
        ))
      )}
      <p className="text-xs leading-relaxed text-ink-muted">
        保護者として同意しても、お子さんの回答内容や診断結果そのものは、このページには表示されません。結果はお子さんの端末・アカウントで一緒にご覧ください。
      </p>
    </div>
  );
}
