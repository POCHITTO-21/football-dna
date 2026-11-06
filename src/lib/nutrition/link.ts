import { ageFromProfileBand } from "./select";

/** 診断結果から食事ガイドへのリンク。URL に入るのはタイプIDと年代区分だけ（個人を特定する情報は入れない） */
export function nutritionGuideHref(typeId: string, ageBand?: string | null): string {
  const p = new URLSearchParams({ type: typeId });
  const age = ageFromProfileBand(ageBand);
  if (age) p.set("age", age);
  return `/nutrition?${p.toString()}`;
}
