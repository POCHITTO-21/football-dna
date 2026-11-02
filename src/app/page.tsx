import { Card } from "@/components/ui/card";
import { HomeActions } from "@/components/home-actions";
import { AXES, TYPE_CONFIG } from "@/lib/scoring/config";

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
          40問の質問に答えると、16のプレースタイルから
          <br className="hidden sm:inline" />
          あなたに近いタイプと、ポジションの可能性がわかります。
        </p>
      </section>

      <HomeActions />

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["40", "問の質問"],
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
        </ul>
      </Card>
    </div>
  );
}
