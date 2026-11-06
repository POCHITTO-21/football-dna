import type { Metadata } from "next";
import { Suspense } from "react";
import { NutritionGuide } from "@/components/nutrition/nutrition-guide";

export const metadata: Metadata = {
  title: "食事ガイド",
  description: "年代・プレースタイル・練習状況に合わせた、サッカー選手のための食事の考え方と献立例（FOOTBALL DNA NUTRITION）。",
};

export default function NutritionPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-muted">読み込み中…</p>}>
      <NutritionGuide />
    </Suspense>
  );
}
