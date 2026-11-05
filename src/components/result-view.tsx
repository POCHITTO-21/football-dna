"use client";
import { useRouter } from "next/navigation";
import { SaveToAccount } from "@/components/save-to-account";
import { UpgradeToFull } from "@/components/upgrade-to-full";
import { useResultEntry } from "@/components/use-result-entry";
import { deleteMyResult } from "@/app/actions/account";
import { AxisRadar } from "@/components/axis-radar";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AXIS_IDS } from "@/lib/scoring/model";
import { axisDef, positionLabel, POSITION_CONFIG, typeDef } from "@/lib/scoring/config";
import { deleteResult } from "@/lib/storage";

export function ResultView({ id, accountEnabled }: { id: string; accountEnabled: boolean }) {
  const router = useRouter();
  const loaded = useResultEntry(id, accountEnabled);
  const entry = loaded === undefined ? undefined : (loaded?.entry ?? null);

  if (entry === undefined) return <p className="py-20 text-center text-ink-muted">読み込み中…</p>;
  if (entry === null) {
    return (
      <Card className="space-y-4 text-center">
        <h1 className="text-xl font-bold">結果が見つかりません</h1>
        <p className="text-sm text-ink-muted">
          診断結果は、診断した端末のブラウザ（またはログインしたアカウント）にだけ保存されています。別の端末・他の人の結果・削除済みの結果は表示できません。
        </p>
        <LinkButton href="/diagnosis/profile" block>
          診断する
        </LinkButton>
      </Card>
    );
  }

  const r = entry.result;
  const t = typeDef(r.primaryTypeId);
  const isQuick = r.mode === "quick";
  const composite = r.compositeTypeId ? typeDef(r.compositeTypeId) : null;
  // かんたん診断では、得点差に関係なく2位のタイプも候補として見せる
  const runnerUp = isQuick && r.typeRanking[1] ? typeDef(r.typeRanking[1].typeId) : null;
  const nickname = entry.profile.nickname?.trim();

  const source = loaded?.source ?? "local";
  const onDelete = async () => {
    if (source === "account") {
      if (!window.confirm("この診断結果をアカウントから削除します（共有リンクも削除されます）。よろしいですか？")) return;
      const r = await deleteMyResult(entry.id);
      if (!r.ok) return window.alert(r.error);
      router.replace("/me");
      return;
    }
    if (!window.confirm("この診断結果をこの端末から削除します。よろしいですか？")) return;
    deleteResult(entry.id);
    router.replace("/");
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-accent/40 bg-gradient-to-b from-navy-800 to-navy-900 p-6 text-center">
        <p className="text-xs font-bold tracking-[0.25em] text-accent">YOUR FOOTBALL DNA</p>
        {isQuick && (
          <p className="mx-auto mt-2 w-fit rounded-full border border-accent/50 px-3 py-0.5 text-xs font-bold text-accent">
            かんたん診断（15問）の結果です
          </p>
        )}
        {nickname && <p className="mt-2 text-sm text-ink-muted">{nickname} さんのプレースタイル</p>}
        <h1 className="mt-2 text-3xl font-black">{t.name}</h1>
        <p className="mt-1 font-bold text-accent">{t.catchcopy}</p>
        <p className="mt-4 text-left text-sm leading-relaxed text-ink">{t.summary}</p>
        {runnerUp && (
          <p className="mt-4 rounded-xl bg-navy-950/60 p-3 text-left text-sm text-ink-muted">
            <span className="font-bold text-ink">{runnerUp.name}タイプの可能性もあります</span>
            <br />
            かんたん診断は質問が少ないため、1位と2位が入れ替わることがあります。くわしく知りたい方は40問の診断をお試しください。
          </p>
        )}
        {!isQuick && composite && (
          <p className="mt-4 rounded-xl bg-navy-950/60 p-3 text-left text-sm text-ink-muted">
            <span className="font-bold text-ink">複合タイプ：{t.name} × {composite.name}</span>
            <br />
            2つのタイプの得点がとても近いため、両方の特徴をあわせ持っている可能性があります。
          </p>
        )}
        {r.flatProfile && (
          <p className="mt-3 rounded-xl bg-navy-950/60 p-3 text-left text-sm text-ink-muted">
            8つの志向の差が小さく、特定のプレーに偏らないバランスの良い回答でした。タイプ名は目安としてご覧ください。
          </p>
        )}
      </section>

      {isQuick && <UpgradeToFull entry={entry} source={source} />}

      <Card>
        <CardTitle>8つのプレー志向</CardTitle>
        <AxisRadar scores={r.axisScores} />
        <ul className="mt-2 space-y-2">
          {AXIS_IDS.map((a) => (
            <li key={a}>
              <div className="flex justify-between text-sm">
                <span>{axisDef(a).label}</span>
                <span className="font-bold tabular-nums">{r.axisScores[a]}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-navy-700" aria-hidden>
                <div className="h-full rounded-full bg-accent" style={{ width: `${r.axisScores[a]}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          数値（0〜100）は自己回答から見た「そのプレーをどれくらい好む・意識しているか」の目安で、能力の高さを表すものではありません。
        </p>
      </Card>

      <Card>
        <CardTitle>あなたの強み</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {t.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <h3 className="mb-2 mt-4 font-bold">さらに伸ばすためのヒント</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {t.cautions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>ポジションの可能性 トップ3</CardTitle>
        <ol className="space-y-3">
          {r.topPositions.map((p, i) => {
            const def = POSITION_CONFIG.positions.find((x) => x.id === p.positionId)!;
            return (
              <li key={p.positionId} className="rounded-xl bg-navy-800 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">
                    <span className="mr-2 text-accent">{i + 1}</span>
                    {def.label}（{p.positionId}）
                  </span>
                  <span className="text-lg font-black tabular-nums">{p.score}</span>
                </div>
                <p className="mt-2 text-sm">
                  「{p.topAxes.map((a) => axisDef(a).label).join("」「")}」の志向が、このポジションでよく求められるプレーと重なっています。
                </p>
                <p className="mt-1 text-xs text-ink-muted">留意点：{def.note}</p>
              </li>
            );
          })}
        </ol>
        {!r.gkEvaluated && (
          <p className="mt-3 text-xs text-ink-muted">
            GK（ゴールキーパー）は、GKの経験・希望の回答がないため評価対象外です。
          </p>
        )}
        {r.gkEvaluated && (
          <p className="mt-3 text-xs text-ink-muted">
            GKは経験・希望の回答をもとにした参考値です。GKの技術はこの診断では測っていません。
          </p>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          身体能力の実測ではなく、プレーの好みとポジションの「合いやすさ」です。1つに決めつけず、いろいろなポジションを経験してみてください。
        </p>
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-2 text-ink-muted">全ポジションのスコアを見る</summary>
          <ul className="grid grid-cols-2 gap-2">
            {r.positionRanking.map((p) => (
              <li key={p.positionId} className="flex justify-between rounded-lg bg-navy-800 px-3 py-2">
                <span>{positionLabel(p.positionId)}</span>
                <span className="font-bold tabular-nums">{p.score ?? "対象外"}</span>
              </li>
            ))}
          </ul>
        </details>
      </Card>

      <Card>
        <CardTitle>おすすめ練習</CardTitle>
        <h3 className="mb-2 text-sm font-bold text-accent">得意を伸ばす（{t.name}向け）</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {t.practices.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <h3 className="mb-2 mt-4 text-sm font-bold text-accent">プレーの幅を広げる</h3>
        <ul className="space-y-2 text-sm">
          {r.growthAxes.map((a) => (
            <li key={a} className="rounded-lg bg-navy-800 p-3">
              <span className="font-bold">{axisDef(a).label}</span>
              <br />
              <span className="text-ink-muted">{axisDef(a).growthPractice}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <details>
          <summary className="min-h-11 cursor-pointer py-2 font-bold">指導者・保護者の方へ</summary>
          <p className="mt-2 text-sm leading-relaxed">{t.coachAdvice}</p>
          <p className="mt-2 text-xs text-ink-muted">
            この結果は本人の自己回答にもとづくものです。選手の選抜・序列づけには使わず、本人と話すきっかけとしてご活用ください。
          </p>
        </details>
      </Card>

      {accountEnabled && source === "local" && <SaveToAccount entry={entry} />}

      <div className="space-y-3">
        <LinkButton href={`/results/${entry.id}/share`} size="lg" block>
          SNS用の画像をつくる
        </LinkButton>
        <LinkButton href={`/diagnosis/profile?mode=${isQuick ? "quick" : "full"}`} variant="secondary" block>
          もう一度診断する
        </LinkButton>
        <Button variant="danger" block onClick={onDelete}>
          {source === "account" ? "この結果をアカウントから削除する" : "この結果を削除する"}
        </Button>
      </div>

      <p className="text-center text-xs text-ink-muted">
        診断日 {new Date(entry.createdAt).toLocaleString("ja-JP")} ／ {r.questionSetVersion} ／ {r.scoringVersion}
      </p>
    </div>
  );
}
