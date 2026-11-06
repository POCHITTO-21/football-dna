/**
 * Phase 1 のゲスト用ローカル保存（このブラウザの localStorage のみ）。
 * サーバーには何も送信しない。氏名などの個人情報は保存しない。
 * Phase 2 で Supabase 連携に置き換え可能なよう、ここに読み書きを集約する。
 */
import { z } from "zod";
import { profileSchema, type Profile } from "./profile";
import type { DiagnosisResult } from "./scoring/diagnose";
import { diagnosisModeSchema } from "./scoring/model";

const DRAFT_KEY = "fdna:draft:v1";
const RESULTS_KEY = "fdna:results:v1";
const MAX_RESULTS = 20;

const answersSchema = z.record(z.string().regex(/^Q\d{2}$/), z.number().int().min(1).max(4));

const draftSchema = z.object({
  questionSetVersion: z.string(),
  profile: profileSchema.optional(),
  answers: answersSchema,
  currentIndex: z.number().int().min(0),
  kidsMode: z.boolean().optional(),
  /** quick = かんたん診断（15問）。ない場合は40問（以前の途中保存との互換） */
  mode: diagnosisModeSchema.optional(),
  /** かんたん診断の続き（残り25問）として回答中なら、元の結果のID（この端末の結果のときだけ） */
  upgradeFrom: z.object({ localResultId: z.string().optional() }).optional(),
  updatedAt: z.string(),
});
export type Draft = z.infer<typeof draftSchema>;

// 結果本体は採点関数が生成したものをそのまま保存する（型は DiagnosisResult）。
const storedResultSchema = z.object({
  id: z.string().min(8),
  createdAt: z.string(),
  profile: profileSchema,
  answers: answersSchema,
  result: z.custom<DiagnosisResult>(
    (v) => typeof v === "object" && v !== null && "primaryTypeId" in v && "axisScores" in v,
  ),
});
export type StoredResult = z.infer<typeof storedResultSchema>;

function safeRead(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(questionSetVersion: string): Draft | null {
  const parsed = draftSchema.safeParse(safeRead(DRAFT_KEY));
  if (!parsed.success) return null;
  // 設問セットのバージョンが変わった途中保存は使わない
  if (parsed.data.questionSetVersion !== questionSetVersion) return null;
  return parsed.data;
}

export function saveDraft(draft: Omit<Draft, "updatedAt">): boolean {
  return safeWrite(DRAFT_KEY, { ...draft, updatedAt: new Date().toISOString() });
}

export function draftMode(d: Pick<Draft, "mode"> | null | undefined) {
  return d?.mode ?? "full";
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* noop */
  }
}

function loadAllResults(): StoredResult[] {
  const raw = safeRead(RESULTS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const p = storedResultSchema.safeParse(r);
    return p.success ? [p.data] : [];
  });
}

export function listResults(): StoredResult[] {
  return loadAllResults().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getResult(id: string): StoredResult | null {
  return loadAllResults().find((r) => r.id === id) ?? null;
}

export function saveResult(entry: Omit<StoredResult, "id" | "createdAt">): StoredResult | null {
  const stored: StoredResult = { ...entry, id: newId(), createdAt: new Date().toISOString() };
  const all = [stored, ...listResults()].slice(0, MAX_RESULTS);
  return safeWrite(RESULTS_KEY, all) ? stored : null;
}

export function deleteResult(id: string) {
  safeWrite(
    RESULTS_KEY,
    loadAllResults().filter((r) => r.id !== id),
  );
}

export function deleteAllLocalData() {
  try {
    window.localStorage.removeItem(RESULTS_KEY);
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* noop */
  }
}

/** 推測困難なID（暗号論的乱数） */
function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type { Profile };
