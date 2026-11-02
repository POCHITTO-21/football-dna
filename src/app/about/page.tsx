import type { Metadata } from "next";
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
        <h2 className="mb-2 text-base font-bold">データの取り扱い（現在のバージョン）</h2>
        <ul className="list-disc space-y-1 pl-5 text-ink-muted">
          <li>名前・生年月日・学校・住所・顔写真は収集しません。</li>
          <li>回答と結果は、お使いの端末のブラウザ（localStorage）にのみ保存され、サーバーには送信されません。</li>
          <li>共有中の端末では、使い終わったら下のボタンでデータを削除してください。</li>
          <li>アカウント登録・チーム機能・共有リンクは今後のアップデートで提供予定です。提供開始時にプライバシーポリシーと利用規約を公開します。</li>
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
