import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { Card, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { CreateTeamForm } from "@/components/teams/forms";
import { getCurrentUser } from "@/lib/supabase/server";
import { getAccountInfo, listMyTeams } from "@/lib/teams/queries";
import { ROLE_LABEL } from "@/lib/teams/labels";

export const metadata: Metadata = { title: "チーム", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  if (!user) redirect("/login?next=/teams");
  const [teams, account] = await Promise.all([listMyTeams(), getAccountInfo()]);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">チーム</h1>
      {teams.length === 0 ? (
        <p className="text-sm text-ink-muted">まだチームに参加していません。</p>
      ) : (
        <ul className="space-y-2">
          {teams.map((t) => (
            <li key={t.memberId}>
              <Link
                href={`/teams/${t.teamId}`}
                className="flex min-h-14 items-center justify-between rounded-2xl border border-navy-700 bg-navy-900/80 px-4 py-3 hover:border-accent/60"
              >
                <span>
                  <span className="block font-bold">{t.teamName}</span>
                  <span className="text-xs text-ink-muted">
                    {ROLE_LABEL[t.role]}・{t.memberName}
                  </span>
                </span>
                {t.status === "pending" && <span className="text-xs font-bold text-warn">承認待ち</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardTitle>招待コードで参加する（選手・コーチ）</CardTitle>
        <p className="mb-3 text-sm text-ink-muted">指導者から受け取った招待コードで参加を申請します。指導者が承認すると参加できます。</p>
        <LinkButton href="/teams/join" block>
          招待コードを入力する
        </LinkButton>
      </Card>

      <Card>
        <CardTitle>チームを作る（指導者）</CardTitle>
        {account?.isAdult ? (
          <>
            <p className="mb-3 text-sm text-ink-muted">
              チームを作ると、あなたがオーナーになります。選手の診断結果は、選手本人（未成年の場合は保護者も）が同意した場合だけ表示されます。
            </p>
            <CreateTeamForm />
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            チームの作成は、年代が18歳以上の方のみできます。
            <Link href="/settings#age-band" className="underline underline-offset-2">
              プライバシー設定
            </Link>
            で年代を設定してください。
          </p>
        )}
      </Card>
      <p className="text-xs leading-relaxed text-ink-muted">
        診断結果は自己回答にもとづく傾向です。選手の選抜・序列づけには使わず、本人と話すきっかけとしてご活用ください。
      </p>
    </div>
  );
}
