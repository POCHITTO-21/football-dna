import "server-only";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { AXIS_IDS, type AxisScores } from "@/lib/scoring/model";
import { aggregateTeam, latestPerUser, type TeamAggregate } from "./aggregate";

/**
 * Phase 3 の読み取り。すべて本人のセッション（anon key + RLS）で実行する。
 * 指導者に見える結果は DB の RLS（coach_can_view_user）で同意済みの選手に限られる。
 */

export const uuidSchema = z.string().uuid();
export type Role = "owner" | "coach" | "player" | "guardian";
export type ConsentStatus = "none" | "self" | "guardian_pending" | "guardian_confirmed";

export const isStaff = (role: string | null | undefined) => role === "owner" || role === "coach";

const ADULT = ["18_29", "30_49", "50_plus"];

export type AccountInfo = { ageBand: string | null; consentStatus: string; isAdult: boolean };

export async function getAccountInfo(): Promise<AccountInfo | null> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return null;
  const { data } = await supabase.from("profiles").select("age_band, consent_status").eq("id", user.id).maybeSingle();
  const ageBand = (data?.age_band as string | null) ?? null;
  return { ageBand, consentStatus: (data?.consent_status as string) ?? "none", isAdult: !!ageBand && ADULT.includes(ageBand) };
}

export type MyTeam = {
  memberId: string;
  teamId: string;
  teamName: string;
  role: Role;
  status: "pending" | "active";
  consentStatus: ConsentStatus;
  memberName: string;
};

export async function listMyTeams(): Promise<MyTeam[]> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return [];
  const { data } = await supabase
    .from("team_members")
    .select("id, team_id, role, status, consent_status, member_name, created_at, teams(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  return (data ?? []).map((m) => ({
    memberId: m.id,
    teamId: m.team_id,
    teamName: (m.teams as unknown as { name: string } | null)?.name ?? "（チーム）",
    role: m.role,
    status: m.status,
    consentStatus: m.consent_status,
    memberName: m.member_name,
  }));
}

export type MemberRow = {
  id: string;
  userId: string;
  role: Role;
  memberName: string;
  status: "pending" | "active";
  consentStatus: ConsentStatus;
  needsGuardian: boolean;
  canView: boolean;
  createdAt: string;
};

export type LatestResult = {
  userId: string;
  typeId: string;
  compositeTypeId: string | null;
  axisScores: AxisScores;
  topPositions: string[];
  createdAt: string;
};

export type TeamPage =
  | { kind: "not_found" }
  | { kind: "member"; team: { id: string; name: string }; me: MyTeam }
  | {
      kind: "staff";
      team: { id: string; name: string };
      me: MyTeam;
      members: MemberRow[];
      latest: Map<string, LatestResult>;
      aggregate: TeamAggregate;
    };

function toAxisScores(v: unknown): AxisScores {
  const o = (v ?? {}) as Record<string, unknown>;
  return Object.fromEntries(AXIS_IDS.map((a) => [a, typeof o[a] === "number" ? (o[a] as number) : 0])) as AxisScores;
}

export async function loadTeamPage(teamId: string): Promise<TeamPage> {
  if (!uuidSchema.safeParse(teamId).success) return { kind: "not_found" };
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { kind: "not_found" };
  const mine = (await listMyTeams()).find((t) => t.teamId === teamId);
  if (!mine) return { kind: "not_found" };
  const team = { id: teamId, name: mine.teamName };
  if (!isStaff(mine.role) || mine.status !== "active") return { kind: "member", team, me: mine };

  const { data: list } = await supabase.rpc("team_member_list", { p_team: teamId });
  const members: MemberRow[] = (list ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    userId: m.user_id as string,
    role: m.role as Role,
    memberName: m.member_name as string,
    status: m.status as MemberRow["status"],
    consentStatus: m.consent_status as ConsentStatus,
    needsGuardian: !!m.needs_guardian,
    canView: !!m.can_view,
    createdAt: m.created_at as string,
  }));
  const viewable = members.filter((m) => m.canView).map((m) => m.userId);
  let latestRows: LatestResult[] = [];
  if (viewable.length > 0) {
    const { data } = await supabase
      .from("results")
      .select("user_id, type_id, composite_type_id, axis_scores, top_positions, created_at")
      .in("user_id", viewable)
      .order("created_at", { ascending: false })
      .limit(2000);
    latestRows = latestPerUser(
      (data ?? []).map((r) => ({
        userId: r.user_id as string,
        typeId: r.type_id as string,
        compositeTypeId: (r.composite_type_id as string | null) ?? null,
        axisScores: toAxisScores(r.axis_scores),
        topPositions: (r.top_positions as string[]) ?? [],
        createdAt: r.created_at as string,
      })),
    );
  }
  return {
    kind: "staff",
    team,
    me: mine,
    members,
    latest: new Map(latestRows.map((r) => [r.userId, r])),
    aggregate: aggregateTeam(latestRows),
  };
}

export type InviteRow = {
  id: string;
  role: "coach" | "player";
  expiresAt: string;
  maxUses: number;
  uses: number;
  revokedAt: string | null;
  createdAt: string;
};

export async function listInvites(teamId: string): Promise<InviteRow[]> {
  const { supabase } = await getCurrentUser();
  if (!supabase || !uuidSchema.safeParse(teamId).success) return [];
  const { data } = await supabase
    .from("team_invites")
    .select("id, role, expires_at, max_uses, uses, revoked_at, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((i) => ({
    id: i.id,
    role: i.role,
    expiresAt: i.expires_at,
    maxUses: i.max_uses,
    uses: i.uses,
    revokedAt: i.revoked_at,
    createdAt: i.created_at,
  }));
}

export type AuditRow = { id: number; action: string; actorId: string | null; targetUserId: string | null; createdAt: string };

export async function listAuditEvents(teamId: string): Promise<AuditRow[]> {
  const { supabase } = await getCurrentUser();
  if (!supabase || !uuidSchema.safeParse(teamId).success) return [];
  const { data } = await supabase
    .from("audit_events")
    .select("id, action, actor_id, target_user_id, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((e) => ({
    id: e.id,
    action: e.action,
    actorId: e.actor_id,
    targetUserId: e.target_user_id,
    createdAt: e.created_at,
  }));
}

/** 指導者向け: 1人の選手の結果の履歴（同意がなければ空）。閲覧を監査ログに記録する。 */
export async function loadMemberHistory(teamId: string, memberId: string) {
  if (!uuidSchema.safeParse(teamId).success || !uuidSchema.safeParse(memberId).success) return null;
  const page = await loadTeamPage(teamId);
  if (page.kind !== "staff") return null;
  const member = page.members.find((m) => m.id === memberId);
  if (!member) return null;
  if (!member.canView) return { team: page.team, member, results: [] as LatestResult[] };
  const { supabase } = await getCurrentUser();
  const { data } = await supabase!
    .from("results")
    .select("user_id, type_id, composite_type_id, axis_scores, top_positions, created_at")
    .eq("user_id", member.userId)
    .order("created_at", { ascending: false })
    .limit(50);
  await supabase!.rpc("log_team_access", { p_team: teamId, p_action: "member_results_viewed", p_target: member.userId });
  const results: LatestResult[] = (data ?? []).map((r) => ({
    userId: r.user_id,
    typeId: r.type_id,
    compositeTypeId: r.composite_type_id ?? null,
    axisScores: toAxisScores(r.axis_scores),
    topPositions: r.top_positions ?? [],
    createdAt: r.created_at,
  }));
  return { team: page.team, member, results };
}

export type GuardianChildRow = {
  childId: string;
  childName: string | null;
  memberId: string | null;
  teamName: string | null;
  memberName: string | null;
  memberStatus: string | null;
  consentStatus: ConsentStatus | null;
};

export async function loadGuardianOverview(): Promise<GuardianChildRow[]> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return [];
  const { data } = await supabase.rpc("guardian_overview");
  return (data ?? []).map((r: Record<string, unknown>) => ({
    childId: r.child_id as string,
    childName: (r.child_name as string | null) ?? null,
    memberId: (r.member_id as string | null) ?? null,
    teamName: (r.team_name as string | null) ?? null,
    memberName: (r.member_name as string | null) ?? null,
    memberStatus: (r.member_status as string | null) ?? null,
    consentStatus: (r.consent_status as ConsentStatus | null) ?? null,
  }));
}

/** 子ども側から見た、登録済みの保護者 */
export async function listMyGuardians(): Promise<{ guardianId: string; createdAt: string }[]> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return [];
  const { data } = await supabase.from("guardian_links").select("guardian_id, created_at").eq("child_id", user.id);
  return (data ?? []).map((g) => ({ guardianId: g.guardian_id, createdAt: g.created_at }));
}
