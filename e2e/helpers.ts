import { expect, type Page } from "@playwright/test";

export async function fillProfile(page: Page, gk: "GKの経験がある" | "経験も希望もない" = "経験も希望もない") {
  await page.goto("/diagnosis/profile");
  await page.getByLabel("中学生").check();
  await page.getByLabel("1〜3年").check();
  await page.getByLabel("MF（ミッドフィルダー）").check();
  await page.getByLabel(gk).check();
  await page.getByRole("button", { name: "質問にすすむ" }).click();
  await expect(page).toHaveURL(/\/diagnosis\/questions/);
}

/** n 問目（1始まり）にキー入力で回答。自動で次へ進むのを待つ */
export async function answerViaKeyboard(page: Page, values: number[]) {
  for (let i = 0; i < values.length; i++) {
    await expect(page.getByText(new RegExp(`^Q${i + 1}\\.`))).toBeVisible();
    await page.keyboard.press(String(values[i]));
    if (i < 39) await expect(page.getByText(new RegExp(`^Q${i + 2}\\.`))).toBeVisible();
  }
}


/** 40問に答えて結果画面まで進む */
export async function completeDiagnosis(page: Page) {
  await fillProfile(page);
  await answerViaKeyboard(page, Array.from({ length: 40 }, (_, i) => (i % 4) + 1));
  await page.getByRole("button", { name: "結果を見る" }).click();
  await expect(page).toHaveURL(/\/results\/[0-9a-f]{32}$/);
}
