"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SOURCES } from "@/lib/nutrition/data";
import { ALLERGENS, INGREDIENT_ROLES, type AgeCategory, type Dish } from "@/lib/nutrition/model";
import { amountFor, type SlotResult } from "@/lib/nutrition/select";
import { GUIDE } from "@/lib/nutrition/data";

const allergenLabel = (a: string) => ALLERGENS.find((x) => x.value === a)?.label ?? a;

export function MealSlotCard({ slot, age }: { slot: SlotResult; age: AgeCategory }) {
  const [index, setIndex] = useState(0);
  const dish = slot.candidates.length > 0 ? slot.candidates[index % slot.candidates.length] : null;
  const headingId = `slot-${slot.timing}`;

  return (
    <Card aria-labelledby={headingId} className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={headingId} className="text-lg font-black text-accent">
          {slot.label}
        </h3>
        {slot.candidates.length > 1 && (
          <span className="text-xs text-ink-muted">
            {(index % slot.candidates.length) + 1}/{slot.candidates.length}
          </span>
        )}
      </div>
      {slot.note && <p className="mt-1 text-xs text-ink-muted">{slot.note}</p>}

      {slot.kind === "general" && (
        <p className="mt-2 rounded-lg bg-navy-800 p-2 text-xs text-warn">条件にぴったり合う献立がないため、一般的なバランス献立を表示しています。</p>
      )}

      {!dish ? (
        <div className="mt-3 rounded-xl bg-navy-800 p-3 text-sm">
          <p>選んだ条件に合う献立の例がありません。次の考え方を参考に、食べられる食品で組み立ててください。</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
            {GUIDE.generalGuidance.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div aria-live="polite">
          <DishDetails key={dish.id} dish={dish} age={age} />
        </div>
      )}

      {slot.candidates.length > 1 && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setIndex((i) => i + 1)}>
          別の例を見る
        </Button>
      )}
    </Card>
  );
}

function DishDetails({ dish, age }: { dish: Dish; age: AgeCategory }) {
  const { contains, others, note } = dish.allergenInformation;
  return (
    <details className="group mt-3 rounded-xl border border-navy-700 bg-navy-800/60">
      <summary className="flex min-h-11 cursor-pointer list-none flex-col gap-1 p-3">
        <span className="font-bold leading-snug">{dish.title}</span>
        <span className="text-xs text-ink-muted">
          調理時間の目安 {dish.estimatedCookingMinutes === 0 ? "調理なし" : `約${dish.estimatedCookingMinutes}分`}
          {contains.length > 0 && ` ／ 含む：${contains.map(allergenLabel).join("・")}`}
        </span>
        <span className="text-sm">{dish.nutritionPurpose}</span>
        <span className="text-xs font-bold text-accent">
          <span className="group-open:hidden">▼ 食材・作り方を見る</span>
          <span className="hidden group-open:inline">▲ 閉じる</span>
        </span>
      </summary>
      <div className="space-y-4 border-t border-navy-700 p-3 text-sm">
        <div>
          <h4 className="mb-1 font-bold">食材と目安量</h4>
          <ul className="divide-y divide-navy-700">
            {dish.ingredients.map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-x-3 py-1.5">
                <span>
                  <span className="mr-1 rounded bg-navy-700 px-1.5 text-xs text-ink-muted">{INGREDIENT_ROLES[i.role]}</span>
                  {i.name}
                </span>
                <span className="text-ink-muted">{amountFor(dish, i.id, age)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-1 font-bold">作り方</h4>
          <ol className="list-decimal space-y-1 pl-5">
            {dish.cookingSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
        {dish.substitutions.length > 0 && (
          <div>
            <h4 className="mb-1 font-bold">代わりの食品</h4>
            <ul className="space-y-1">
              {dish.substitutions.map((s) => {
                const name = dish.ingredients.find((i) => i.id === s.ingredientId)?.name ?? s.ingredientId;
                return (
                  <li key={s.ingredientId}>
                    {name} → {s.alternatives.join("、")}
                    {s.note && <span className="block text-xs text-ink-muted">{s.note}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div>
          <h4 className="mb-1 font-bold">アレルギー情報</h4>
          <p>主な8品目：{contains.length > 0 ? contains.map(allergenLabel).join("・") + "を含みます" : "含みません（食材として使っていません）"}</p>
          {others.length > 0 && <p className="text-ink-muted">そのほか注意したい食材：{others.join("・")}</p>}
          {note && <p className="mt-1 text-xs text-ink-muted">{note}</p>}
        </div>
        <p className="text-xs text-ink-muted">
          根拠：
          {dish.sourceReferences
            .map((r) => `${SOURCES.find((s) => s.id === r.sourceId)?.title ?? r.sourceId}（${r.claim}）`)
            .join("／")}
          ／確認日 {dish.lastReviewedAt}
        </p>
      </div>
    </details>
  );
}
