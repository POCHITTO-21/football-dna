# FOOTBALL DNA

15問のかんたん診断（くわしく知りたい人は40問）から、サッカーのプレースタイル（16タイプ）、8つのプレー志向、11ポジションの可能性、練習の提案を示す、日本語・モバイルファーストのWebアプリです。

> 診断は自己理解と対話のためのもので、運動能力の測定や選手選抜の判断に使うものではありません。

- 実装計画・採点アルゴリズム・DB設計・進捗: [docs/PLAN.md](docs/PLAN.md)
- 現在の状態: **Phase 1〜3 完了、Phase 4（PWA・多言語化の準備・アクセシビリティ・E2E・公開手順）実装済み**。英語版の公開、管理者用の設問管理画面は未実装です。
- Supabase を設定しない場合はゲスト診断だけが動き、ログイン関連のメニューは表示されません。

## 必要なもの

- Node.js LTS（v20 以上、推奨 v22）
- npm（Node.js に同梱）

## 起動手順（Windows 11 / PowerShell）

```powershell
# 1. プロジェクトのフォルダへ移動
cd C:\path\to\football-dna

# 2. 依存パッケージをインストール
npm install

# 3. 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開きます。スマホで確認する場合は、同じWi-Fiにつないだ状態で `http://<PCのIPアドレス>:3000` を開いてください（IPアドレスは PowerShell で `ipconfig` を実行して確認）。

> PowerShell で `npm` 実行時に「スクリプトの実行が無効」と出る場合は、`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` を一度実行してください。

## テスト

```powershell
# ユニットテスト（採点ロジック・共有画像データ）
npm test

# 型チェック・Lint
npm run typecheck
npm run lint

# DB（マイグレーション・RLS）のテスト ※PostgreSQL が必要。下記参照
# npm run test:db

# 本番ビルドの確認
npm run build

# E2Eテスト（初回のみブラウザをインストール）
npx playwright install chromium
npm run e2e
```

E2E は自動で本番ビルドを作り、ポート 3100 でサーバーを起動してスマホ画面サイズでテストします。

## 環境変数

Phase 1（ゲスト診断）は **環境変数なしで動作** します。ログイン・履歴・共有リンク（Phase 2）を使うときは `.env.local` を作ります。

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

| 変数 | 用途 | 公開範囲 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase の Project URL | クライアント可 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon (public) key | クライアント可（RLSで保護） |
| `NEXT_PUBLIC_SITE_URL` | サイトのURL（共有リンク・ログインメールのリンク先） | クライアント可 |

service role key は使いません（設定しないでください）。秘密の値をコードやリポジトリに書かないでください。

## Supabase の準備（Phase 2・3）

1. https://supabase.com で無料アカウントを作り、「New project」でプロジェクトを作成（Region は Tokyo 推奨）。
2. 左メニュー **SQL Editor** で、次の2つのファイルの中身を順に貼り付けて「Run」。
   - `supabase/migrations/20261102000001_phase2_core.sql`（テーブル・RLS・関数）
   - `supabase/seed.sql`（設問40問）
   - `supabase/migrations/20261102000002_phase3_teams.sql`（チーム・招待・保護者同意・監査ログ）
   - すでに Phase 2 まで実行済みの場合は、3つ目だけを実行します。
3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`（公開後は本番URL）
   - Redirect URLs に `http://localhost:3000/auth/callback` を追加（公開後は本番URLの `/auth/callback` も）
4. **Project Settings → API** の Project URL と anon public key を `.env.local` に貼る。
5. `npm run dev` を再起動し、右上の「マイページ」からメールでログインできることを確認。

> Supabase 標準のメール送信は1時間あたりの送信数に制限があります。公開時は Authentication → SMTP Settings で独自のメール送信設定を推奨します。

### DB のテスト（任意）

PostgreSQL 16 があれば、マイグレーションと RLS（他人の結果を読めない、未成年は保護者確認なしで公開共有できない、指導者は同意済みの選手の結果だけ見られる、招待の期限切れ・取り消し等）をローカルで検証できます。

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"
npm run test:db
```

## デプロイ（Netlify・推奨）

Vercel の無料プランは非商用に限られるため、本番は Netlify の無料プランで公開します。手順は [docs/NETLIFY_MIGRATION.md](docs/NETLIFY_MIGRATION.md) を見てください。ビルド設定は `netlify.toml` にあります。

## デプロイ（Vercel・旧手順）

1. https://vercel.com に GitHub アカウントでログイン（Hobby プランは無料）
2. 「Add New… → Project」→ `football-dna` リポジトリの「Import」
3. 「Environment Variables」に次の3つを入れる（ゲスト診断だけなら不要）
   - `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`：`.env.local` と同じ値
   - `NEXT_PUBLIC_SITE_URL`：いったん空のままでOK（公開URLが決まったら設定して再デプロイ）
4. 「Deploy」。数分で `https://（プロジェクト名）.vercel.app` が発行される
5. Vercel の Settings → Environment Variables で `NEXT_PUBLIC_SITE_URL` を発行されたURL（末尾スラッシュなし）にして、Deployments から「Redeploy」
6. Supabase の Authentication → URL Configuration で Site URL を本番URLにし、Redirect URLs に `https://（本番URL）/auth/callback` を追加
7. 以後は GitHub の main にマージするたびに自動で公開される

一般公開の前に [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)（プライバシーポリシー、メール送信設定、スマホでの確認、権限テストなど）を確認してください。

## note の練習メニュー・食事ガイドへのリンク

診断結果の画面に、note（有料メンバーシップ）の記事へのリンクを出せます。`src/data/note-links.json` に URL を書いて main に反映すると、Vercel に自動で出ます。

- `types` の `T01`〜`T16`：タイプ別の記事の URL
- `membershipUrl`：タイプ別の記事がまだないときに出す、メンバーシップのトップの URL
- 両方とも空欄のタイプには、リンクの枠を表示しません
- 使えるのは `https://note.com/` で始まる URL だけです

## 食事ガイド（FOOTBALL DNA NUTRITION）

`/nutrition` で、年代（5区分）× 診断タイプ × 活動状況（通常練習日・高強度練習日・試合前日・試合当日・休養日）に合わせた食事の考え方と献立の例を表示します。診断結果の画面の「あなたの食事ガイドを見る」から、タイプと年代が自動で入ります。

- 献立データ：`src/data/nutrition/dishes.v1.json`（目安量は量の目安で、栄養計算の結果ではありません。栄養成分の数値は載せません）
- テーマ・年代のポイント・水分補給など：`src/data/nutrition/guide.v1.json`
- タイプごとの練習傾向（4グループ）：`src/data/nutrition/type-tendencies.v1.json`
- 出典：`src/data/nutrition/sources.v1.json`（実際に開いて確認した資料だけ。note教材と同じID）
- 選び方のしくみ：`src/lib/nutrition/select.ts`（優先順：アレルギー → 年代 → 活動状況 → タイプの練習傾向 → 調理時間）
- 献立を追加・変更したら `npm test` を実行してください。出典のない献立、アレルゲン表示の漏れ、全組み合わせで献立が出るか、禁止表現などを自動でチェックします。`reviewStatus` が `source_checked` の献立だけが画面に出ます。
- アレルギーの選択は保存しません（URL にも端末にも残りません）。
- note のプラン案内のボタンは、`src/data/note-links.json` の `membershipUrl` を入れると表示されます（空欄のあいだは「準備中」）。

## スマホのホーム画面に追加（PWA）

本番（HTTPS）では、スマホのブラウザから「ホーム画面に追加」するとアプリのように使えます。トップ・診断ページはオフラインでも開け、診断の途中の回答は端末に保存されます。ログインが必要なページはオフラインでは開けません。開発中（`npm run dev`）は Service Worker を登録しません。

## 多言語化（準備のみ）

画面共通の文言は `src/i18n/messages/ja.ts` にあり、英語版 `en.ts` は同じキーを持つことを型とテストで確認しています。英語を公開するときは、ロケールの決め方（URL の `/en` など）を `src/i18n/config.ts` で決め、設問・タイプ説明（`src/data/*.json`）の英語版を追加します。現在は日本語のみ公開しています。

## 主なディレクトリ

| パス | 内容 |
|---|---|
| `src/data/` | 設問40件・16タイプ・11ポジション・8軸の定義（JSON） |
| `src/lib/scoring/` | 採点の純粋関数とテスト |
| `src/lib/storage.ts` | ゲスト用のローカル保存（localStorage） |
| `src/app/actions/account.ts` | ログイン・保存・履歴・共有リンク・削除のサーバー処理 |
| `src/app/actions/teams.ts`, `src/lib/teams/` | チーム・招待・同意・保護者・集計・CSV |
| `supabase/` | マイグレーション、seed、RLSテスト |
| `src/app/` | 画面（App Router） |
| `src/components/` | UI コンポーネント |
| `e2e/` | Playwright テスト（診断・アクセシビリティ・PWA） |
| `src/i18n/` | 画面共通の文言（日本語・英語の準備） |
| `public/sw.js`, `src/app/manifest.ts` | PWA（Service Worker・マニフェスト） |

## データの扱い

- 氏名・生年月日・学校・住所・顔写真は収集しません。
- ゲストの回答と結果はブラウザの localStorage にだけ保存し、サーバーには送信しません。
- ログイン後、本人が「アカウントに保存」を押した結果だけをサーバーに保存します（他人からは RLS で読めません）。
- 共有リンクは作成時は非公開。本人が公開した場合のみ、タイプ名・8軸・ポジション候補（と選んだ場合のニックネーム）が見えます。18歳未満（年代未設定・「回答しない」を含む）は保護者確認が済むまで公開できません。
- チームの指導者に見えるのは、選手本人が「指導者に結果を見せる」を選び、18歳未満は保護者も同意した選手の結果（タイプ・8軸・ポジション候補）だけです。回答内容やプロフィールは見えません。
- チームの集計は共有している選手が5人以上のときだけ表示し、CSV出力・個人結果の閲覧は監査ログに残します。
- `/about` からこの端末のデータをすべて削除できます。
