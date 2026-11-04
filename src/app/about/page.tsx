import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DeleteLocalData } from "@/components/delete-local-data";

export const metadata: Metadata = { title: "この診断について" };

export default function AboutPage() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <h1 className="text-2xl font-black">この診断について</h1>
      <Card>
        <h2 className="mb-2 text-base font-bold">診断の目的と限界</h2>
        <ul className="list-disc space-y-1 pl-5 text-ink-muted">
          <li>FOOTBALL DNA は、40問の自己回答から「プレーの好み・意識している傾向」を整理するツールです。</li>
          <li>運動能力・技術の測定や、科学的に検証された心理検査ではありません。</li>
          <li>結果を選手の選抜・序列づけ・ポジションの固定に使わないでください。</li>
          <li>年齢や性別によって能力を決めつけることはありません。結果はその時の気持ちや経験で変わります。</li>
        </ul>
      </Card>
      <Card>
        <h2 id="scoring" className="mb-2 scroll-mt-20 text-base font-bold">採点のしくみ</h2>
        <p className="mb-2 text-ink-muted">
          採点は決まった計算だけで行い、同じ回答なら必ず同じ結果になります。AIや他の人の回答との比較は使っていません。
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-ink-muted">
          <li>40問は8つのプレー志向に5問ずつ分かれています。回答は4択で、1〜4点です。</li>
          <li>志向ごとに5問の合計（5〜20点）を、0〜100に置きかえます。計算式は「(合計 − 5) ÷ 15 × 100」を四捨五入したものです。</li>
          <li>16のプレースタイルは、それぞれ重視する志向に重みがあり、8つの点数の重み付き平均で点数を出します。</li>
          <li>「オールラウンダー」は8つの点数の平均に、点数のばらつきが小さいほど大きい加点（最大15点）をして決めます。</li>
          <li>GKのタイプとポジションは、プロフィールでGKの経験か希望があると答えたときだけ候補にします。</li>
          <li>いちばん点数が高いタイプが結果になります。同点のときはタイプ番号の小さいほうです。1位と2位の差が3点未満のときは、2つのタイプを合わせて表示します。</li>
          <li>ポジションも同じように重み付き平均で出し、利き足と同じ側のサイドのポジションに2点加えます。</li>
        </ol>
        <p className="mt-2 text-ink-muted">
          点数は自己回答から見た「好み・意識の強さ」の目安です。体力や技術を測ったものではなく、点数の高い・低いで選手の良し悪しは決まりません。
        </p>
      </Card>
      <Card>
        <h2 className="mb-2 text-base font-bold">データの取り扱い（現在のバージョン）</h2>
        <ul className="list-disc space-y-1 pl-5 text-ink-muted">
          <li>名前・生年月日・学校・住所・顔写真は収集しません。</li>
          <li>ログインせずに診断した回答と結果は、お使いの端末のブラウザ（localStorage）にのみ保存され、サーバーには送信されません。</li>
          <li>ログインして「アカウントに保存」を選んだ結果だけがサーバーに保存されます。原則として本人以外は見られず、設定画面からいつでも削除できます。</li>
          <li>共有リンクは本人が「公開する」を選んだときだけ見られるようになり、いつでも失効・削除できます。18歳未満の方（年代を「回答しない」にした方を含む）は保護者の確認が済むまで公開できません。</li>
          <li>共有中の端末では、使い終わったら下のボタンでデータを削除してください。</li>
          <li>チームに参加しても、診断結果は自動では指導者に見えません。選手本人が「指導者に結果を見せる」を選び、18歳未満の選手は保護者も同意した場合だけ、そのチームの指導者に表示されます。いつでもやめられます。</li>
          <li>チームの集計は、結果を共有している選手が5人以上のときだけ表示します。指導者のCSV出力や個人結果の閲覧は、チームの操作の記録に残ります。</li>
          <li>
            年代は自己申告です。くわしくは{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              プライバシーポリシー
            </Link>
            と{" "}
            <Link href="/terms" className="underline underline-offset-2">
              利用規約
            </Link>
            をご覧ください。
          </li>
        </ul>
      </Card>
      <Card>
        <h2 className="mb-2 text-base font-bold">保護者・指導者の方へ</h2>
        <p className="text-ink-muted">
          小学生など低年齢のお子さまは、保護者・指導者の方といっしょにご利用ください。SNSへの画像投稿は保護者の方の確認のうえで行ってください。
        </p>
      </Card>
      <Card>
        <h2 className="mb-2 text-base font-bold">この端末のデータを削除</h2>
        <DeleteLocalData />
      </Card>
    </div>
  );
}
