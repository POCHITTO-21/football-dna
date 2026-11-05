import dishesJson from "@/data/nutrition/dishes.v1.json";
import guideJson from "@/data/nutrition/guide.v1.json";
import sourcesJson from "@/data/nutrition/sources.v1.json";
import typeTendenciesJson from "@/data/nutrition/type-tendencies.v1.json";
import { type Dish, dishesFileSchema, guideFileSchema, sourcesFileSchema, typeTendencyFileSchema } from "./model";

// 読み込み時に検証する（壊れたデータや出典のない献立を黙って表示しないため）。
export const DISHES_FILE = dishesFileSchema.parse(dishesJson);
export const GUIDE = guideFileSchema.parse(guideJson);
export const SOURCES = sourcesFileSchema.parse(sourcesJson).sources;
export const TYPE_TENDENCIES = typeTendencyFileSchema.parse(typeTendenciesJson);

/** 画面に出すのは「出典確認済み」の献立だけ */
export function publishedOnly(dishes: readonly Dish[]): Dish[] {
  return dishes.filter((d) => d.reviewStatus === "source_checked");
}
export const PUBLISHED_DISHES = publishedOnly(DISHES_FILE.dishes);
