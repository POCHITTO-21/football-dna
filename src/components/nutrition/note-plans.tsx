import { Card, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { NOTE_LINKS } from "@/lib/note-links";

const PLANS = [
  {
    name: "スタンダード",
    price: "月額980円",
    items: ["7日間献立", "買い物リスト", "詳しいレシピ", "食事チェックリスト", "育成記事"],
  },
  {
    name: "プレミアム",
    price: "月額2,980円",
    items: ["スタンダードの全特典", "献立のくわしいバリエーション", "練習期・試合期の食事計画", "プレミアム限定教材", "一般的な質問への優先回答"],
  },
] as const;

/** 有料教材の本体は note に置き、アプリでは内容の紹介とリンクだけを表示する */
export function NotePlans() {
  const url = NOTE_LINKS.membershipUrl;
  return (
    <Card>
      <CardTitle>もっと詳しく：FOOTBALL DNA LABのメンバーシップ（note）</CardTitle>
      <p className="text-sm leading-relaxed">このページの内容は無料です。1週間分の献立や買い物リストなど、もっと詳しい教材は note のメンバーシップで公開しています。</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {PLANS.map((p) => (
          <section key={p.name} aria-label={`${p.name}プラン`} className="rounded-xl border border-navy-600 bg-navy-800 p-4">
            <h3 className="font-bold">
              {p.name}
              <span className="ml-2 text-accent">{p.price}</span>
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {p.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", block: true, className: "mt-4" })}>
          note でプランを見る（外部サイト）
        </a>
      ) : (
        <p className="mt-4 rounded-xl bg-navy-800 p-3 text-center text-sm text-ink-muted">note のメンバーシップは準備中です。</p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        note は外部サービスです。購入・支払い・解約は note の利用規約にもとづきます。未成年の方は保護者の方と相談してください。このページで選んだ内容が note に送られることはありません。
      </p>
    </Card>
  );
}
