# Vercel から Netlify への引っ越し手順

Vercel の無料プラン（Hobby）は非商用に限られるため、商用でも無料で使える Netlify に移します。
作業は上から順に1つずつ。途中で止めても、Vercel 側のサイトはそのまま動き続けます。

## 1. Netlify にサイトを作る

1. https://app.netlify.com を開き、「Sign up」→「GitHub」でログイン
2. 「Add new project」→「Import an existing project」→「GitHub」
3. リポジトリ一覧から `football-dna` を選ぶ（出てこない場合は「Configure Netlify on GitHub」で許可）
4. Branch は `main`。ビルド設定は `netlify.toml` から自動で入るので、そのままにする

## 2. 環境変数を入れる

「Environment variables」（または Site configuration → Environment variables）に次を入れる。
値は Vercel の Settings → Environment Variables に入っているものと同じ（Supabase の Project Settings → API でも確認できる）。

| 名前 | 値 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel と同じ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel と同じ |
| `NEXT_PUBLIC_SITE_URL` | 最初は空でOK（手順4で入れる） |

入れたら「Deploy」。数分で `https://（ランダムな名前）.netlify.app` が発行される。

## 3. サイト名を変える（任意）

Site configuration → 「Change site name」で、例えば `football-dna-lab` にすると
`https://football-dna-lab.netlify.app` になる。

## 4. 本番URLを設定して再デプロイ

1. 環境変数 `NEXT_PUBLIC_SITE_URL` に本番URL（末尾スラッシュなし）を入れる
2. Deploys →「Trigger deploy」→「Deploy site」

## 5. Supabase のログイン先を追加

Supabase の Authentication → URL Configuration で
- Site URL を Netlify の本番URLにする
- Redirect URLs に `https://（Netlifyの本番URL）/auth/callback` を追加

## 6. 動作確認

- スマホで診断を最後まで行い、結果が出る
- ログインメールのリンクで Netlify のサイトに戻ってこれる
- 共有リンクを作り、別の端末で開ける

## 7. 切り替え

1. SNS のプロフィール、note の記事、メンバーシップ説明のリンクを Netlify のURLに変える
2. Vercel のプロジェクトを止める（Settings → 一番下の「Delete Project」）。
   古いURLは使えなくなるので、リンクの差し替えが終わってから行う
