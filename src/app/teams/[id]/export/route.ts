import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { buildTeamCsv } from "@/lib/teams/csv";
import { loadTeamPage } from "@/lib/teams/queries";

export const dynamic = "force-dynamic";

/** 同意済み選手の最新結果を CSV で出力する。権限は DB で確認し、出力は監査ログに残す。 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return new NextResponse("ログインが必要です。", { status: 401 });
  if (!rateLimit(`u:${user.id}:csv`, 20, 60 * 60_000)) return new NextResponse("操作が多すぎます。", { status: 429 });
  const page = await loadTeamPage(id);
  if (page.kind !== "staff") return new NextResponse("権限がありません。", { status: 403 });
  const { error } = await supabase.rpc("log_team_access", { p_team: id, p_action: "csv_export", p_target: null });
  if (error) return new NextResponse("権限がありません。", { status: 403 });
  const rows = page.members
    .filter((m) => m.canView && page.latest.has(m.userId))
    .map((m) => {
      const r = page.latest.get(m.userId)!;
      return {
        memberName: m.memberName,
        createdAt: r.createdAt,
        typeId: r.typeId,
        compositeTypeId: r.compositeTypeId,
        axisScores: r.axisScores,
        topPositions: r.topPositions,
      };
    });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(buildTeamCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="football-dna-team-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
