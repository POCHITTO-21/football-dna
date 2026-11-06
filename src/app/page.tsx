import { Card } from "@/components/ui/card";
import { HomeActions } from "@/components/home-actions";
import Link from "next/link";
import { AXES, TYPE_CONFIG } from "@/lib/scoring/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="pt-4 text-center">
        <p className="text-sm font-bold tracking-[0.2em] text-accent">PLAY STYLE DIAGNOSIS</p>
        <h1 className="mt-2 text-4xl font-black leading-tight">
          あなたのサッカー
          <br />
          <span className="text-accent">DNA</span> を見つけよう
        </h1>
        <p className="mt-4 text-ink-muted">
          15問・約2分の質問に答えると、16のプレースタイルから
          <br className="hidden sm:inline" />
          あなたに近いタイプと、ポジションの可能性がわかります。
        </p>
      </section>

      <HomeActions />

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["15", "問からOK"],
          ["16", "プレースタイル"],
          ["11", "ポジション"],
        ].map(([n, l]) => (
          <div key={l} className="rounded-2xl border border-navy-700 bg-navy-900/70 px-2 py-4">
            <div className="text-3xl font-black text-accent">{n}</div>
            <div className="text-xs text-ink-muted">{l}</div>
          </div>
        ))}
      </div>

      <Card>
        <p className="text-xs font-bold tracking-[0.2em] text-accent">FOOTBALL DNA NUTRITION</p>
        <h2 className="mb-2 mt-1 text-lg font-bold">食事ガイド</h2>
        <p className="text-sm text-ink-muted">年代と練習の状況に合わせた、食事の考え方と献立の例。診断していなくても見られます。</p>
        <Link href="/nutrition" className="mt-3 inline-flex min-h-11 items-center font-bold text-accent underline underline-offset-2 hover:text-accent-strong">
          食事ガイドを見る
        </Link>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">8つのプレー志向</h2>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {AXES.map((a) => (
            <li key={a.id} className="rounded-lg bg-navy-800 px-3 py-2">
              {a.label}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">16のプレースタイル</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {TYPE_CONFIG.types.map((t) => (
            <li key={t.id} className="rounded-full border border-navy-600 px-3 py-1 text-ink-muted">
              {t.name}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="text-sm leading-relaxed text-ink-muted">
        <h2 className="mb-2 text-base font-bold text-ink">はじめる前に</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>所要時間は5〜10分ほど。ログインは不要です。</li>
          <li>名前や生年月日は聞きません。回答はこの端末のブラウザにだけ保存されます。</li>
          <li>結果は「いまの自分のプレーの好み」を知るためのものです。うまい・へたや、選手の選抜を決めるものではありません。</li>
          <li>小学生のみなさんは、おうちの人や指導者の人といっしょに取り組んでください。</li>
          <li>
            点数の出し方は{" "}
            <Link href="/about#scoring" className="underline underline-offset-2 hover:text-ink">
              採点のしくみ
            </Link>
            で公開しています。
          </li>
        </ul>
      </Card>

      {isSupabaseConfigured() && (
        <Card className="text-sm leading-relaxed text-ink-muted">
          <h2 className="mb-2 text-base font-bold text-ink">指導者の方へ</h2>
          <p>
            チームで診断結果を話し合いに使う「チーム機能」があります。指導者の方のログインが必要です。選手の結果は、本人（18歳未満は保護者も）が同意したときだけ指導者に表示されます。
          </p>
          <p className="mt-2">
            <Link href="/teams" className="font-bold text-accent underline underline-offset-2 hover:text-accent-strong">
              チーム機能を使う（ログイン）
            </Link>
          </p>
        </Card>
      )}
    </div>
  );
}
