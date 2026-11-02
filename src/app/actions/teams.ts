"use server";
/**
 * Phase 3 のサーバーアクション（チーム・招待・同意・保護者）。
 * 書き込みはすべて DB の SECURITY DEFINER 関数を本人のセッションで呼び、権限は DB 側で確認する。
 */
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/config";
import { rateLimit } from "@/lib/rate-limit";
import { generateShareToken, hashShareToken, isWellFormedShareToken } from "@/lib/share-token";
import { formatInviteCode, generateInviteCode, hashInviteCode, normalizeInviteCode } from "@/lib/teams/invite-code";
import { dbErrorMessage } from "@/lib/teams/errors";
import { AGE_BANDS } from "@/lib/profile";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });
const ok = <T,>(data: T) => ({ ok: true as const, data });
const NOT_CONFIGURED = "アカウント機能は現在利用できません。";
const NOT_LOGGED_IN = "ログインが必要です。";
const RATE_LIMITED = "操作が多すぎます。少し時間をおいてお試しください。";
const BAD_INPUT = "入力内容が正しくありません。";

const uuid = z.string().uuid();
const memberName = z.string().trim().min(1, "名前を入力してください").max(20, "20文字以内で入力してください");

async function session() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return { error: NOT_CONFIGURED } as const;
  if (!user) return { error: NOT_LOGGED_IN } as const;
  return { supabase, user } as const;
}

async function ipKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function done(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

// ------------------------------------------------------------------ 年代
const ageBandInput = z.enum(AGE_BANDS.map((a) => a.value) as [string, ...string[]]);

export async function updateMyAgeBand(input: unknown): Promise<ActionResult> {
  const parsed = ageBandInput.safeParse(input);
  if (!parsed.success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  const { error } = await s.supabase.from("profiles").update({ age_band: parsed.data }).eq("id", s.user.id);
  if (error) return fail("保存できませんでした。");
  done("/settings", "/teams");
  return ok(undefined);
}

// ------------------------------------------------------------------ チーム
const createTeamInput = z.object({
  name: z.string().trim().min(1, "チーム名を入力してください").max(40, "40文字以内で入力してください"),
  memberName,
});

export async function createTeam(input: unknown): Promise<ActionResult<{ teamId: string }>> {
  const parsed = createTeamInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  if (!rateLimit(`u:${s.user.id}:team`, 10, 60 * 60_000)) return fail(RATE_LIMITED);
  const { data, error } = await s.supabase.rpc("create_team", { p_name: parsed.data.name, p_member_name: parsed.data.memberName });
  if (error || !data) return fail(dbErrorMessage(error, "チームを作成できませんでした。"));
  done("/teams");
  return ok({ teamId: data as string });
}

export async function deleteTeam(teamId: string): Promise<ActionResult> {
  if (!uuid.safeParse(teamId).success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  const { error } = await s.supabase.rpc("delete_team", { p_team: teamId });
  if (error) return fail(dbErrorMessage(error, "削除できませんでした。"));
  done("/teams");
  return ok(undefined);
}

const joinInput = z.object({ code: z.string().max(40), memberName });

export async function joinTeam(input: unknown): Promise<ActionResult<{ teamId: string }>> {
  const parsed = joinInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  // 総当たり対策（ユーザー単位と接続元単位）
  if (!rateLimit(`u:${s.user.id}:join`, 10, 15 * 60_000) || !rateLimit(`ip:${await ipKey()}:join`, 30, 15 * 60_000)) {
    return fail(RATE_LIMITED);
  }
  const code = normalizeInviteCode(parsed.data.code);
  if (!code) return fail("招待コードは10文字です（例: ABCDE-FGHJK）。");
  const { data, error } = await s.supabase.rpc("redeem_team_invite", { p_code: code, p_member_name: parsed.data.memberName });
  if (error || !data) return fail(dbErrorMessage(error, "参加できませんでした。"));
  done("/teams");
  return ok({ teamId: data as string });
}

export async function leaveTeam(teamId: string): Promise<ActionResult> {
  if (!uuid.safeParse(teamId).success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  const { error } = await s.supabase.rpc("leave_team", { p_team: teamId });
  if (error) return fail(dbErrorMessage(error, "退会できませんでした。"));
  done("/teams");
  return ok(undefined);
}

const reviewInput = z.object({ teamId: uuid, memberId: uuid, approve: z.boolean() });

export async function reviewMember(input: unknown): Promise<ActionResult> {
  const parsed = reviewInput.safeParse(input);
  if (!parsed.success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  const { error } = await s.supabase.rpc("review_team_member", { p_member: parsed.data.memberId, p_approve: parsed.data.approve });
  if (error) return fail(dbErrorMessage(error));
  done(`/teams/${parsed.data.teamId}`);
  return ok(undefined);
}

const removeInput = z.object({ teamId: uuid, memberId: uuid });

export async function removeMember(input: unknown): Promise<ActionResult> {
  const parsed = removeInput.safeParse(input);
  if (!parsed.success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  const { error } = await s.supabase.rpc("remove_team_member", { p_member: parsed.data.memberId });
  if (error) return fail(dbErrorMessage(error));
  done(`/teams/${parsed.data.teamId}`);
  return ok(undefined);
}

const shareInput = z.object({ teamId: uuid, share: z.boolean() });

export async function setTeamShare(input: unknown): Promise<ActionResult<{ consentStatus: string }>> {
  const parsed = shareInput.safeParse(input);
  if (!parsed.success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  const { data, error } = await s.supabase.rpc("set_team_share", { p_team: parsed.data.teamId, p_share: parsed.data.share });
  if (error) return fail(dbErrorMessage(error));
  done(`/teams/${parsed.data.teamId}`, "/teams");
  return ok({ consentStatus: data as string });
}

// ------------------------------------------------------------------ 招待
const inviteInput = z.object({
  teamId: uuid,
  role: z.enum(["player", "coach"]),
  expiresHours: z.union([z.literal(24), z.literal(72), z.literal(168), z.literal(720)]),
  maxUses: z.number().int().min(1).max(100),
});

/** 招待コードを作る。コードはこの応答でだけ返し、DB にはハッシュだけを保存する。 */
export async function createInvite(input: unknown): Promise<ActionResult<{ code: string; url: string }>> {
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  if (!rateLimit(`u:${s.user.id}:invite`, 30, 60 * 60_000)) return fail(RATE_LIMITED);
  const code = generateInviteCode();
  const { teamId, role, expiresHours, maxUses } = parsed.data;
  const { error } = await s.supabase.rpc("create_team_invite", {
    p_team: teamId,
    p_code_hash: hashInviteCode(code),
    p_role: role,
    p_expires_hours: expiresHours,
    p_max_uses: maxUses,
  });
  if (error) return fail(dbErrorMessage(error, "招待コードを作成できませんでした。"));
  done(`/teams/${teamId}/invite`);
  return ok({ code: formatInviteCode(code), url: `${getSiteUrl()}/teams/join?code=${code}` });
}

const revokeInviteInput = z.object({ teamId: uuid, inviteId: uuid });

export async function revokeInvite(input: unknown): Promise<ActionResult> {
  const parsed = revokeInviteInput.safeParse(input);
  if (!parsed.success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  const { error } = await s.supabase.rpc("revoke_team_invite", { p_invite: parsed.data.inviteId });
  if (error) return fail(dbErrorMessage(error));
  done(`/teams/${parsed.data.teamId}/invite`);
  return ok(undefined);
}

// ------------------------------------------------------------------ 保護者
/** 子ども本人が保護者確認リンクを発行する（7日間有効、URLはこの応答でだけ表示） */
export async function createGuardianLink(): Promise<ActionResult<{ url: string }>> {
  const s = await session();
  if ("error" in s) return fail(s.error!);
  if (!rateLimit(`u:${s.user.id}:guardian-link`, 10, 60 * 60_000)) return fail(RATE_LIMITED);
  const token = generateShareToken();
  const { error } = await s.supabase.rpc("create_guardian_request", { p_code_hash: hashShareToken(token) });
  if (error) return fail(dbErrorMessage(error, "リンクを作成できませんでした。"));
  return ok({ url: `${getSiteUrl()}/guardian/accept/${token}` });
}

const acceptInput = z.object({ token: z.string(), ageBand: z.enum(["18_29", "30_49", "50_plus"]), confirm: z.literal(true) });

export async function acceptGuardian(input: unknown): Promise<ActionResult> {
  const parsed = acceptInput.safeParse(input);
  if (!parsed.success) return fail("年代を選び、確認のチェックを入れてください。");
  if (!isWellFormedShareToken(parsed.data.token)) return fail(dbErrorMessage({ message: "guardian_request_invalid" }));
  const s = await session();
  if ("error" in s) return fail(s.error!);
  if (!rateLimit(`u:${s.user.id}:guardian-accept`, 10, 15 * 60_000)) return fail(RATE_LIMITED);
  const { error } = await s.supabase.rpc("accept_guardian_request", { p_code: parsed.data.token, p_age_band: parsed.data.ageBand });
  if (error) return fail(dbErrorMessage(error, "登録できませんでした。"));
  done("/guardian");
  return ok(undefined);
}

const unlinkInput = z.object({ guardianId: uuid, childId: uuid });

export async function removeGuardianLink(input: unknown): Promise<ActionResult> {
  const parsed = unlinkInput.safeParse(input);
  if (!parsed.success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  const { error } = await s.supabase.rpc("remove_guardian_link", { p_guardian: parsed.data.guardianId, p_child: parsed.data.childId });
  if (error) return fail(dbErrorMessage(error));
  done("/guardian", "/settings");
  return ok(undefined);
}

const guardianShareInput = z.object({ memberId: uuid, approve: z.boolean() });

export async function guardianSetTeamShare(input: unknown): Promise<ActionResult> {
  const parsed = guardianShareInput.safeParse(input);
  if (!parsed.success) return fail(BAD_INPUT);
  const s = await session();
  if ("error" in s) return fail(s.error!);
  const { error } = await s.supabase.rpc("guardian_set_team_share", { p_member: parsed.data.memberId, p_approve: parsed.data.approve });
  if (error) return fail(dbErrorMessage(error));
  done("/guardian");
  return ok(undefined);
}
