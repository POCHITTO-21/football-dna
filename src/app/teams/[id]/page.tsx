import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { AxisRadar } from "@/components/axis-radar";
import { ActionButton } from "@/components/teams/action-button";
import { MemberList, type MemberView } from "@/components/teams/member-list";
import { Card, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { deleteTeam, leaveTeam, setTeamShare } from "@/app/actions/teams";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAuditEvents, loadTeamPage, type MyTeam } from "@/lib/teams/queries";
import { AUDIT_LABEL, ROLE_LABEL } from "@/lib/teams/labels";
import { positionLabel, typeDef } from "@/lib/scoring/config";

export const metadata: Metadata = { title: "チーム", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  if (!user) redirect(`/login?next=/teams/${id}`);
  const page = await loadTeamPage(id);
  if (page.kind === "not_found") notFound();

  if (page.kind === "member") return <PlayerView team={page.team} me={page.me} />;

  const isOwner = page.me.role === "owner";
  const audit = await listAuditEvents(id);
  const nameOf = new Map(page.members.map((m) => [m.userId, m.memberName]));
  const members: MemberView[] = page.members.map((m) => {
    const l = page.latest.get(m.userId);
    return {
      id: m.id,
      role: m.role,
      memberName: m.memberName,
      status: m.status,
      consentStatus: m.consentStatus,
      needsGuardian: m.needsGuardian,
      canView: m.canView,
      latest: l ? { typeId: l.typeId, topPositions: l.topPositions, createdAt: l.createdAt } : null,
    };
  });
  const agg = page.aggregate;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-ink-muted">
          {ROLE_LABEL[page.me.role]}・{page.me.memberName}
        </p>
        <h1 className="text-2xl font-black">{page.team.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <LinkButton href={`/teams/${id}/invite`} variant="secondary">
          招待コード
        </LinkButton>
        <a
          href={`/teams/${id}/export`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-navy-600 bg-navy-800 px-5 font-bold hover:bg-navy-700"
        >
          CSVを出力
        </a>
      </div>

      <Card>
        <CardTitle>チームの傾向</CardTitle>
        {agg.hidden ? (
          <p className="text-sm text-ink-muted">
            結果を共有している選手が{agg.threshold}人以上になると表示されます（現在 {agg.count}人）。少人数だと個人が特定されやすいため、表示していません。
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">結果を共有している選手 {agg.count}人の最新の結果の平均です。</p>
            <AxisRadar scores={agg.axisAverages} />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <h3 className="mb-1 font-bold">タイプ</h3>
                <ul className="space-y-1">
                  {agg.typeCounts.map((t) => (
                    <li key={t.typeId} className="flex justify-between">
                      <span>{typeDef(t.typeId).name}</span>
                      <span className="tabular-nums">{t.count}人</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 font-bold">ポジション候補</h3>
                <ul className="space-y-1">
                  {agg.positionCounts.slice(0, 8).map((p) => (
                    <li key={p.positionId} className="flex justify-between">
                      <span>{positionLabel(p.positionId)}</span>
                      <span className="tabular-nums">{p.count}人</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>メンバー</CardTitle>
        <MemberList teamId={id} members={members} isOwner={isOwner} />
        <p className="mt-4 text-xs text-ink-muted">
          選手の診断結果は、選手本人が「指導者に結果を見せる」を選び、18歳未満の選手は保護者も同意した場合だけ表示されます。個人のランキングや選抜スコアはありません。
        </p>
      </Card>

      <Card>
        <details>
          <summary className="min-h-11 cursor-pointer py-2 font-bold">操作の記録（最新50件）</summary>
          {audit.length === 0 ? (
            <p className="text-sm text-ink-muted">記録はありません。</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {audit.map((e) => (
                <li key={e.id} className="flex justify-between gap-2 border-b border-navy-800 py-1">
                  <span>
                    {(e.actorId && nameOf.get(e.actorId)) ?? "（退会済み）"}：{AUDIT_LABEL[e.action] ?? e.action}
                    {e.targetUserId && e.targetUserId !== e.actorId && nameOf.get(e.targetUserId) ? `（${nameOf.get(e.targetUserId)}）` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted">{new Date(e.createdAt).toLocaleString("ja-JP")}</span>
                </li>
              ))}
            </ul>
          )}
        </details>
      </Card>

      {isOwner && (
        <Card>
          <CardTitle>チームの削除</CardTitle>
          <p className="mb-3 text-sm text-ink-muted">チーム、メンバー、招待コードを削除します。選手の診断結果そのものは各選手のアカウントに残ります。</p>
          <ActionButton
            variant="danger"
            size="md"
            block
            confirm={`「${page.team.name}」を削除します。元に戻せません。よろしいですか？`}
            redirectTo="/teams"
            action={deleteTeam.bind(null, id)}
          >
            チームを削除する
          </ActionButton>
        </Card>
      )}
      {!isOwner && <LeaveCard teamId={id} name={page.team.name} />}
      <Link href="/teams" className="block text-center text-sm text-ink-muted underline underline-offset-2">
        チーム一覧へ
      </Link>
    </div>
  );
}

function LeaveCard({ teamId, name }: { teamId: string; name: string }) {
  return (
    <Card>
      <CardTitle>チームを退会</CardTitle>
      <ActionButton variant="danger" size="md" block confirm={`「${name}」を退会しますか？`} redirectTo="/teams" action={leaveTeam.bind(null, teamId)}>
        退会する
      </ActionButton>
    </Card>
  );
}

const SHARE_STATE: Record<string, { label: string; detail: string }> = {
  none: { label: "見せていない", detail: "指導者はあなたの診断結果を見られません。" },
  self: { label: "見せている", detail: "指導者は、あなたがアカウントに保存した診断結果を見られます。" },
  guardian_pending: {
    label: "保護者の同意待ち",
    detail: "18歳未満の方は、保護者の同意があるまで指導者には見えません。保護者の方に「保護者の方へ」のページで同意してもらってください。",
  },
  guardian_confirmed: { label: "見せている（保護者の同意済み）", detail: "指導者は、あなたがアカウントに保存した診断結果を見られます。" },
};

function PlayerView({ team, me }: { team: { id: string; name: string }; me: MyTeam }) {
  const state = SHARE_STATE[me.consentStatus] ?? SHARE_STATE.none;
  const sharing = me.consentStatus !== "none";
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-ink-muted">
          {ROLE_LABEL[me.role]}・{me.memberName}
        </p>
        <h1 className="text-2xl font-black">{team.name}</h1>
      </div>
      {me.status === "pending" ? (
        <Card>
          <p className="text-sm">参加を申請しました。指導者が承認するまでお待ちください。</p>
        </Card>
      ) : me.role === "player" ? (
        <Card className="space-y-3">
          <CardTitle>指導者に診断結果を見せる</CardTitle>
          <p className="text-sm">
            いまの状態：<span className="font-bold text-accent">{state.label}</span>
          </p>
          <p className="text-sm text-ink-muted">{state.detail}</p>
          {me.consentStatus === "guardian_pending" && (
            <p className="text-sm text-ink-muted">
              まだ保護者を登録していない場合は、
              <Link href="/settings#guardian" className="underline underline-offset-2">
                プライバシー設定
              </Link>
              から保護者確認リンクを作って、おうちの人に送ってください。
            </p>
          )}
          <ActionButton
            variant={sharing ? "secondary" : "primary"}
            size="md"
            block
            action={setTeamShare.bind(null, { teamId: team.id, share: !sharing })}
          >
            {sharing ? "見せるのをやめる" : "指導者に結果を見せる"}
          </ActionButton>
          <p className="text-xs text-ink-muted">いつでもやめられます。やめると、指導者はすぐに見られなくなります。</p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-ink-muted">オーナーの承認後に、選手の一覧を見られるようになります。</p>
        </Card>
      )}
      <LeaveCard teamId={team.id} name={team.name} />
      <Link href="/teams" className="block text-center text-sm text-ink-muted underline underline-offset-2">
        チーム一覧へ
      </Link>
    </div>
  );
}
