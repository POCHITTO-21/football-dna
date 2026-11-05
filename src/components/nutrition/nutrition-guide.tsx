"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-fields";
import { TYPE_CONFIG } from "@/lib/scoring/config";
import { listResults } from "@/lib/storage";
import { GUIDE, TYPE_TENDENCIES } from "@/lib/nutrition/data";
import { ACTIVITIES, AGE_CATEGORIES, ALLERGENS, INGREDIENT_ROLES, KICKOFFS, type Allergen } from "@/lib/nutrition/model";
import { ageFromProfileBand, normalizeQuery, selectPlan } from "@/lib/nutrition/select";
import { MealSlotCard } from "./meal-slot-card";
import { NotePlans } from "./note-plans";
import { SourceList } from "./source-list";

type Latest = { typeId: string; typeName: string; age: string | null };

export function NutritionGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // アレルギーの選択は健康に関わる情報なので、URL にも端末にも保存しない（画面を閉じると消える）
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [latest, setLatest] = useState<Latest | null>(null);

  // 画面の選択はすぐ反映し、URL（共有・再読み込み用）はあとから合わせる
  const [sel, setSel] = useState<Record<string, string | null>>(() => ({
    age: params.get("age"),
    type: params.get("type"),
    activity: params.get("activity"),
    kickoff: params.get("kickoff"),
  }));
  const query = useMemo(() => normalizeQuery({ ...sel, allergens }), [sel, allergens]);
  const plan = useMemo(() => selectPlan(query), [query]);

  useEffect(() => {
    const r = listResults()[0];
    const t = r && TYPE_CONFIG.types.find((x) => x.id === r.result.primaryTypeId);
    if (r && t) setLatest({ typeId: t.id, typeName: t.name, age: ageFromProfileBand(r.profile.ageBand) });
  }, []);

  const update = (patch: Record<string, string | null>) => {
    const merged = { ...sel, ...patch };
    setSel(merged);
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const tendency = plan.type ? TYPE_TENDENCIES.groups[plan.type.group] : null;
  const theme = GUIDE.activityThemes[query.activity];
  const ageFocus = query.age ? GUIDE.ageFocus[query.age] : null;
  const activityLabel = ACTIVITIES.find((a) => a.value === query.activity)!.label;
  const ageDef = AGE_CATEGORIES.find((a) => a.value === query.age);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-accent/40 bg-gradient-to-b from-navy-800 to-navy-900 p-6 text-center">
        <p className="text-xs font-bold tracking-[0.25em] text-accent">FOOTBALL DNA NUTRITION</p>
        <h1 className="mt-2 text-3xl font-black">食事ガイド</h1>
        <p className="mt-3 text-left text-sm leading-relaxed">
          年代・プレースタイル・その日の練習に合わせた、食事の考え方と献立の例です。
        </p>
        <p className="mt-3 rounded-xl bg-navy-950/60 p-3 text-left text-xs leading-relaxed text-ink-muted">
          一般的な食事の考え方と献立の例で、医学的な診断や個別の栄養指導ではありません。競技の成績を約束するものでもありません。年齢は目安で、成長のしかたには個人差があります。
        </p>
      </section>

      <Card className="space-y-5">
        <CardTitle className="mb-0">条件をえらぶ</CardTitle>
        <ChoiceGroup
          name="age"
          legend="年代"
          hint="年齢は目安です。体の大きさや成長には個人差があります。"
          options={AGE_CATEGORIES.map((a) => ({ value: a.value, label: `${a.label}（${a.range}）` }))}
          value={query.age ?? undefined}
          onChange={(v) => update({ age: v as string })}
          columns={1}
        />

        <div>
          <label htmlFor="type-select" className="mb-1 block text-base font-bold">
            診断タイプ
          </label>
          <select
            id="type-select"
            value={query.typeId ?? ""}
            onChange={(e) => update({ type: e.target.value || null })}
            className="min-h-11 w-full rounded-xl border border-navy-600 bg-navy-800 px-3 text-base text-ink"
          >
            <option value="">まだ診断していない・選ばない</option>
            {TYPE_CONFIG.types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {!query.typeId && (
            <div className="mt-3 space-y-2 rounded-xl bg-navy-800 p-3 text-sm">
              <p className="text-ink-muted">診断するとタイプに合わせた献立例が見られます。タイプを選ばなくても、基本の食事ガイドは見られます。</p>
              {latest && (
                <Button
                  variant="secondary"
                  size="sm"
                  block
                  onClick={() => update({ type: latest.typeId, ...(query.age || !latest.age ? {} : { age: latest.age }) })}
                >
                  この端末の診断結果（{latest.typeName}）を使う
                </Button>
              )}
              <LinkButton href="/diagnosis/profile" size="sm" block>
                無料で診断する
              </LinkButton>
            </div>
          )}
        </div>

        <ChoiceGroup
          name="activity"
          legend="今日の活動状況"
          options={ACTIVITIES}
          value={query.activity}
          onChange={(v) => update({ activity: v as string, ...(v === "match_day" ? {} : { kickoff: null }) })}
        />

        {query.activity === "match_day" && (
          <ChoiceGroup
            name="kickoff"
            legend="キックオフの時間"
            hint="午前：9〜11時ごろ／午後：13〜15時ごろ／夕方：17時ごろ以降"
            options={KICKOFFS}
            value={query.kickoff}
            onChange={(v) => update({ kickoff: v as string })}
          />
        )}

        <details className="rounded-xl border border-navy-700 p-3">
          <summary className="min-h-11 cursor-pointer py-2 font-bold">
            食べられない食材をえらぶ（アレルギー）
            {allergens.length > 0 && <span className="ml-2 text-sm text-accent">{allergens.length}つ選択中</span>}
          </summary>
          <div className="mt-2 space-y-3">
            <ChoiceGroup
              name="allergens"
              type="checkbox"
              legend="含まれる料理を表示しない食材"
              options={ALLERGENS}
              value={allergens}
              onChange={(v) => setAllergens(v as Allergen[])}
            />
            <p className="text-xs leading-relaxed text-warn">{GUIDE.allergyNote}</p>
          </div>
        </details>
      </Card>

      <Card>
        <p className="text-xs font-bold text-accent">今日の栄養テーマ（{activityLabel}）</p>
        <h2 className="mt-1 text-xl font-black">{theme.title}</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {theme.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {query.activity === "match_day" && <p className="mt-3 rounded-xl bg-navy-800 p-3 text-xs leading-relaxed text-ink-muted">{GUIDE.matchDayTimingNote}</p>}
      </Card>

      {ageFocus && ageDef && (
        <Card>
          <p className="text-xs font-bold text-accent">
            {ageDef.label}（{ageDef.range}）のポイント
          </p>
          <h2 className="mt-1 text-lg font-bold">{ageFocus.title}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {ageFocus.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Card>
      )}

      {plan.type && tendency && (
        <Card>
          <p className="text-xs font-bold text-accent">{plan.type.name}の練習の特徴</p>
          <h2 className="mt-1 text-lg font-bold">{tendency.label}</h2>
          <p className="mt-2 text-sm leading-relaxed">{tendency.description}</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">{TYPE_TENDENCIES.commonNote}</p>
        </Card>
      )}

      <section aria-labelledby="meals-heading" className="space-y-3">
        <h2 id="meals-heading" className="text-xl font-black">
          献立の例
        </h2>
        {!query.age ? (
          <Card>
            <p className="text-sm">上の「年代」を選ぶと、年代に合わせた量の目安つきで献立の例が表示されます。</p>
            <h3 className="mb-2 mt-4 font-bold">{GUIDE.generalGuidance.title}</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {GUIDE.generalGuidance.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-ink-muted">
              カードを開くと、食材と目安量・作り方・代わりの食品・アレルギー情報が見られます。目安量は量の目安で、栄養計算をした値ではありません。おなかのすき具合や体の大きさに合わせて調整してください。
            </p>
            {plan.slots.map((s) => (
              <MealSlotCard key={`${query.activity}-${query.kickoff}-${s.timing}`} slot={s} age={query.age!} />
            ))}
          </>
        )}
      </section>

      <Card>
        <CardTitle>{GUIDE.hydration.title}</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {GUIDE.hydration.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>食材の役割</CardTitle>
        <ul className="space-y-2 text-sm">
          {GUIDE.foodRoles.map((r) => (
            <li key={r.role} className="rounded-lg bg-navy-800 p-3">
              <span className="sr-only">{INGREDIENT_ROLES[r.role]}：</span>
              {r.text}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">{GUIDE.supplementNote}</p>
      </Card>

      <Card className="border-warn/40">
        <CardTitle>こんなときは専門家に相談を</CardTitle>
        <p className="text-sm leading-relaxed">{GUIDE.consultNote}</p>
      </Card>

      <NotePlans />

      <SourceList />
    </div>
  );
}
