import { z } from "zod";

/**
 * 食事ガイド（FOOTBALL DNA NUTRITION）のデータ型。
 * 献立データは src/data/nutrition/*.json にあり、読み込み時にここで検証する。
 * 栄養成分の数値（エネルギー・たんぱく質量など）はまだ扱わない。目安量は「量の目安」であり栄養計算の結果ではない。
 */

export const AGE_CATEGORIES = [
  { value: "elem_low", label: "小学低学年", range: "目安 6〜9歳" },
  { value: "elem_high", label: "小学高学年", range: "目安 10〜12歳" },
  { value: "junior_high", label: "中学生", range: "目安 13〜15歳" },
  { value: "high_school", label: "高校生", range: "目安 16〜18歳" },
  { value: "adult", label: "大学生・社会人", range: "目安 19歳以上" },
] as const;
export type AgeCategory = (typeof AGE_CATEGORIES)[number]["value"];
export const AGE_IDS = AGE_CATEGORIES.map((a) => a.value) as [AgeCategory, ...AgeCategory[]];

export const ACTIVITIES = [
  { value: "regular", label: "通常練習日" },
  { value: "high_intensity", label: "高強度練習日" },
  { value: "pre_match", label: "試合前日" },
  { value: "match_day", label: "試合当日" },
  { value: "rest", label: "休養日" },
] as const;
export type Activity = (typeof ACTIVITIES)[number]["value"];
export const ACTIVITY_IDS = ACTIVITIES.map((a) => a.value) as [Activity, ...Activity[]];

export const KICKOFFS = [
  { value: "morning", label: "午前" },
  { value: "afternoon", label: "午後" },
  { value: "evening", label: "夕方" },
] as const;
export type Kickoff = (typeof KICKOFFS)[number]["value"];
export const KICKOFF_IDS = KICKOFFS.map((k) => k.value) as [Kickoff, ...Kickoff[]];

export const MEAL_TIMINGS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack_before",
  "snack_after",
  "snack",
  "pre_match_meal",
  "pre_match_snack",
  "post_match",
] as const;
export type MealTiming = (typeof MEAL_TIMINGS)[number];

/** 画面で選べる主なアレルゲン8品目（えび・かに・くるみ・小麦・そば・卵・乳・落花生） */
export const ALLERGENS = [
  { value: "egg", label: "卵" },
  { value: "milk", label: "乳" },
  { value: "wheat", label: "小麦" },
  { value: "buckwheat", label: "そば" },
  { value: "peanut", label: "落花生" },
  { value: "shrimp", label: "えび" },
  { value: "crab", label: "かに" },
  { value: "walnut", label: "くるみ" },
] as const;
export type Allergen = (typeof ALLERGENS)[number]["value"];
export const ALLERGEN_IDS = ALLERGENS.map((a) => a.value) as [Allergen, ...Allergen[]];

export const INGREDIENT_ROLES = {
  staple: "主食",
  main: "主菜",
  side: "副菜",
  dairy: "牛乳・乳製品",
  fruit: "果物",
  soup: "汁物",
  drink: "飲み物",
} as const;

export const LOAD_GROUPS = ["endurance", "repeated_sprint", "contact", "positional"] as const;
export type LoadGroup = (typeof LOAD_GROUPS)[number];

const typeId = z.string().regex(/^T(0[1-9]|1[0-6])$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nonEmpty = z.string().trim().min(1);

/** 年代ごとに違う目安量、または全年代共通の目安量 */
const amount = z.union([nonEmpty, z.object(Object.fromEntries(AGE_IDS.map((a) => [a, nonEmpty])) as Record<AgeCategory, typeof nonEmpty>).strict()]);

export const dishSchema = z
  .object({
    id: z.string().regex(/^D-[A-Z]+-\d{3}$/),
    title: nonEmpty,
    ageCategory: z.array(z.enum(AGE_IDS)).min(1),
    compatibleTypeIds: z.array(typeId).min(1),
    activityCategory: z.array(z.enum(ACTIVITY_IDS)).min(1),
    mealTiming: z.array(z.enum(MEAL_TIMINGS)).min(1),
    ingredients: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9_]+$/),
          name: nonEmpty,
          role: z.enum(Object.keys(INGREDIENT_ROLES) as [keyof typeof INGREDIENT_ROLES]),
          allergens: z.array(z.enum(ALLERGEN_IDS)),
        }),
      )
      .min(1),
    ingredientAmounts: z.record(z.string(), amount),
    cookingSteps: z.array(nonEmpty).min(1),
    estimatedCookingMinutes: z.number().int().min(0).max(120),
    nutritionPurpose: nonEmpty,
    substitutions: z.array(z.object({ ingredientId: z.string(), alternatives: z.array(nonEmpty).min(1), note: z.string().optional() })),
    allergenInformation: z.object({
      contains: z.array(z.enum(ALLERGEN_IDS)),
      /** 8品目以外で注意したいもの（大豆・さけ・ごま など）。表示のみで、絞り込みには使わない */
      others: z.array(nonEmpty),
      note: z.string().optional(),
    }),
    sourceReferences: z.array(z.object({ sourceId: nonEmpty, claim: nonEmpty })).min(1),
    lastReviewedAt: isoDate,
    reviewStatus: z.enum(["draft", "source_checked"]),
    /** 条件に合う献立がないときに出す「一般的なバランス献立」 */
    generalFallback: z.boolean().optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const ids = new Set(d.ingredients.map((i) => i.id));
    for (const i of d.ingredients)
      if (!(i.id in d.ingredientAmounts)) ctx.addIssue({ code: "custom", message: `${d.id}: ${i.id} の目安量がありません` });
    for (const k of Object.keys(d.ingredientAmounts))
      if (!ids.has(k)) ctx.addIssue({ code: "custom", message: `${d.id}: 目安量 ${k} に対応する食材がありません` });
    for (const s of d.substitutions)
      if (!ids.has(s.ingredientId)) ctx.addIssue({ code: "custom", message: `${d.id}: 代替 ${s.ingredientId} に対応する食材がありません` });
    // アレルゲン表示は食材の合計と必ず一致させる（表示漏れで安全条件をすり抜けないため）
    const fromIngredients = new Set(d.ingredients.flatMap((i) => i.allergens));
    const declared = new Set(d.allergenInformation.contains);
    const same = fromIngredients.size === declared.size && [...fromIngredients].every((a) => declared.has(a));
    if (!same) ctx.addIssue({ code: "custom", message: `${d.id}: allergenInformation.contains が食材のアレルゲンと一致しません` });
  });
export type Dish = z.infer<typeof dishSchema>;
export const dishesFileSchema = z.object({ version: nonEmpty, dishes: z.array(dishSchema).min(1) });

export const sourceSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  publisher: nonEmpty,
  url: z.string().url().startsWith("https://"),
  checkedOn: isoDate,
  usedFor: nonEmpty,
});
export type Source = z.infer<typeof sourceSchema>;
export const sourcesFileSchema = z.object({ version: nonEmpty, sources: z.array(sourceSchema).min(1) });

const slotSchema = z.object({ timing: z.enum(MEAL_TIMINGS), label: nonEmpty, note: z.string().optional() });
export type SlotDef = z.infer<typeof slotSchema>;

const textBlock = z.object({ title: nonEmpty, points: z.array(nonEmpty).min(1) });

export const guideFileSchema = z.object({
  version: nonEmpty,
  lastReviewedAt: isoDate,
  ageFocus: z.object(Object.fromEntries(AGE_IDS.map((a) => [a, textBlock])) as Record<AgeCategory, typeof textBlock>),
  activityThemes: z.object(Object.fromEntries(ACTIVITY_IDS.map((a) => [a, textBlock])) as Record<Activity, typeof textBlock>),
  /** 試合当日以外の食事の並び */
  slots: z.object(
    Object.fromEntries(ACTIVITY_IDS.filter((a) => a !== "match_day").map((a) => [a, z.array(slotSchema).min(1)])) as Record<
      Exclude<Activity, "match_day">,
      z.ZodArray<typeof slotSchema>
    >,
  ),
  /** 試合当日はキックオフ時間で食事の並びが変わる */
  matchDaySlots: z.object(Object.fromEntries(KICKOFF_IDS.map((k) => [k, z.array(slotSchema).min(1)])) as Record<Kickoff, z.ZodArray<typeof slotSchema>>),
  matchDayTimingNote: nonEmpty,
  hydration: textBlock,
  foodRoles: z.array(z.object({ role: z.enum(Object.keys(INGREDIENT_ROLES) as [keyof typeof INGREDIENT_ROLES]), text: nonEmpty })).min(1),
  supplementNote: nonEmpty,
  consultNote: nonEmpty,
  allergyNote: nonEmpty,
  generalGuidance: textBlock,
  sourceIds: z.array(nonEmpty).min(1),
});
export type Guide = z.infer<typeof guideFileSchema>;

export const typeTendencyFileSchema = z.object({
  version: nonEmpty,
  commonNote: nonEmpty,
  groups: z.object(
    Object.fromEntries(LOAD_GROUPS.map((g) => [g, z.object({ label: nonEmpty, description: nonEmpty })])) as Record<
      LoadGroup,
      z.ZodObject<{ label: typeof nonEmpty; description: typeof nonEmpty }>
    >,
  ),
  types: z.record(typeId, z.enum(LOAD_GROUPS)),
});
export type TypeTendencies = z.infer<typeof typeTendencyFileSchema>;
