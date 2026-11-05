import { TYPE_CONFIG } from "@/lib/scoring/config";
import { GUIDE, PUBLISHED_DISHES, TYPE_TENDENCIES } from "./data";
import {
  ACTIVITY_IDS,
  AGE_IDS,
  ALLERGEN_IDS,
  KICKOFF_IDS,
  type Activity,
  type AgeCategory,
  type Allergen,
  type Dish,
  type Kickoff,
  type LoadGroup,
  type SlotDef,
} from "./model";

export type GuideQuery = {
  age: AgeCategory | null;
  typeId: string | null;
  activity: Activity;
  kickoff: Kickoff;
  excludedAllergens: Allergen[];
};

export type SlotResult = SlotDef & {
  /** 表示順に並んだ候補。先頭がおすすめ */
  candidates: Dish[];
  /** matched: 条件に合う献立 / general: 一般的なバランス献立 / guidance: 献立なし（考え方だけ表示） */
  kind: "matched" | "general" | "guidance";
};

export type GuidePlan = {
  query: GuideQuery;
  type: { id: string; name: string; group: LoadGroup } | null;
  slots: SlotResult[];
};

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

/** 診断のプロフィールの年代 → 食事ガイドの年代。回答なし・不明は null（画面で選んでもらう） */
export function ageFromProfileBand(band: string | null | undefined): AgeCategory | null {
  switch (band) {
    case "elem_low":
    case "elem_high":
    case "junior_high":
    case "high_school":
      return band;
    case "18_29":
    case "30_49":
    case "50_plus":
      return "adult";
    default:
      return null;
  }
}

/** URL などから来た値を安全な条件に直す。存在しないタイプIDや年代は「未選択」として扱い、エラーにしない */
export function normalizeQuery(raw: { age?: unknown; type?: unknown; activity?: unknown; kickoff?: unknown; allergens?: unknown }): GuideQuery {
  const typeId = typeof raw.type === "string" && TYPE_CONFIG.types.some((t) => t.id === raw.type) ? raw.type : null;
  const allergens = Array.isArray(raw.allergens) ? raw.allergens.filter((a): a is Allergen => isOneOf(ALLERGEN_IDS, a)) : [];
  return {
    age: isOneOf(AGE_IDS, raw.age) ? raw.age : null,
    typeId,
    activity: isOneOf(ACTIVITY_IDS, raw.activity) ? raw.activity : "regular",
    kickoff: isOneOf(KICKOFF_IDS, raw.kickoff) ? raw.kickoff : "afternoon",
    excludedAllergens: [...new Set(allergens)],
  };
}

export function slotsFor(activity: Activity, kickoff: Kickoff): SlotDef[] {
  return activity === "match_day" ? GUIDE.matchDaySlots[kickoff] : GUIDE.slots[activity];
}

/** 1. 安全条件：選ばれたアレルゲンを1つでも含む料理は出さない */
export function isSafe(d: Dish, excluded: readonly Allergen[]): boolean {
  if (excluded.length === 0) return true;
  const contains = new Set([...d.allergenInformation.contains, ...d.ingredients.flatMap((i) => i.allergens)]);
  return excluded.every((a) => !contains.has(a));
}

/**
 * 献立を選ぶ。優先順位：
 * 1. アレルギー等の安全条件（除外） 2. 年代（除外） 3. 活動状況（除外＋その日向けの料理を優先）
 * 4. タイプの練習傾向（並び順だけに使う。量や栄養の考え方は変えない） 5. 調理時間の短い順 → ID順
 * 条件に合う料理がなければ一般的なバランス献立、それもなければ考え方だけを返す（料理を作り出さない）。
 */
export function selectPlan(query: GuideQuery, dishes: readonly Dish[] = PUBLISHED_DISHES): GuidePlan {
  const typeDefn = query.typeId ? TYPE_CONFIG.types.find((t) => t.id === query.typeId) : undefined;
  const group = typeDefn ? TYPE_TENDENCIES.types[typeDefn.id] : undefined;
  const type = typeDefn && group ? { id: typeDefn.id, name: typeDefn.name, group } : null;
  const age = query.age;

  // 同じ料理が続けて先頭に来ないよう、前の食事で先頭だった料理は後ろに回す（候補からは外さない）
  const shownFirst = new Set<string>();
  const avoidRepeat = (list: Dish[]): Dish[] => {
    const i = list.findIndex((d) => !shownFirst.has(d.id));
    const out = i > 0 ? [list[i], ...list.slice(0, i), ...list.slice(i + 1)] : list;
    if (out[0]) shownFirst.add(out[0].id);
    return out;
  };

  const slots = slotsFor(query.activity, query.kickoff).map((slot): SlotResult => {
    if (!age) return { ...slot, candidates: [], kind: "guidance" };
    const safe = dishes.filter((d) => isSafe(d, query.excludedAllergens) && d.ageCategory.includes(age) && d.mealTiming.includes(slot.timing));
    const forType = (d: Dish) => (type ? d.compatibleTypeIds.includes(type.id) : d.compatibleTypeIds.length === TYPE_CONFIG.types.length);
    const matched = safe.filter((d) => d.activityCategory.includes(query.activity) && forType(d));
    if (matched.length > 0) {
      const score = (d: Dish) =>
        (d.activityCategory.length <= 2 ? 4 : 0) + (type && d.compatibleTypeIds.length < TYPE_CONFIG.types.length ? 2 : 0);
      const sorted = [...matched].sort(
        (a, b) => score(b) - score(a) || a.estimatedCookingMinutes - b.estimatedCookingMinutes || a.id.localeCompare(b.id),
      );
      return { ...slot, candidates: avoidRepeat(sorted), kind: "matched" };
    }
    const general = safe.filter((d) => d.generalFallback).sort((a, b) => a.id.localeCompare(b.id));
    if (general.length > 0) return { ...slot, candidates: avoidRepeat(general), kind: "general" };
    return { ...slot, candidates: [], kind: "guidance" };
  });

  return { query, type, slots };
}

/** 目安量の表示用文字列（年代別の量なら、その年代の量） */
export function amountFor(d: Dish, ingredientId: string, age: AgeCategory): string {
  const a = d.ingredientAmounts[ingredientId];
  if (a === undefined) return "";
  return typeof a === "string" ? a : a[age];
}
