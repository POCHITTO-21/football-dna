import { expect, test, type Page } from "@playwright/test";

async function fillProfile(page: Page, gk: "GKの経験がある" | "経験も希望もない" = "経験も希望もない") {
  await page.goto("/diagnosis/profile");
  await page.getByLabel("中学生").check();
  await page.getByLabel("1〜3年").check();
  await page.getByLabel("MF（ミッドフィルダー）").check();
  await page.getByLabel(gk).check();
  await page.getByRole("button", { name: "質問にすすむ" }).click();
  await expect(page).toHaveURL(/\/diagnosis\/questions/);
}

/** n 問目（1始まり）にキー入力で回答。自動で次へ進むのを待つ */
async function answerViaKeyboard(page: Page, values: number[]) {
  for (let i = 0; i < values.length; i++) {
    await expect(page.getByText(new RegExp(`^Q${i + 1}\\.`))).toBeVisible();
    await page.keyboard.press(String(values[i]));
    if (i < 39) await expect(page.getByText(new RegExp(`^Q${i + 2}\\.`))).toBeVisible();
  }
}

test("ゲストで40問に答えて結果を見られる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "無料で診断をはじめる" }).click();
  await fillProfile(page);

  // 守備・判断・協調が高い回答（GK希望なし）
  const pattern = (i: number) => ([3, 4, 6, 7].includes(i % 8) ? 4 : [0, 2].includes(i % 8) ? 1 : 2);
  await answerViaKeyboard(page, Array.from({ length: 40 }, (_, i) => pattern(i)));

  await expect(page.getByRole("heading", { name: "回答の確認" })).toBeVisible();
  await page.getByRole("button", { name: "結果を見る" }).click();
  await expect(page).toHaveURL(/\/results\/[0-9a-f]{32}$/);
  await expect(page.getByText("YOUR FOOTBALL DNA")).toBeVisible();
  await expect(page.getByRole("heading", { name: "ポジションの可能性 トップ3" })).toBeVisible();
  // GK未回答なのでGKは推薦されない
  await expect(page.getByText("評価対象外です")).toBeVisible();
  await expect(page.locator("ol li").filter({ hasText: "ゴールキーパー（GK）" })).toHaveCount(0);

  // 再読み込みしても同じ結果
  const typeName = await page.locator("h1").first().textContent();
  await page.reload();
  await expect(page.locator("h1").first()).toHaveText(typeName ?? "");

  // SNS画像ページ
  await page.getByRole("link", { name: "SNS用の画像をつくる" }).click();
  await expect(page.getByRole("img", { name: /共有画像のプレビュー/ })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "画像をダウンロード" }).click();
  expect((await download).suggestedFilename()).toBe("football-dna-1080x1350.png");
});

test("途中保存・再開・戻る・未回答チェック", async ({ page }) => {
  await fillProfile(page);
  await answerViaKeyboard(page, [4, 3, 2]);
  await expect(page.getByText("回答済み 3 / 40")).toBeVisible();

  // 戻る
  await page.getByRole("button", { name: "← 戻る" }).click();
  await expect(page.getByText(/^Q3\./)).toBeVisible();
  // 前の回答（2=あまりあてはまらない）が選択状態で残っている
  await expect(page.getByRole("button", { name: "あまりあてはまらない", exact: true })).toHaveAttribute("aria-pressed", "true");

  // トップから再開
  await page.goto("/");
  await page.getByRole("link", { name: /続きから再開する（3\/40問）/ }).click();
  await expect(page.getByText("回答済み 3 / 40")).toBeVisible();

  // 未回答があると結果に進めない
  await page.getByRole("button", { name: "回答の一覧" }).click();
  await expect(page.getByText("未回答が 37 問あります")).toBeVisible();
  await expect(page.getByRole("button", { name: "結果を見る" })).toBeDisabled();
});

test("他人の結果IDは表示されない", async ({ page }) => {
  await page.goto("/results/0123456789abcdef0123456789abcdef");
  await expect(page.getByRole("heading", { name: "結果が見つかりません" })).toBeVisible();
});

test("Supabase未設定ではアカウント機能が無効と表示され、ゲスト診断は動く", async ({ page }) => {
  for (const path of ["/login", "/me", "/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "アカウント機能は準備中です" })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "マイページ" })).toHaveCount(0);
  const res = await page.goto("/s/" + "a".repeat(43));
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "このリンクは表示できません" })).toBeVisible();
});
