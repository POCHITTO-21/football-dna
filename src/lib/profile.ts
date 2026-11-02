import { z } from "zod";

export const AGE_BANDS = [
  { value: "elem_low", label: "小学生（低学年）", kids: true },
  { value: "elem_high", label: "小学生（高学年）", kids: true },
  { value: "junior_high", label: "中学生", kids: false },
  { value: "high_school", label: "高校生", kids: false },
  { value: "18_29", label: "18〜29歳", kids: false },
  { value: "30_49", label: "30〜49歳", kids: false },
  { value: "50_plus", label: "50歳以上", kids: false },
  { value: "no_answer", label: "回答しない", kids: false },
] as const;

export const EXPERIENCE = [
  { value: "lt1", label: "1年未満" },
  { value: "1_3", label: "1〜3年" },
  { value: "4_6", label: "4〜6年" },
  { value: "7_plus", label: "7年以上" },
  { value: "no_answer", label: "回答しない" },
] as const;

export const USUAL_POSITIONS = [
  { value: "GK", label: "GK（ゴールキーパー）" },
  { value: "DF", label: "DF（ディフェンダー）" },
  { value: "MF", label: "MF（ミッドフィルダー）" },
  { value: "FW", label: "FW（フォワード）" },
  { value: "undecided", label: "決まっていない" },
] as const;

export const GK_INTEREST = [
  { value: "experience", label: "GKの経験がある" },
  { value: "wish", label: "GKをやってみたい" },
  { value: "both", label: "経験があり、今後もやりたい" },
  { value: "none", label: "経験も希望もない" },
  { value: "no_answer", label: "回答しない" },
] as const;

export const FOOT = [
  { value: "right", label: "右" },
  { value: "left", label: "左" },
  { value: "both", label: "両方" },
  { value: "no_answer", label: "回答しない・わからない" },
] as const;

const values = <T extends readonly { value: string }[]>(arr: T) =>
  arr.map((a) => a.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

/**
 * 基本情報。氏名・生年月日・学校・住所・顔写真は収集しない（仕様 4章）。
 * ニックネームは任意で、SNS画像に載せるかどうかも別途ユーザーが選ぶ。
 */
export const profileSchema = z.object({
  ageBand: z.enum(values(AGE_BANDS), { message: "年代を選んでください" }),
  experience: z.enum(values(EXPERIENCE), { message: "経験年数を選んでください" }),
  usualPositions: z.array(z.enum(values(USUAL_POSITIONS))).min(1, "1つ以上選んでください"),
  gkInterest: z.enum(values(GK_INTEREST), { message: "どれか1つ選んでください" }),
  foot: z.enum(values(FOOT)),
  nickname: z
    .string()
    .trim()
    .max(12, "ニックネームは12文字以内にしてください")
    .regex(/^[^<>]*$/, "使えない文字が含まれています")
    .optional()
    .or(z.literal("")),
});
export type Profile = z.infer<typeof profileSchema>;
export type GkInterest = Profile["gkInterest"];
export type Foot = Profile["foot"];

export function isGkEligible(gk: GkInterest): boolean {
  return gk === "experience" || gk === "wish" || gk === "both";
}

export function isKidsAgeBand(ageBand: Profile["ageBand"]): boolean {
  return AGE_BANDS.find((a) => a.value === ageBand)?.kids ?? false;
}

export function labelOf<T extends readonly { value: string; label: string }[]>(arr: T, v: string): string {
  return arr.find((a) => a.value === v)?.label ?? v;
}
