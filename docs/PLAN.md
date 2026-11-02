# FOOTBALL DNA 実装計画

仕様書「FOOTBALL_DNA_Claude_Code_仕様書.md」を唯一の製品仕様とした実装計画です。
各Phaseの状態は本書末尾の「進捗」に記録します（未実装のものを完成扱いしません）。

## 1. 方針

- **Phase 1 はゲスト完結・外部APIキー不要。** 回答と結果はブラウザの localStorage のみに保存し、サーバーへは送らない。
- **採点は純粋関数**（`src/lib/scoring/`）。ブラウザAPI・日時・乱数に依存しないため、Phase 2 のサーバー側（Route Handler / Server Action）でも同じ関数を使う。
- **設問・タイプ・ポジションはデータファイル**（`src/data/*.json`）。読み込み時に Zod で検証し、重み・名称はテストで固定。画面コンポーネントに質問文や重みを書かない。
- **Supabase は Phase 2 から**。環境変数が無い場合は Phase 1 機能だけで動くように、保存処理は `src/lib/storage.ts` に集約し、後でリポジトリ層を差し替える。

## 2. 技術スタック（Phase 1 時点）

| 項目 | 採用 | 備考 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) + React 19 + TypeScript | |
| スタイル | Tailwind CSS v4 + shadcn/ui 方式のコンポーネント | `src/components/ui/` に cva + tailwind-merge で実装（shadcn CLI 生成と同じ流儀） |
| フォーム | React Hook Form + Zod | 基本情報フォーム |
| グラフ | Recharts（画面）、Canvas（共有画像） | |
| テスト | Vitest（unit）、Playwright（e2e） | |
| 後続 | Supabase (Auth/Postgres/RLS)、Vercel | Phase 2〜4 |

## 3. ファイル構成

```
src/
  app/
    page.tsx                      / ホーム
    diagnosis/profile/page.tsx    基本属性
    diagnosis/questions/page.tsx  40問
    results/[id]/page.tsx         結果
    results/[id]/share/page.tsx   SNS画像
    about/page.tsx                免責・プライバシー・端末データ削除
    （Phase 2+）login, me, settings, teams, teams/[id], teams/[id]/invite, admin/questions
  components/
    ui/                           Button, Card, Progress, ChoiceGroup（choice-fields.tsx）
    profile-form.tsx  questionnaire.tsx  result-view.tsx  share-image.tsx  axis-radar.tsx ...
  data/
    questions.v1.json   40問（通常文・やさしい言い換え）、選択肢、設問セットversion
    types.v1.json       16タイプ（重み・代表ポジション・説明文・練習・指導者向け助言）
    positions.v1.json   11ポジション（重み・留意点・左右）
    axes.json           8軸（名称・説明・成長用練習）
  lib/
    scoring/model.ts    型とZodスキーマ
    scoring/config.ts   データ読込＋検証、SCORING_VERSION
    scoring/score.ts    軸・タイプ・ポジションの純粋関数
    scoring/diagnose.ts 診断全体の純粋関数
    profile.ts          基本情報の選択肢とスキーマ
    storage.ts          localStorage（Phase 2で差し替え）
    share-card.ts       共有画像のデータ生成（純粋関数）と描画
e2e/                    Playwright
docs/PLAN.md            本書
```

## 4. 画面遷移

```
/ ─┬─ 無料で診断をはじめる ─→ /diagnosis/profile ─→ /diagnosis/questions
   │                                                     │ （1問ずつ・戻る・自動途中保存・回答一覧で未回答チェック）
   ├─ 続きから再開する ─────────────────────────────────┘
   │                                                     ↓ 全40問回答で「結果を見る」
   └─ この端末の診断結果 ─────────────────────────→ /results/[id] ─→ /results/[id]/share（画像DL）
                                                          ├─ もう一度診断する → /diagnosis/profile
                                                          └─ 削除 → /
/about（免責・プライバシー・端末データの全削除）は全画面のヘッダー・フッターから
```

Phase 2 以降で追加: `/login` → `/me`（履歴）、`/settings`（共有リンク・データ削除）、`/teams` 系、`/admin/questions`。

## 5. 採点アルゴリズム（`src/lib/scoring`）

1. **入力検証**: 40問すべてが 1〜4 の整数であること。未回答があれば `missing`、範囲外は `invalid` を返し計算しない（ゼロ扱いしない）。
2. **軸スコア**: 各軸5問の合計（生点 5〜20）→ `round((合計-5)/15*100)` で 0〜100。
3. **タイプ得点**: 各タイプの重み付き平均 `Σ(w×軸スコア)/Σw`。
   - **T08 オールラウンダー**: 8軸の単純平均 ＋ ばらつきボーナス。ボーナス = `15 × max(0, 1 − 標準偏差/25)`（標準偏差0で+15、25以上で0）。
   - **T16 ラストガーディアン**: 基本情報で GK の「経験」「希望」「両方」のいずれかを選んだ場合のみ候補。
   - 小数1桁に丸め、上限100。**得点降順、同点はID昇順**で順位決定。
4. **複合タイプ**: 1位と2位の差が3点未満なら「A × B」の補足を表示。8軸の標準偏差が8未満なら「バランス型」の補足も表示。
5. **ポジション適性**: 各ポジションの重み付き平均を 0〜100 に丸める。
   - 利き足が「右/左」のときだけ同じ側のサイドバック（RB/LB）に +2。未入力・両足なら左右は同点（同点時は設定ファイル順）。
   - **GK** は GK経験/希望がなければ `score = null`（評価対象外）でトップ3に入らない。対象時も「参考値」と明記。
   - トップ3に、寄与の大きい2軸を「理由」として、ポジション別の留意点とともに表示。
6. **成長提案**: タイプ別の推奨練習3つ ＋ 相対的に低い2軸の練習。
7. **保存**: 結果に `questionSetVersion` / `typeConfigVersion` / `positionConfigVersion` / `scoringVersion` を含める。結果は作成時のスナップショットを保存し、ロジック更新で過去結果が変わらない。
8. **再現性**: 計算は常に固定の軸順（DRB, PAS, FIN, DEF, TAC, MOB, DUEL, TEAM）で行い、回答オブジェクトのキー順に依存しない。

テスト（`src/lib/scoring/scoring.test.ts`）: 境界値（生点5/12/13/20）、全問1/全問4、欠損、範囲外値、同点時のID順、T08ボーナス、GK除外（タイプ・ポジション）、左右同点と利き足加点、キー順非依存、バージョン付与。

## 6. DBスキーマ（Phase 2 で Supabase マイグレーション化）

仕様12章をベースに、以下を追加・明確化する予定。

```sql
profiles(id uuid pk = auth.uid, display_name text null, age_band text, consent_status text, created_at)
question_sets(id, version text unique, published_at)
questions(id text, question_set_id fk, axis text check in 8軸, text, kids_text, display_order)
diagnosis_sessions(id uuid, user_id uuid null, guest_token_hash text null,
                   question_set_version, scoring_version, status, created_at)
answers(session_id fk, question_id, value smallint check (value between 1 and 4), pk(session_id, question_id))
results(id uuid, session_id fk unique, type_id, axis_scores jsonb, position_scores jsonb,
        type_config_version, position_config_version, created_at)
share_links(id, result_id fk, token_hash text unique, enabled bool default false, expires_at, revoked_at)
teams(id, owner_id, name, created_at)
team_members(id, team_id, user_id, role check in (owner,coach,player,guardian), consent_status, status)
team_invites(id, team_id, code_hash, expires_at, max_uses, uses, revoked_at)
audit_events(id, actor_id, team_id, action, target_id, created_at)
```

RLS 方針: 本人は自分のレコードのみ参照。コーチは「同意済み」かつ「本人が明示的に共有した」チームメンバーの結果のみ。管理者操作はサーバー側（service role はサーバー環境変数のみ）。ゲストは署名付き HttpOnly Cookie で短期保持し、アカウントへの明示的な移行を用意。

## 7. Phase 計画

| Phase | 内容 |
|---|---|
| 1 | セットアップ、デザインシステム、トップ、基本情報、40問診断、途中保存、採点、16タイプ、8軸チャート、11ポジション、練習提案、画像DL（ゲスト完結） |
| 2 | Supabase Auth、マイグレーション、RLS、診断履歴、非公開共有リンク（トークン・有効化・失効）、Web Share API、OGP、個人データ削除 |
| 3 | 指導者・チーム、招待コード（期限・回数・取消）、保護者同意、権限、CSV、監査ログ、少人数集計の非表示（閾値5名） |
| 4 | PWA、i18n 準備、アクセシビリティ改善、E2E 拡充、Vercel 公開手順 |

## 8. 進捗

### Phase 1 — 完了（2026-11-02）
- [x] Next.js / TypeScript / Tailwind セットアップ、ダークネイビー×グリーンのデザインシステム
- [x] トップ（再開ボタン・この端末の結果一覧）
- [x] 基本情報（年代・経験・普段のポジション・GK経験/希望・利き足・任意ニックネーム、「回答しない」あり、RHF+Zod）
- [x] 40問（1問ずつ、4択、戻る/次へ、自動途中保存、再開、回答一覧で未回答チェック、キーボード1〜4、やさしい言い換え表示）
- [x] 採点の純粋関数、16タイプ、複合タイプ表示、11ポジション（GK評価対象外）、成長提案
- [x] 結果画面（レーダーチャート＋数値バー、強み、ヒント、トップ3と理由、練習、指導者向け助言、結果削除）
- [x] SNS画像（1080×1350 / 1200×630、ニックネームは明示的に選んだときのみ）のダウンロード
- [x] 免責・プライバシー・端末データ全削除ページ
- [x] unit 22件、e2e 3件、`npm run build` 成功

### Phase 1 で未対応・既知の制限
- shadcn/ui は CLI ではなく同じ流儀の自前コンポーネント（Radix 依存なし）。
- 結果はその端末のブラウザにのみ保存（別端末では見られない）。共有リンク・Web Share は Phase 2。
- GK専用設問・指導者評価は未実装のため、GKは常に「参考値」扱い。
- エラー監視・レート制限・CSRF対策はサーバー処理が入る Phase 2 で実装。
- プライバシーポリシー・利用規約の正式版は公開前に要作成（法務確認が必要）。

### Phase 2〜4 — 未着手
