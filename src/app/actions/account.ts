"use server";
/**
 * Phase 2 のサーバーアクション。すべて本人のセッション（anon key + RLS）で実行し、
 * service role は使わない。入力は Zod で検証し、採点はサーバー側で同じ純粋関数を使って再計算する。
 * Next.js のサーバーアクションは Origin チェックによる CSRF 対策が組み込まれている。
 */
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { diagnoseCurrent } from "@/lib/scoring";
import type { DiagnosisResult } from "@/lib/scoring/diagnose";
import { profileSchema, type Profile } from "@/lib/profile";
import { getCurrentUser } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/config";
import { generateShareToken, hashShareToken } from "@/lib/share-token";
import { rateLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/safe-path";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });
const NOT_CONFIGURED = "アカウント機能は現在利用できません。";
const NOT_LOGGED_IN = "ログインが必要です。";
const RATE_LIMITED = "操作が多すぎます。少し時間をおいてお試しください。";

async function clientKey(userId?: string) {
  if (userId) return `u:${userId}`;
  const h = await headers();
  return `ip:${h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
}

const answersSchema = z.record(z.string().regex(/^Q\d{2}$/), z.number().int().min(1).max(4));
const uuidSchema = z.string().uuid();

export type AccountResult = {
  id: string;
  createdAt: string;
  profile: Profile;
  answers: Record<string, number>;
  result: DiagnosisResult;
};

// ------------------------------------------------------------------ 結果の保存
const saveInput = z.object({ profile: profileSchema, answers: answersSchema });

export async function saveResultToAccount(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return fail(NOT_LOGGED_IN);
  if (!rateLimit(`${await clientKey(user.id)}:save`, 20, 60 * 60_000)) return fail(RATE_LIMITED);

  const parsed = saveInput.safeParse(input);
  if (!parsed.success) return fail("入力データが正しくありません。");
  const { profile, answers } = parsed.data;

  // クライアントから送られた結果は信用せず、サーバーで再計算する
  const out = diagnoseCurrent({ answers, gkInterest: profile.gkInterest, foot: profile.foot });
  if (!out.ok) return fail("すべての質問に回答されていないため保存できません。");
  const r = out.result;

  // 年代とニックネームをプロフィールに反映（本人の自己申告）
  await supabase
    .from("profiles")
    .update({ age_band: profile.ageBand, display_name: profile.nickname?.trim() || null })
    .eq("id", user.id);

  const { data: session, error: e1 } = await supabase
    .from("diagnosis_sessions")
    .insert({ user_id: user.id, question_set_version: r.questionSetVersion, scoring_version: r.scoringVersion })
    .select("id")
    .single();
  if (e1 || !session) return fail("保存に失敗しました。");

  const { error: e2 } = await supabase
    .from("answers")
    .insert(Object.entries(answers).map(([question_id, value]) => ({ session_id: session.id, question_id, value })));
  const { data: result, error: e3 } = e2
    ? { data: null, error: e2 }
    : await supabase
        .from("results")
        .insert({
          session_id: session.id,
          user_id: user.id,
          type_id: r.primaryTypeId,
          composite_type_id: r.compositeTypeId,
          axis_scores: r.axisScores,
          position_scores: r.positionRanking,
          top_positions: r.topPositions.map((p) => p.positionId),
          profile_snapshot: profile,
          detail: r,
          type_config_version: r.typeConfigVersion,
          position_config_version: r.positionConfigVersion,
        })
        .select("id")
        .single();
  if (e3 || !result) {
    await supabase.from("diagnosis_sessions").delete().eq("id", session.id);
    return fail("保存に失敗しました。");
  }
  revalidatePath("/me");
  return { ok: true, data: { id: result.id } };
}

// ------------------------------------------------------------------ 履歴
export type HistoryItem = { id: string; typeId: string; createdAt: string; topPositions: string[] };

export async function listMyResults(): Promise<ActionResult<HistoryItem[]>> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return fail(NOT_LOGGED_IN);
  const { data, error } = await supabase
    .from("results")
    .select("id, type_id, created_at, top_positions")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return fail("履歴を読み込めませんでした。");
  return {
    ok: true,
    data: data.map((d) => ({ id: d.id, typeId: d.type_id, createdAt: d.created_at, topPositions: d.top_positions })),
  };
}

export async function getMyResult(id: string): Promise<ActionResult<AccountResult | null>> {
  if (!uuidSchema.safeParse(id).success) return { ok: true, data: null };
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return { ok: true, data: null };
  // RLS により本人の結果しか返らない
  const { data, error } = await supabase
    .from("results")
    .select("id, created_at, profile_snapshot, detail, session_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail("結果を読み込めませんでした。");
  if (!data) return { ok: true, data: null };
  const { data: ans } = await supabase.from("answers").select("question_id, value").eq("session_id", data.session_id);
  const profile = profileSchema.safeParse(data.profile_snapshot);
  if (!profile.success) return fail("結果データが壊れています。");
  return {
    ok: true,
    data: {
      id: data.id,
      createdAt: data.created_at,
      profile: profile.data,
      answers: Object.fromEntries((ans ?? []).map((a) => [a.question_id, a.value])),
      result: data.detail as DiagnosisResult,
    },
  };
}

export async function deleteMyResult(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail("IDが正しくありません。");
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return fail(NOT_LOGGED_IN);
  // セッションごと削除（answers / results / share_links は cascade）
  const { data } = await supabase.from("results").select("session_id").eq("id", id).maybeSingle();
  if (!data) return fail("結果が見つかりません。");
  const { error } = await supabase.from("diagnosis_sessions").delete().eq("id", data.session_id);
  if (error) return fail("削除に失敗しました。");
  revalidatePath("/me");
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------------ 共有リンク
export type ShareLinkView = {
  id: string;
  resultId: string;
  enabled: boolean;
  includeNickname: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const toView = (s: {
  id: string;
  result_id: string;
  enabled: boolean;
  include_nickname: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}): ShareLinkView => ({
  id: s.id,
  resultId: s.result_id,
  enabled: s.enabled,
  includeNickname: s.include_nickname,
  expiresAt: s.expires_at,
  revokedAt: s.revoked_at,
  createdAt: s.created_at,
});

const SHARE_COLS = "id, result_id, enabled, include_nickname, expires_at, revoked_at, created_at";

export async function listMyShareLinks(resultId?: string): Promise<ActionResult<ShareLinkView[]>> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return fail(NOT_LOGGED_IN);
  let q = supabase.from("share_links").select(SHARE_COLS).order("created_at", { ascending: false });
  if (resultId) {
    if (!uuidSchema.safeParse(resultId).success) return { ok: true, data: [] };
    q = q.eq("result_id", resultId);
  }
  const { data, error } = await q;
  if (error) return fail("共有リンクを読み込めませんでした。");
  return { ok: true, data: data.map(toView) };
}

const createShareInput = z.object({
  resultId: z.string().uuid(),
  expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(30), z.null()]),
  includeNickname: z.boolean(),
});

/**
 * 共有リンクを作る。トークンはこの応答でだけ返し、DBにはハッシュのみ保存する。
 * 作成直後は無効（enabled=false）。本人が明示的に有効化する。
 */
export async function createShareLink(input: unknown): Promise<ActionResult<{ link: ShareLinkView; url: string }>> {
  const parsed = createShareInput.safeParse(input);
  if (!parsed.success) return fail("入力データが正しくありません。");
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return fail(NOT_LOGGED_IN);
  if (!rateLimit(`${await clientKey(user.id)}:share`, 20, 60 * 60_000)) return fail(RATE_LIMITED);

  const token = generateShareToken();
  const { resultId, expiresInDays, includeNickname } = parsed.data;
  const { data, error } = await supabase
    .from("share_links")
    .insert({
      result_id: resultId,
      user_id: user.id,
      token_hash: hashShareToken(token),
      enabled: false,
      include_nickname: includeNickname,
      expires_at: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString() : null,
    })
    .select(SHARE_COLS)
    .single();
  if (error || !data) return fail("共有リンクを作成できませんでした。");
  return { ok: true, data: { link: toView(data), url: `${getSiteUrl()}/s/${token}` } };
}

const setEnabledInput = z.object({ id: z.string().uuid(), enabled: z.boolean() });

export async function setShareLinkEnabled(input: unknown): Promise<ActionResult<ShareLinkView>> {
  const parsed = setEnabledInput.safeParse(input);
  if (!parsed.success) return fail("入力データが正しくありません。");
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return fail(NOT_LOGGED_IN);
  const { data, error } = await supabase
    .from("share_links")
    .update({ enabled: parsed.data.enabled })
    .eq("id", parsed.data.id)
    .is("revoked_at", null)
    .select(SHARE_COLS)
    .single();
  if (error?.message?.includes("share_not_allowed_for_minor")) {
    return fail("高校生以下の方は、保護者の確認が済むまで公開共有はできません（チーム機能の公開時に保護者確認の手続きを用意します）。");
  }
  if (error || !data) return fail("更新できませんでした。");
  revalidatePath("/settings");
  return { ok: true, data: toView(data) };
}

export async function revokeShareLink(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail("IDが正しくありません。");
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return fail(NOT_LOGGED_IN);
  const { error } = await supabase
    .from("share_links")
    .update({ enabled: false, revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail("失効できませんでした。");
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function deleteShareLink(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail("IDが正しくありません。");
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return fail(NOT_LOGGED_IN);
  const { error } = await supabase.from("share_links").delete().eq("id", id);
  if (error) return fail("削除できませんでした。");
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------------ アカウント
export async function deleteMyAccount(): Promise<ActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!user) return fail(NOT_LOGGED_IN);
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return fail("アカウントを削除できませんでした。");
  await supabase.auth.signOut();
  return { ok: true, data: undefined };
}

export async function signOut(): Promise<ActionResult> {
  const { supabase } = await getCurrentUser();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const loginInput = z.object({ email: z.string().trim().email().max(254), next: z.string().optional() });

/** メールのワンタイムリンク（パスワード不要）でログイン */
export async function requestLoginLink(input: unknown): Promise<ActionResult> {
  const parsed = loginInput.safeParse(input);
  if (!parsed.success) return fail("メールアドレスの形式が正しくありません。");
  const { supabase } = await getCurrentUser();
  if (!supabase) return fail(NOT_CONFIGURED);
  if (!rateLimit(`${await clientKey()}:login`, 5, 15 * 60_000)) return fail(RATE_LIMITED);
  if (!rateLimit(`mail:${parsed.data.email.toLowerCase()}:login`, 3, 15 * 60_000)) return fail(RATE_LIMITED);
  const next = safeNextPath(parsed.data.next);
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    // サーバーのログ（npm run dev の画面）に原因を出す。メールアドレスは記録しない。
    console.error("[login] signInWithOtp failed:", error.status, error.code, error.message);
    return fail(loginErrorMessage(error));
  }
  return { ok: true, data: undefined };
}

function loginErrorMessage(error: { status?: number; code?: string; message: string }): string {
  const msg = error.message.toLowerCase();
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || msg.includes("rate limit")) {
    return "メールの送信回数の上限に達しました。1時間ほどおいてからお試しください。";
  }
  if (msg.includes("invalid api key") || msg.includes("no api key") || error.status === 401) {
    return "サーバーの設定（Supabase のキー）に誤りがあるため、メールを送信できませんでした。";
  }
  const base = "メールを送信できませんでした。時間をおいてお試しください。";
  // 開発中だけ原因を画面に表示する
  return process.env.NODE_ENV === "development" ? `${base}（詳細: ${error.message}）` : base;
}
