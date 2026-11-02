import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { Card } from "@/components/ui/card";
import { JoinTeamForm } from "@/components/teams/forms";
import { getCurrentUser } from "@/lib/supabase/server";
import { normalizeInviteCode } from "@/lib/teams/invite-code";

export const metadata: Metadata = { title: "チームに参加", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const normalized = code ? normalizeInviteCode(code) : null;
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/join${normalized ? `?code=${normalized}` : ""}`)}`);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">チームに参加</h1>
      <Card>
        <JoinTeamForm initialCode={normalized ?? ""} />
      </Card>
      <p className="text-xs leading-relaxed text-ink-muted">
        参加しても、あなたの診断結果はすぐには指導者に見えません。参加が承認されたあと、チームのページで「指導者に結果を見せる」を選んだときだけ表示されます（18歳未満の方は、保護者の同意も必要です）。
      </p>
    </div>
  );
}
