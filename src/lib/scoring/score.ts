/**
 * FOOTBALL DNA 採点ロジック（純粋関数）。
 * - 入力が同じなら必ず同じ出力（入力順・オブジェクトのキー順に依存しない）。
 * - 欠損回答をゼロ扱いしない：未回答があれば計算しない。
 * - サーバー・クライアントの両方から同じ関数を呼ぶ（副作用・ブラウザAPIなし）。
 */
import {
  AXIS_IDS,
  type AxisId,
  type AxisScores,
  type PositionConfig,
  type PositionId,
  type Question,
  type TypeConfig,
} from "./model";
import type { Foot } from "../profile";

export type AnswerValue = 1 | 2 | 3 | 4;
export type Answers = Readonly<Record<string, number>>;

export type AxisResult =
  | { ok: true; raw: AxisScores; scores: AxisScores }
  | { ok: false; reason: "missing"; missing: string[] }
  | { ok: false; reason: "invalid"; invalid: string[] };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function isValidAnswerValue(v: unknown): v is AnswerValue {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

/** 生点(5〜20) → 0〜100。round((合計-5)/15*100) */
export function normalizeAxis(raw: number): number {
  return Math.round(((raw - 5) / 15) * 100);
}

export function computeAxisScores(answers: Answers, questions: readonly Question[]): AxisResult {
  const ids = [...questions].map((q) => q.id).sort();
  const missing = ids.filter((id) => answers[id] === undefined || answers[id] === null);
  if (missing.length > 0) return { ok: false, reason: "missing", missing };
  const invalid = ids.filter((id) => !isValidAnswerValue(answers[id]));
  if (invalid.length > 0) return { ok: false, reason: "invalid", invalid };

  const raw = Object.fromEntries(AXIS_IDS.map((a) => [a, 0])) as AxisScores;
  const counts = Object.fromEntries(AXIS_IDS.map((a) => [a, 0])) as Record<AxisId, number>;
  for (const q of questions) {
    raw[q.axis] += answers[q.id] as number;
    counts[q.axis] += 1;
  }
  for (const a of AXIS_IDS) {
    if (counts[a] !== 5) throw new Error(`axis ${a} must have exactly 5 questions (got ${counts[a]})`);
  }
  const scores = Object.fromEntries(AXIS_IDS.map((a) => [a, normalizeAxis(raw[a])])) as AxisScores;
  return { ok: true, raw, scores };
}

/** 重み付き平均（AXIS_IDS の固定順で加算して浮動小数の順序依存を避ける） */
export function weightedAverage(scores: AxisScores, weights: Partial<Record<AxisId, number>>): number {
  let sum = 0;
  let wsum = 0;
  for (const a of AXIS_IDS) {
    const w = weights[a];
    if (!w) continue;
    sum += scores[a] * w;
    wsum += w;
  }
  return wsum === 0 ? 0 : sum / wsum;
}

export function mean(scores: AxisScores): number {
  return AXIS_IDS.reduce((s, a) => s + scores[a], 0) / AXIS_IDS.length;
}

/** 8軸の母標準偏差 */
export function stdDev(scores: AxisScores): number {
  const m = mean(scores);
  return Math.sqrt(AXIS_IDS.reduce((s, a) => s + (scores[a] - m) ** 2, 0) / AXIS_IDS.length);
}

/** オールラウンダー加点: ばらつき0で maxBonus、sdForZeroBonus 以上で0、間は線形。 */
export function allRounderBonus(scores: AxisScores, maxBonus: number, sdForZeroBonus: number): number {
  const sd = stdDev(scores);
  return maxBonus * Math.max(0, 1 - sd / sdForZeroBonus);
}

export type TypeScore = { typeId: string; score: number };

export function computeTypeScores(
  scores: AxisScores,
  config: TypeConfig,
  opts: { gkEligible: boolean },
): TypeScore[] {
  const out: TypeScore[] = [];
  for (const t of config.types) {
    if (t.requiresGk && !opts.gkEligible) continue;
    let s: number;
    if (t.id === config.allRounder.typeId) {
      s = mean(scores) + allRounderBonus(scores, config.allRounder.maxBonus, config.allRounder.sdForZeroBonus);
    } else {
      s = weightedAverage(scores, t.weights);
    }
    out.push({ typeId: t.id, score: round1(Math.min(100, s)) });
  }
  // 得点降順、同点はID昇順
  return out.sort((a, b) => b.score - a.score || a.typeId.localeCompare(b.typeId));
}

export type PositionScore = {
  positionId: PositionId;
  /** null = 評価対象外（GK未回答など） */
  score: number | null;
  /** 寄与の大きい軸（理由の生成用）。降順 */
  topAxes: AxisId[];
};

export function computePositionScores(
  scores: AxisScores,
  config: PositionConfig,
  opts: { gkEligible: boolean; foot: Foot },
): PositionScore[] {
  const order = config.positions.map((p) => p.id);
  const list: PositionScore[] = config.positions.map((p) => {
    if (p.requiresGk && !opts.gkEligible) return { positionId: p.id, score: null, topAxes: [] };
    let s = weightedAverage(scores, p.weights);
    if (p.side && ((opts.foot === "right" && p.side === "R") || (opts.foot === "left" && p.side === "L"))) {
      s += config.footSideBonus;
    }
    const topAxes = AXIS_IDS.filter((a) => p.weights[a])
      .map((a) => ({ a, c: (p.weights[a] ?? 0) * scores[a] }))
      .sort((x, y) => y.c - x.c || AXIS_IDS.indexOf(x.a) - AXIS_IDS.indexOf(y.a))
      .slice(0, 2)
      .map((x) => x.a);
    return { positionId: p.id, score: Math.round(Math.min(100, Math.max(0, s))), topAxes };
  });
  return list.sort((a, b) => {
    if (a.score === null && b.score === null) return order.indexOf(a.positionId) - order.indexOf(b.positionId);
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score || order.indexOf(a.positionId) - order.indexOf(b.positionId);
  });
}

/** 複合タイプ判定のしきい値（1位と2位のタイプ得点差がこれ未満なら複合タイプ表示） */
export const COMPOSITE_GAP = 3;
/** 8軸のばらつきがこれ未満なら「全体的にバランス型」の補足 */
export const FLAT_PROFILE_SD = 8;
