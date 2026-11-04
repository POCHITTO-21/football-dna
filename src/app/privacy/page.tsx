import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "プライバシーポリシー" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-2 text-base font-bold">{title}</h2>
      <div className="space-y-2 text-ink-muted">{children}</div>
    </Card>
  );
}

export default function PrivacyPage() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <h1 className="text-2xl font-black">プライバシーポリシー</h1>
      <p className="text-ink-muted">
        {LEGAL.operatorName}（以下「運営者」）は、FOOTBALL DNA（以下「本サービス」）における利用者の情報を、個人情報の保護に関する法律その他の法令にしたがい、以下のとおり取り扱います。
      </p>

      <Section title="1. 集めない情報">
        <p>本サービスでは、氏名・生年月日・学校名・住所・電話番号・顔写真は収集しません。入力しないでください。</p>
      </Section>

      <Section title="2. 取得する情報">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>ログインせずに使う場合：</strong>
            年代・経験年数・ふだんのポジション・GKへの関心・利き足・ニックネーム（任意）・40問の回答と診断結果。これらはお使いの端末のブラウザ（localStorage）にだけ保存され、運営者のサーバーには送信されません。
          </li>
          <li>
            <strong>ログインする場合：</strong>
            メールアドレス（ログイン用）、年代、表示名（任意）、「アカウントに保存」を選んだ回答と診断結果、共有リンクの設定。
          </li>
          <li>
            <strong>チーム機能を使う場合：</strong>
            参加しているチームと役割（指導者・選手など）、参加の承認状況、「指導者に結果を見せる」の設定、保護者との連携と同意の状況、チームでの主な操作の記録（参加・承認・CSV出力・個人結果の閲覧など）。
          </li>
          <li>
            <strong>自動的に記録される情報：</strong>
            サーバーの安全な運用のため、アクセス日時・IPアドレス・ブラウザの種類などがホスティング事業者のログに一時的に記録されます。
          </li>
        </ul>
      </Section>

      <Section title="3. 利用目的">
        <ul className="list-disc space-y-1 pl-5">
          <li>診断を行い、結果を表示・保存するため</li>
          <li>ログイン・本人確認のため（ログイン用リンクのメール送信を含む）</li>
          <li>利用者が選んだ範囲で、共有リンクやチームの指導者・保護者に結果を表示するため</li>
          <li>18歳未満の利用者について、保護者の同意を確認するため</li>
          <li>不正利用の防止、障害対応、お問い合わせへの対応のため</li>
          <li>個人を特定できない形に集計したうえで、本サービスの改善に役立てるため</li>
        </ul>
        <p>広告の配信や、利用者の情報の販売は行いません。</p>
      </Section>

      <Section title="4. 第三者への提供">
        <p>次の場合を除き、利用者の情報を本人の同意なく第三者に提供しません。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>利用者本人が共有リンクを公開した場合（リンクを知っている人が結果を見られます）</li>
          <li>利用者本人が「指導者に結果を見せる」を選んだ場合（18歳未満は保護者の同意も必要です）</li>
          <li>法令にもとづく場合、人の生命・身体・財産の保護のために必要で本人の同意を得ることが難しい場合</li>
        </ul>
      </Section>

      <Section title="5. 外部サービスの利用（外国にある事業者への委託）">
        <p>本サービスは、運営のために次の事業者のサービスを利用し、必要な範囲で情報の取り扱いを委託しています。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase, Inc.（アメリカ合衆国）：データベース・ログイン機能・ログイン用メールの送信</li>
          <li>Vercel Inc.（アメリカ合衆国）：ウェブサイトの配信（ホスティング）</li>
        </ul>
        <p>
          これらの事業者は、個人情報の保護について国際的な基準に沿った安全管理措置をとっています。アメリカ合衆国の個人情報保護制度については、個人情報保護委員会のウェブサイトで情報が公開されています。
        </p>
      </Section>

      <Section title="6. 子どもの利用">
        <ul className="list-disc space-y-1 pl-5">
          <li>小学生など低年齢のお子さまは、保護者・指導者の方といっしょにご利用ください。</li>
          <li>
            18歳未満の方（年代を「回答しない」にした方を含む）は、保護者の確認が済むまで、結果を共有リンクで公開したり指導者に見せたりすることはできません。
          </li>
          <li>保護者の方は、お子さまの共有設定の確認・停止を、保護者用の画面から行えます。</li>
        </ul>
      </Section>

      <Section title="7. 安全管理">
        <ul className="list-disc space-y-1 pl-5">
          <li>通信はすべて暗号化（HTTPS）しています。</li>
          <li>データベースは、本人と、本人が許可した相手しか読めないように権限を設定しています。</li>
          <li>チーム招待コードや保護者確認用のリンクは、元の値をそのまま保存しない方法で管理しています。</li>
        </ul>
      </Section>

      <Section title="8. 保存期間と削除">
        <ul className="list-disc space-y-1 pl-5">
          <li>端末に保存された情報は、「この診断について」ページのボタンで、いつでも削除できます。</li>
          <li>
            アカウントに保存した結果・共有リンクは、
            <Link href="/settings" className="underline underline-offset-2">
              設定画面
            </Link>
            から個別に、またはアカウントごと削除できます。アカウントを削除すると、保存した結果・共有リンク・チームや保護者とのつながりも削除されます。
          </li>
          <li>チームの操作の記録は、アカウント削除後も誰の操作かわからない形で残ることがあります。</li>
          <li>ホスティング事業者のアクセスログは、各事業者の定める期間が過ぎると自動的に削除されます。</li>
        </ul>
      </Section>

      <Section title="9. クッキー・端末への保存">
        <p>
          ログイン状態を保つためのクッキーと、ゲストの診断結果を保存するためのブラウザの保存領域（localStorage）を使います。アクセス解析や広告のためのクッキーは使っていません。
        </p>
      </Section>

      <Section title="10. 開示・訂正・削除などのご請求">
        <p>
          ご自身の情報の開示・訂正・利用停止・削除をご希望の場合は、まず設定画面をご利用ください。画面で対応できない場合は、下記の問い合わせ先までご連絡ください。本人確認のうえ、法令にしたがって対応します。
        </p>
      </Section>

      <Section title="11. 改定">
        <p>このポリシーを変更する場合は、本ページでお知らせします。重要な変更は、サイト上でわかりやすくお知らせします。</p>
      </Section>

      <Section title="12. 運営者・お問い合わせ先">
        <ul className="list-disc space-y-1 pl-5">
          <li>運営者：{LEGAL.operatorName}</li>
          <li>
            お問い合わせ：
            <a href={`mailto:${LEGAL.contactEmail}`} className="underline underline-offset-2">
              {LEGAL.contactEmail}
            </a>
          </li>
        </ul>
      </Section>

      <p className="text-xs text-ink-muted">
        制定：{LEGAL.establishedAt}　最終改定：{LEGAL.updatedAt}
      </p>
      <p className="text-xs">
        <Link href="/terms" className="underline underline-offset-2">
          利用規約
        </Link>
        {" ・ "}
        <Link href="/about" className="underline underline-offset-2">
          この診断について
        </Link>
      </p>
    </div>
  );
}
