import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { ActionButton } from "@/components/teams/action-button";
import { InviteCreator } from "@/components/teams/forms";
import { Card, CardTitle } from "@/components/ui/card";
import { revokeInvite } from "@/app/actions/teams";
import { getCurrentUser } from "@/lib/supabase/server";
import { isStaff, listInvites, listMyTeams, uuidSchema } from "@/lib/teams/queries";
import { ROLE_LABEL } from "@/lib/teams/labels";

export const metadata: Metadata = { title: "招待コード", robots: { index: false } };
export const dynamic = "force-dynamic";

function inviteStatus(i: { revokedAt: string | null; expiresAt: string; uses: number; maxUses: number }) {
  if (i.revokedAt) return "取り消し済み";
  if (new Date(i.expiresAt) <= new Date()) return "期限切れ";
  if (i.uses >= i.maxUses) return "上限に達した";
  return "有効";
}

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  if (!user) redirect(`/login?next=/teams/${id}/invite`);
  if (!uuidSchema.safeParse(id).success) notFound();
  const me = (await listMyTeams()).find((t) => t.teamId === id);
  if (!me || me.status !== "active" || !isStaff(me.role)) notFound();
  const invites = await listInvites(id);
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-ink-muted">{me.teamName}</p>
        <h1 className="text-2xl font-black">招待コード</h1>
      </div>
      <Card>
        <CardTitle>新しい招待コード</CardTitle>
        <p className="mb-3 text-sm text-ink-muted">
          コードを受け取った人は参加を申請でき、あなた（またはオーナー）が承認すると参加できます。期限・回数を過ぎたコードや取り消したコードは使えません。
        </p>
        <InviteCreator teamId={id} canInviteCoach={me.role === "owner"} />
      </Card>
      <Card>
        <CardTitle>作成した招待コード</CardTitle>
        {invites.length === 0 ? (
          <p className="text-sm text-ink-muted">まだありません。</p>
        ) : (
          <ul className="space-y-2">
            {invites.map((i) => {
              const st = inviteStatus(i);
              return (
                <li key={i.id} className="space-y-1 rounded-xl bg-navy-800 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-bold">{ROLE_LABEL[i.role]}用</span>
                    <span className={st === "有効" ? "font-bold text-accent" : "text-ink-muted"}>{st}</span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    作成 {new Date(i.createdAt).toLocaleString("ja-JP")} ／ 期限 {new Date(i.expiresAt).toLocaleString("ja-JP")} ／ 使用 {i.uses}/
                    {i.maxUses}回
                  </p>
                  {st === "有効" && (me.role === "owner" || i.role === "player") && (
                    <ActionButton variant="danger" confirm="この招待コードを取り消しますか？" action={revokeInvite.bind(null, { teamId: id, inviteId: i.id })}>
                      取り消す
                    </ActionButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-muted">セキュリティのため、コードは作成時にしか表示されません。</p>
      </Card>
      <Link href={`/teams/${id}`} className="block text-center text-sm text-ink-muted underline underline-offset-2">
        チームへ戻る
      </Link>
    </div>
  );
}
