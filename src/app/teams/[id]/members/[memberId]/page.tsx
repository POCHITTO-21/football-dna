import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { AxisRadar } from "@/components/axis-radar";
import { Card, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";
import { loadMemberHistory } from "@/lib/teams/queries";
import { AXIS_IDS } from "@/lib/scoring/model";
import { axisDef, positionLabel, typeDef } from "@/lib/scoring/config";

export const metadata: Metadata = { title: "選手の結果", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  if (!user) redirect(`/login?next=/teams/${id}/members/${memberId}`);
  const data = await loadMemberHistory(id, memberId);
  if (!data) notFound();
  const { team, member, results } = data;
  const [latest, previous] = results;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-ink-muted">{team.name}</p>
        <h1 className="text-2xl font-black">{member.memberName}</h1>
      </div>
      {!member.canView ? (
        <Card>
          <p className="text-sm text-ink-muted">この選手の結果は共有されていないため、表示できません。</p>
        </Card>
      ) : !latest ? (
        <Card>
          <p className="text-sm text-ink-muted">アカウントに保存された診断結果はまだありません。</p>
        </Card>
      ) : (
        <>
          <Card>
            <CardTitle>最新の結果（{new Date(latest.createdAt).toLocaleDateString("ja-JP")}）</CardTitle>
            <p className="text-xl font-black text-accent">{typeDef(latest.typeId).name}</p>
            {latest.compositeTypeId && <p className="text-sm text-ink-muted">複合タイプ：× {typeDef(latest.compositeTypeId).name}</p>}
            <p className="mt-1 text-sm">ポジション候補：{latest.topPositions.map(positionLabel).join("・")}</p>
            <AxisRadar
              scores={latest.axisScores}
              compare={previous?.axisScores}
              compareLabel={previous ? `前回（${new Date(previous.createdAt).toLocaleDateString("ja-JP")}）` : undefined}
            />
            {previous && (
              <table className="mt-2 w-full text-sm">
                <caption className="sr-only">前回との比較</caption>
                <thead>
                  <tr className="text-xs text-ink-muted">
                    <th className="text-left font-normal">志向</th>
                    <th className="text-right font-normal">前回</th>
                    <th className="text-right font-normal">最新</th>
                    <th className="text-right font-normal">変化</th>
                  </tr>
                </thead>
                <tbody>
                  {AXIS_IDS.map((a) => {
                    const d = latest.axisScores[a] - previous.axisScores[a];
                    return (
                      <tr key={a} className="border-t border-navy-800">
                        <td className="py-1">{axisDef(a).label}</td>
                        <td className="text-right tabular-nums">{previous.axisScores[a]}</td>
                        <td className="text-right tabular-nums">{latest.axisScores[a]}</td>
                        <td className="text-right tabular-nums">{d > 0 ? `+${d}` : d}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              数値は自己回答による「そのプレーをどれくらい好む・意識しているか」の目安で、能力の高さではありません。変化は本人と話すきっかけとしてご活用ください。
            </p>
          </Card>
          <Card>
            <CardTitle>これまでの結果</CardTitle>
            <ul className="space-y-1 text-sm">
              {results.map((r) => (
                <li key={r.createdAt} className="flex justify-between border-b border-navy-800 py-1">
                  <span>{typeDef(r.typeId).name}</span>
                  <span className="text-xs text-ink-muted">{new Date(r.createdAt).toLocaleDateString("ja-JP")}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      <p className="text-xs text-ink-muted">この画面の閲覧は、チームの操作の記録に残ります。</p>
      <Link href={`/teams/${id}`} className="block text-center text-sm text-ink-muted underline underline-offset-2">
        チームへ戻る
      </Link>
    </div>
  );
}
