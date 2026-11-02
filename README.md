# FOOTBALL DNA

40問の質問から、サッカーのプレースタイル（16タイプ）、8つのプレー志向、11ポジションの可能性、練習の提案を示す、日本語・モバイルファーストのWebアプリです。

> 診断は自己理解と対話のためのもので、運動能力の測定や選手選抜の判断に使うものではありません。

- 実装計画・採点アルゴリズム・DB設計・進捗: [docs/PLAN.md](docs/PLAN.md)
- 現在の状態: **Phase 1（ゲスト診断）完了**。ログイン・共有リンク・チーム管理（Phase 2〜3）は未実装です。

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

# 本番ビルドの確認
npm run build

# E2Eテスト（初回のみブラウザをインストール）
npx playwright install chromium
npm run e2e
```

E2E は自動で本番ビルドを作り、ポート 3100 でサーバーを起動してスマホ画面サイズでテストします。

## 環境変数

Phase 1 は **環境変数なしで動作** します。Phase 2 以降で Supabase を使う際は、`.env.example` を `.env.local` にコピーして値を設定します。

```powershell
Copy-Item .env.example .env.local
```

| 変数 | 用途 | 公開範囲 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL（Phase 2〜） | クライアント可 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（Phase 2〜） | クライアント可（RLS前提） |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理操作（Phase 2〜） | **サーバーのみ。絶対に公開しない** |

秘密鍵をコードやリポジトリに書かないでください。

## デプロイ（Vercel）

1. このリポジトリを GitHub に push する
2. https://vercel.com で「Add New → Project」からリポジトリを選ぶ（Framework: Next.js は自動検出）
3. Phase 1 は環境変数の設定不要。そのまま「Deploy」
4. Phase 2 以降は Vercel の「Settings → Environment Variables」に上表の値を登録する

詳細な公開前チェック（プライバシーポリシー、保護者同意、権限・漏洩テストなど）は Phase 4 で手順化します。

## 主なディレクトリ

| パス | 内容 |
|---|---|
| `src/data/` | 設問40件・16タイプ・11ポジション・8軸の定義（JSON） |
| `src/lib/scoring/` | 採点の純粋関数とテスト |
| `src/lib/storage.ts` | ゲスト用のローカル保存（localStorage） |
| `src/app/` | 画面（App Router） |
| `src/components/` | UI コンポーネント |
| `e2e/` | Playwright テスト |

## データの扱い（Phase 1）

- 氏名・生年月日・学校・住所・顔写真は収集しません。
- 回答と結果はブラウザの localStorage にだけ保存し、サーバーには送信しません。
- `/about` からこの端末のデータをすべて削除できます。
