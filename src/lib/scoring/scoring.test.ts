import { describe, expect, it } from "vitest";
import {
  AXIS_IDS,
  POSITION_CONFIG,
  QUESTION_SET,
  TYPE_CONFIG,
  computeAxisScores,
  computePositionScores,
  computeTypeScores,
  diagnoseCurrent,
  normalizeAxis,
  type AxisScores,
} from "./index";
import { allAnswers, answersByAxis } from "./test-helpers";

const flat = (v: number) => Object.fromEntries(AXIS_IDS.map((a) => [a, v])) as AxisScores;

describe("データファイルの整合性", () => {
  it("40問・各軸5問・IDと表示順が一意", () => {
    const qs = QUESTION_SET.questions;
    expect(qs).toHaveLength(40);
    expect(new Set(qs.map((q) => q.id)).size).toBe(40);
    expect(new Set(qs.map((q) => q.order)).size).toBe(40);
    for (const a of AXIS_IDS) expect(qs.filter((q) => q.axis === a)).toHaveLength(5);
  });

  it("仕様書どおりの軸に紐づく（Q01=DRB, Q08=TEAM, Q40=TEAM, 8問周期）", () => {
    for (const q of QUESTION_SET.questions) {
      const n = Number(q.id.slice(1));
      expect(q.axis).toBe(AXIS_IDS[(n - 1) % 8]);
    }
  });

  it("質問順は軸ごとに固まらずインターリーブされている", () => {
    const ordered = [...QUESTION_SET.questions].sort((a, b) => a.order - b.order);
    for (let i = 1; i < ordered.length; i++) expect(ordered[i].axis).not.toBe(ordered[i - 1].axis);
  });

  it("16タイプ・11ポジション、ID一意、T16とGKはGK条件付き", () => {
    expect(new Set(TYPE_CONFIG.types.map((t) => t.id)).size).toBe(16);
    expect(TYPE_CONFIG.types.find((t) => t.id === "T16")?.requiresGk).toBe(true);
    expect(POSITION_CONFIG.positions.find((p) => p.id === "GK")?.requiresGk).toBe(true);
    // 仕様書7章の重みを固定
    expect(TYPE_CONFIG.types.find((t) => t.id === "T01")?.weights).toEqual({ PAS: 3, TAC: 3, TEAM: 1 });
    expect(TYPE_CONFIG.types.find((t) => t.id === "T13")?.weights).toEqual({ MOB: 3, PAS: 1, DEF: 2, FIN: 1 });
    expect(TYPE_CONFIG.types.find((t) => t.id === "T16")?.weights).toEqual({ DEF: 2, TAC: 2, TEAM: 2, DUEL: 1 });
  });
});

describe("軸スコア", () => {
  it("境界値: 生点5→0、20→100、12→47", () => {
    expect(normalizeAxis(5)).toBe(0);
    expect(normalizeAxis(20)).toBe(100);
    expect(normalizeAxis(12)).toBe(47);
    expect(normalizeAxis(13)).toBe(53);
  });

  it("全問1なら全軸0、全問4なら全軸100", () => {
    const lo = computeAxisScores(allAnswers(1), QUESTION_SET.questions);
    const hi = computeAxisScores(allAnswers(4), QUESTION_SET.questions);
    expect(lo.ok && Object.values(lo.scores)).toEqual(Array(8).fill(0));
    expect(hi.ok && Object.values(hi.scores)).toEqual(Array(8).fill(100));
    expect(hi.ok && hi.raw.DRB).toBe(20);
  });

  it("欠損回答はゼロ扱いせず計算しない", () => {
    const a = allAnswers(3);
    delete a.Q17;
    delete a.Q02;
    const r = computeAxisScores(a, QUESTION_SET.questions);
    expect(r).toEqual({ ok: false, reason: "missing", missing: ["Q02", "Q17"] });
  });

  it("1〜4以外の値は無効", () => {
    for (const bad of [0, 5, 2.5, NaN]) {
      const a = { ...allAnswers(3), Q05: bad };
      const r = computeAxisScores(a, QUESTION_SET.questions);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("invalid");
    }
  });
});

describe("タイプ判定", () => {
  it("同点はID昇順で決まる", () => {
    const ranking = computeTypeScores(flat(60), TYPE_CONFIG, { gkEligible: false });
    const notT08 = ranking.filter((r) => r.typeId !== "T08");
    expect(notT08.every((r) => r.score === 60)).toBe(true);
    expect(notT08.map((r) => r.typeId)).toEqual([...notT08.map((r) => r.typeId)].sort());
  });

  it("全軸が同じならオールラウンダー（ばらつき0で+15点）", () => {
    const ranking = computeTypeScores(flat(60), TYPE_CONFIG, { gkEligible: false });
    expect(ranking[0]).toEqual({ typeId: "T08", score: 75 });
  });

  it("得点スコア上限は100", () => {
    const ranking = computeTypeScores(flat(100), TYPE_CONFIG, { gkEligible: true });
    expect(Math.max(...ranking.map((r) => r.score))).toBe(100);
  });

  it("ドリブルが突出していればドリブルアーティスト", () => {
    const out = diagnoseCurrent({ answers: answersByAxis({ DRB: 4 }, 1), gkInterest: "none", foot: "no_answer" });
    expect(out.ok && out.result.primaryTypeId).toBe("T03");
  });

  it("GK未回答・希望なしではT16（ラストガーディアン）を候補にしない", () => {
    const answers = answersByAxis({ DEF: 4, TAC: 4, TEAM: 4, DUEL: 4 }, 1);
    for (const gk of ["none", "no_answer"] as const) {
      const out = diagnoseCurrent({ answers, gkInterest: gk, foot: "no_answer" });
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.result.typeRanking.some((t) => t.typeId === "T16")).toBe(false);
      expect(out.result.primaryTypeId).not.toBe("T16");
    }
    const withGk = diagnoseCurrent({ answers, gkInterest: "wish", foot: "no_answer" });
    expect(withGk.ok && withGk.result.typeRanking.some((t) => t.typeId === "T16")).toBe(true);
  });

  it("1位と2位の差が小さいと複合タイプを返す", () => {
    // PAS/TAC が高い → T01 と T15/T02 等が近接
    const out = diagnoseCurrent({ answers: answersByAxis({ PAS: 4, TAC: 4 }, 2), gkInterest: "none", foot: "no_answer" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const [a, b] = out.result.typeRanking;
    expect(out.result.compositeTypeId).toBe(a.score - b.score < 3 ? b.typeId : null);
  });
});

describe("ポジション適性", () => {
  it("GK未回答ならGKは評価対象外でトップ3に入らない", () => {
    const out = diagnoseCurrent({
      answers: answersByAxis({ DEF: 4, TAC: 4, TEAM: 4 }, 1),
      gkInterest: "no_answer",
      foot: "no_answer",
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const gk = out.result.positionRanking.find((p) => p.positionId === "GK");
    expect(gk?.score).toBeNull();
    expect(out.result.topPositions.map((p) => p.positionId)).not.toContain("GK");
    expect(out.result.topPositions).toHaveLength(3);
    expect(out.result.gkEvaluated).toBe(false);
  });

  it("GK希望があればGKも採点される", () => {
    const r = computePositionScores(flat(50), POSITION_CONFIG, { gkEligible: true, foot: "no_answer" });
    expect(r.find((p) => p.positionId === "GK")?.score).toBe(50);
  });

  it("利き足が未入力なら左右は同点、入力時は同じ側のサイドバックに加点", () => {
    const s = { ...flat(50), MOB: 80 };
    const none = computePositionScores(s, POSITION_CONFIG, { gkEligible: false, foot: "no_answer" });
    const get = (r: typeof none, id: string) => r.find((p) => p.positionId === id)?.score;
    expect(get(none, "RB")).toBe(get(none, "LB"));
    expect(get(none, "RW")).toBe(get(none, "LW"));
    // 同点時は設定ファイルの並び順（RB→LB）
    const idx = (id: string) => none.findIndex((p) => p.positionId === id);
    expect(idx("RB")).toBeLessThan(idx("LB"));
    const left = computePositionScores(s, POSITION_CONFIG, { gkEligible: false, foot: "left" });
    expect(get(left, "LB")).toBe((get(left, "RB") ?? 0) + 2);
  });

  it("スコアは0〜100", () => {
    for (const v of [0, 100]) {
      const r = computePositionScores(flat(v), POSITION_CONFIG, { gkEligible: true, foot: "right" });
      for (const p of r) {
        expect(p.score).toBeGreaterThanOrEqual(0);
        expect(p.score).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("再現性", () => {
  it("回答オブジェクトのキー順に依存しない", () => {
    const base = Object.fromEntries(QUESTION_SET.questions.map((q, i) => [q.id, (i * 7) % 4 + 1]));
    const reversed = Object.fromEntries(Object.entries(base).reverse());
    const a = diagnoseCurrent({ answers: base, gkInterest: "both", foot: "left" });
    const b = diagnoseCurrent({ answers: reversed, gkInterest: "both", foot: "left" });
    expect(a).toEqual(b);
  });

  it("結果にバージョンが含まれ、同じ入力で同じ出力", () => {
    const answers = answersByAxis({ FIN: 4, DUEL: 4, MOB: 3 }, 2);
    const a = diagnoseCurrent({ answers, gkInterest: "none", foot: "right" });
    expect(a).toEqual(diagnoseCurrent({ answers, gkInterest: "none", foot: "right" }));
    expect(a.ok && a.result.primaryTypeId).toBe("T06");
    expect(a.ok && a.result.scoringVersion).toMatch(/^scoring-/);
    expect(a.ok && a.result.questionSetVersion).toBe(QUESTION_SET.version);
    expect(a.ok && a.result.topPositions[0].positionId).toBe("ST");
  });
});

describe("「採点のしくみ」ページの説明と設定値が一致する", () => {
  // src/app/about/page.tsx の説明文を変えずに設定値だけ変えた場合に気づけるようにする
  it("オールラウンダー最大15点・複合タイプは差3点未満・利き足側+2点", async () => {
    const { COMPOSITE_GAP } = await import("./score");
    expect(TYPE_CONFIG.allRounder.maxBonus).toBe(15);
    expect(COMPOSITE_GAP).toBe(3);
    expect(POSITION_CONFIG.footSideBonus).toBe(2);
  });
});
