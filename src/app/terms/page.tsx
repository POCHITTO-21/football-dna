import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "利用規約" };

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-2 text-base font-bold">{title}</h2>
      <div className="space-y-2 text-ink-muted">{children}</div>
    </Card>
  );
}

export default function TermsPage() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <h1 className="text-2xl font-black">利用規約</h1>
      <p className="text-ink-muted">
        この利用規約（以下「本規約」）は、{LEGAL.operatorName}（以下「運営者」）が提供する FOOTBALL DNA（以下「本サービス」）の利用条件を定めるものです。本サービスを利用した時点で、本規約に同意したものとみなします。
      </p>

      <Article title="第1条（本サービスの内容）">
        <p>
          本サービスは、40問の自己回答をもとに、サッカーのプレーの好みや意識している傾向を整理して表示する無料のツールです。チームでの共有機能、保護者の同意機能などを含みます。
        </p>
      </Article>

      <Article title="第2条（診断結果の位置づけ）">
        <ul className="list-disc space-y-1 pl-5">
          <li>診断結果は自己回答にもとづく傾向の目安であり、運動能力・技術の測定や、科学的に検証された心理検査ではありません。</li>
          <li>診断結果を、選手の選抜・序列づけ・ポジションの固定・評価などに使わないでください。</li>
          <li>結果はその時の気持ちや経験によって変わります。</li>
        </ul>
      </Article>

      <Article title="第3条（利用者）">
        <ul className="list-disc space-y-1 pl-5">
          <li>18歳未満の方は、保護者の同意を得たうえでご利用ください。小学生など低年齢のお子さまは、保護者・指導者の方といっしょにご利用ください。</li>
          <li>チームの指導者は、選手と保護者の意思を尊重し、本規約とプライバシーポリシーの内容を選手・保護者に伝えたうえで本サービスを使ってください。</li>
        </ul>
      </Article>

      <Article title="第4条（アカウント）">
        <ul className="list-disc space-y-1 pl-5">
          <li>ログインには、ご自身が使っているメールアドレスを使ってください。</li>
          <li>メールアドレスやログイン用リンクは、ご自身の責任で管理してください。他の人に使わせたり、譲ったりしないでください。</li>
        </ul>
      </Article>

      <Article title="第5条（禁止事項）">
        <p>本サービスの利用にあたり、次のことをしてはいけません。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>他の人になりすますこと、他人のメールアドレスで登録すること</li>
          <li>ニックネーム・チーム名などに、氏名・学校名・住所などの個人情報や、他人を傷つける言葉を入れること</li>
          <li>他の利用者の診断結果を、本人（18歳未満の場合は保護者も）の同意なく広めること</li>
          <li>診断結果を理由に、いじめ・差別・不当な扱いをすること</li>
          <li>本サービスに過度な負荷をかけること、不正にアクセスすること、仕組みを解析・改ざんすること</li>
          <li>本サービスを営利目的で無断で利用すること</li>
          <li>法令や公序良俗に反すること</li>
        </ul>
      </Article>

      <Article title="第6条（共有した情報の責任）">
        <p>
          共有リンクの公開、SNSへの画像の投稿、チームの指導者への結果の表示は、利用者が自分の判断で行うものです。公開した情報は、リンクを知っている人が見られる状態になります。不要になったら、設定画面から停止・削除してください。
        </p>
      </Article>

      <Article title="第7条（権利の帰属）">
        <p>
          本サービスの設問・タイプ名・文章・デザインなどの権利は、運営者または正当な権利者に帰属します。ご自身の診断結果の画像を、個人的にSNSで共有することは自由に行えます。
        </p>
      </Article>

      <Article title="第8条（サービスの変更・停止）">
        <p>
          運営者は、事前の予告なく、本サービスの内容を変更したり、提供を一時停止・終了したりすることがあります。終了する場合は、できるだけ事前にサイト上でお知らせします。
        </p>
      </Article>

      <Article title="第9条（利用の制限・アカウントの削除）">
        <p>利用者が本規約に違反した場合、運営者は、事前の通知なく、利用の制限やアカウントの削除を行うことがあります。</p>
      </Article>

      <Article title="第10条（免責）">
        <ul className="list-disc space-y-1 pl-5">
          <li>運営者は、本サービスの正確性・有用性・特定の目的への適合性を保証しません。</li>
          <li>
            運営者は、本サービスの利用によって生じた損害について、運営者に故意または重大な過失がある場合を除き、責任を負いません。ただし、消費者契約法その他の法令により運営者の責任が認められる場合は、この限りではありません。
          </li>
          <li>利用者どうし、または利用者と第三者との間のトラブルは、当事者の間で解決してください。</li>
        </ul>
      </Article>

      <Article title="第11条（個人情報）">
        <p>
          利用者の情報は、
          <Link href="/privacy" className="underline underline-offset-2">
            プライバシーポリシー
          </Link>
          にしたがって取り扱います。
        </p>
      </Article>

      <Article title="第12条（規約の変更）">
        <p>
          運営者は、必要に応じて本規約を変更できます。変更する場合は、変更後の内容と効力が生じる日を本ページでお知らせします。効力が生じた後に本サービスを利用した場合、変更に同意したものとみなします。
        </p>
      </Article>

      <Article title="第13条（準拠法・管轄）">
        <p>本規約は日本の法律にもとづいて解釈されます。本サービスに関する紛争は、運営者の所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
      </Article>

      <Article title="お問い合わせ">
        <ul className="list-disc space-y-1 pl-5">
          <li>運営者：{LEGAL.operatorName}</li>
          <li>
            お問い合わせ：
            <a href={`mailto:${LEGAL.contactEmail}`} className="underline underline-offset-2">
              {LEGAL.contactEmail}
            </a>
          </li>
        </ul>
      </Article>

      <p className="text-xs text-ink-muted">
        制定：{LEGAL.establishedAt}　最終改定：{LEGAL.updatedAt}
      </p>
      <p className="text-xs">
        <Link href="/privacy" className="underline underline-offset-2">
          プライバシーポリシー
        </Link>
        {" ・ "}
        <Link href="/about" className="underline underline-offset-2">
          この診断について
        </Link>
      </p>
    </div>
  );
}
