import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { completeDiagnosis } from "./helpers";

/** WCAG 2.2 AA 相当のルールで自動チェック（自動で見つけられるのは一部。手動確認も必要） */
async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(summary, `${label} のアクセシビリティ違反`).toEqual([]);
}

test("主要ページにアクセシビリティ違反がない", async ({ page }) => {
  for (const path of ["/", "/diagnosis/profile", "/about", "/offline", "/login", "/teams"]) {
    await page.goto(path);
    await expectNoViolations(page, path);
  }
  await page.goto("/diagnosis/profile");
  await page.getByRole("button", { name: "質問にすすむ" }).click(); // 未入力のエラー表示
  await expectNoViolations(page, "/diagnosis/profile (エラー表示)");
});

test("設問・結果・SNS画像ページにアクセシビリティ違反がない", async ({ page }) => {
  await completeDiagnosis(page);
  await expectNoViolations(page, "結果");
  await page.getByRole("link", { name: "SNS用の画像をつくる" }).click();
  await expect(page.getByRole("img", { name: /共有画像のプレビュー/ })).toBeVisible();
  await expectNoViolations(page, "SNS画像");
  await page.goto("/diagnosis/questions");
  await expectNoViolations(page, "設問");
});

test("キーボードだけで操作できる（本文へスキップ・フォーカス表示）", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "本文へスキップ" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
