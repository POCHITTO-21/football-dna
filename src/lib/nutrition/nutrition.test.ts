import { describe, expect, it } from "vitest";
import { TYPE_CONFIG } from "@/lib/scoring/config";
import { DISHES_FILE, GUIDE, PUBLISHED_DISHES, publishedOnly, SOURCES, TYPE_TENDENCIES } from "./data";
import { ACTIVITY_IDS, AGE_IDS, ALLERGEN_IDS, KICKOFF_IDS, type Dish } from "./model";
import { ageFromProfileBand, isSafe, normalizeQuery, selectPlan, slotsFor } from "./select";

const typeIds = TYPE_CONFIG.types.map((t) => t.id);
const q = (over: Partial<ReturnType<typeof normalizeQuery>> = {}) => ({ ...normalizeQuery({}), age: "junior_high" as const, ...over });

describe("食事ガイドのデータ", () => {
  it("16タイプすべてに練習傾向のグループがあり、存在しないタイプはない", () => {
    expect(Object.keys(TYPE_TENDENCIES.types).sort()).toEqual([...typeIds].sort());
  });

  it("料理のタイプIDはすべて既存の16タイプ", () => {
    for (const d of DISHES_FILE.dishes) for (const t of d.compatibleTypeIds) expect(typeIds).toContain(t);
  });

  it("すべての料理とガイドの出典が出典リストにある", () => {
    const ids = new Set(SOURCES.map((s) => s.id));
    for (const d of DISHES_FILE.dishes) for (const r of d.sourceReferences) expect(ids.has(r.sourceId), `${d.id} ${r.sourceId}`).toBe(true);
    for (const id of GUIDE.sourceIds) expect(ids.has(id)).toBe(true);
  });

  it("料理IDが重複しない", () => {
    const ids = DISHES_FILE.dishes.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("栄養成分の数値（未計算の値）を載せていない", () => {
    const text = JSON.stringify(DISHES_FILE) + JSON.stringify(GUIDE) + JSON.stringify(TYPE_TENDENCIES);
    expect(text).not.toMatch(/kcal|キロカロリー|カロリー|エネルギー量|たんぱく質\s*\d|\d+\s*mg/);
    for (const d of DISHES_FILE.dishes) {
      const keys = Object.keys(d);
      expect(keys.some((k) => /nutrient|kcal|energy|protein/i.test(k))).toBe(false);
    }
  });

  it("禁止表現（減量指導・体脂肪率の目標・監修の誤認・能力向上の断定）を使っていない", () => {
    const text = JSON.stringify(DISHES_FILE) + JSON.stringify(GUIDE) + JSON.stringify(TYPE_TENDENCIES);
    expect(text).not.toMatch(/減量|体脂肪率|監修|勝てる|速くなる|能力が上がる|必ず強く/);
    // サプリメントは料理として出さない
    for (const d of DISHES_FILE.dishes) expect(JSON.stringify(d)).not.toMatch(/サプリ|プロテイン/);
  });

  it("タイプで栄養の量が決まるような説明をしない", () => {
    expect(TYPE_TENDENCIES.commonNote).toContain("タイプで必要な栄養の量が決まるわけではありません");
    for (const g of Object.values(TYPE_TENDENCIES.groups)) expect(g.description).toContain("想定");
  });
});

describe("献立の選び方", () => {
  it("5年代 × 16タイプ＋未診断 × 5活動状況 × キックオフ3通りで、すべての食事に献立が出る", () => {
    for (const age of AGE_IDS)
      for (const typeId of [...typeIds, null])
        for (const activity of ACTIVITY_IDS)
          for (const kickoff of KICKOFF_IDS) {
            const plan = selectPlan(q({ age, typeId, activity, kickoff }));
            expect(plan.slots.length).toBeGreaterThan(0);
            for (const s of plan.slots) {
              expect(s.kind, `${age} ${typeId} ${activity} ${kickoff} ${s.timing}`).toBe("matched");
              for (const d of s.candidates) {
                expect(d.ageCategory).toContain(age);
                expect(d.activityCategory).toContain(activity);
                expect(d.mealTiming).toContain(s.timing);
              }
            }
          }
  });

  it("同じ条件なら毎回同じ献立になる", () => {
    const a = selectPlan(q({ typeId: "T04", activity: "high_intensity" }));
    const b = selectPlan(q({ typeId: "T04", activity: "high_intensity" }));
    expect(a.slots.map((s) => s.candidates.map((d) => d.id))).toEqual(b.slots.map((s) => s.candidates.map((d) => d.id)));
  });

  it("タイプの練習傾向に合う料理が先に出る（ほかの料理も候補に残る）", () => {
    const plan = selectPlan(q({ typeId: "T04", activity: "high_intensity" }));
    const after = plan.slots.find((s) => s.timing === "snack_after")!;
    expect(after.candidates.some((d) => d.compatibleTypeIds.length < 16)).toBe(true);
    expect(after.candidates[0].compatibleTypeIds).toContain("T04");
    expect(after.candidates[0].compatibleTypeIds.length).toBeLessThan(16);
    expect(after.candidates.length).toBeGreaterThan(1);
  });

  it("同じ料理が続けて先頭に来ない（候補がほかにある場合）", () => {
    const plan = selectPlan(q({ typeId: "T01", activity: "high_intensity" }));
    const firsts = plan.slots.map((s) => s.candidates[0].id);
    expect(new Set(firsts).size).toBe(firsts.length);
  });

  it("試合前日の夕食は前日向けの料理が先に出る", () => {
    const plan = selectPlan(q({ activity: "pre_match" }));
    const dinner = plan.slots.find((s) => s.timing === "dinner")!;
    expect(dinner.candidates[0].activityCategory).toEqual(["pre_match"]);
  });

  it("試合当日はキックオフ時間で食事の並びが変わる", () => {
    const labels = (k: "morning" | "afternoon" | "evening") => slotsFor("match_day", k).map((s) => s.label);
    expect(labels("morning")[0]).toContain("試合前の食事");
    expect(labels("afternoon")[1]).toContain("試合前の食事");
    expect(labels("evening")).toContain("夕食（試合後）");
  });

  it("存在しないタイプID・年代・活動状況でもエラーにならず、未選択として扱う", () => {
    const n = normalizeQuery({ type: "T99", age: "baby", activity: "party", kickoff: "midnight", allergens: ["egg", "xxx", "egg"] });
    expect(n).toEqual({ age: null, typeId: null, activity: "regular", kickoff: "afternoon", excludedAllergens: ["egg"] });
    const plan = selectPlan(n);
    expect(plan.type).toBeNull();
    expect(plan.slots.every((s) => s.kind === "guidance" && s.candidates.length === 0)).toBe(true);
    expect(() => selectPlan(normalizeQuery({ type: "<script>" }))).not.toThrow();
  });

  it("選んだアレルゲンを含む料理は1つも出さない（すべての組み合わせ）", () => {
    for (const a of ALLERGEN_IDS)
      for (const activity of ACTIVITY_IDS)
        for (const kickoff of KICKOFF_IDS) {
          const plan = selectPlan(q({ activity, kickoff, excludedAllergens: [a] }));
          for (const s of plan.slots) for (const d of s.candidates) expect(isSafe(d, [a]), `${a} ${d.id}`).toBe(true);
        }
    const all = selectPlan(q({ excludedAllergens: [...ALLERGEN_IDS] }));
    for (const s of all.slots) for (const d of s.candidates) expect(d.allergenInformation.contains).toEqual([]);
  });

  it("食材にアレルゲンがあるのに表示が漏れている料理も、安全側で除外する", () => {
    const base = PUBLISHED_DISHES[0];
    const broken: Dish = { ...base, allergenInformation: { ...base.allergenInformation, contains: [] }, ingredients: [{ ...base.ingredients[0], allergens: ["egg"] }] };
    expect(isSafe(broken, ["egg"])).toBe(false);
  });

  it("条件に合う料理がないときは一般的なバランス献立、それもなければ考え方だけ（料理を作らない）", () => {
    const only = PUBLISHED_DISHES.filter((d) => d.id === "D-BF-001");
    const plan = selectPlan(q({ activity: "regular" }), only.map((d) => ({ ...d, activityCategory: ["rest"] })));
    const bf = plan.slots.find((s) => s.timing === "breakfast")!;
    expect(bf.kind).toBe("general");
    const lunch = plan.slots.find((s) => s.timing === "lunch")!;
    expect(lunch.kind).toBe("guidance");
    expect(lunch.candidates).toEqual([]);
  });

  it("出典確認済みでない料理は表示しない", () => {
    const mixed: Dish[] = [{ ...PUBLISHED_DISHES[0], id: "D-XX-001", reviewStatus: "draft" }, PUBLISHED_DISHES[1]];
    expect(publishedOnly(mixed).map((d) => d.id)).toEqual([PUBLISHED_DISHES[1].id]);
    expect(DISHES_FILE.dishes.length).toBeGreaterThan(0);
  });

  it("診断のプロフィールの年代を食事ガイドの年代に変換する", () => {
    expect(ageFromProfileBand("elem_low")).toBe("elem_low");
    expect(ageFromProfileBand("high_school")).toBe("high_school");
    expect(ageFromProfileBand("30_49")).toBe("adult");
    expect(ageFromProfileBand("no_answer")).toBeNull();
    expect(ageFromProfileBand(undefined)).toBeNull();
  });
});

describe("診断結果からのリンク", () => {
  it("タイプIDと年代区分だけをURLに入れる", async () => {
    const { nutritionGuideHref } = await import("./link");
    expect(nutritionGuideHref("T01", "junior_high")).toBe("/nutrition?type=T01&age=junior_high");
    expect(nutritionGuideHref("T16", "30_49")).toBe("/nutrition?type=T16&age=adult");
    expect(nutritionGuideHref("T05", "no_answer")).toBe("/nutrition?type=T05");
  });
});
