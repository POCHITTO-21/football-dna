import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeDiagnosis } from "./helpers";

test("未診断でも基本の食事ガイドが見られ、条件を切り替えられる", async ({ page }) => {
  await page.goto("/nutrition");
  await expect(page.getByRole("heading", { name: "食事ガイド", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "無料で診断する" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "水分補給の基本" })).toBeVisible();
  await expect(page.getByText("上の「年代」を選ぶと")).toBeVisible();

  await page.getByLabel("中学生（目安 13〜15歳）").check();
  await expect(page).toHaveURL(/age=junior_high/);
  await expect(page.getByRole("heading", { name: "朝食", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "補食（練習後）" })).toBeVisible();

  // 試合当日：キックオフで並びが変わる
  await page.getByLabel("試合当日").check();
  await expect(page.getByText("キックオフの時間")).toBeVisible();
  await page.getByLabel("午前").check();
  await expect(page.getByRole("heading", { name: "朝食（試合前の食事）" })).toBeVisible();
  await page.getByLabel("夕方").check();
  await expect(page.getByRole("heading", { name: "夕食（試合後）" })).toBeVisible();

  // 料理を開くと食材・目安量・作り方・代替・アレルギー情報が見られる
  await page.getByLabel("休養日").check();
  const first = page.locator("details summary").filter({ hasText: "食材・作り方を見る" }).first();
  await first.click();
  await expect(page.getByRole("heading", { name: "食材と目安量" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "作り方" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "アレルギー情報" }).first()).toBeVisible();

  // 栄養成分の数値は出さない
  await expect(page.locator("main")).not.toContainText(/kcal|キロカロリー/);
});

test("アレルギーで選んだ食材を含む料理は表示しない", async ({ page }) => {
  await page.goto("/nutrition?age=elem_high&activity=regular");
  await page.getByText("食べられない食材をえらぶ（アレルギー）").click();
  for (const a of ["卵", "乳", "小麦"]) await page.getByLabel(a, { exact: true }).check();
  await expect(page.getByText("3つ選択中")).toBeVisible();
  const summaries = page.locator("details summary").filter({ hasText: "食材・作り方を見る" });
  await expect(summaries.first()).toBeVisible();
  for (const text of await summaries.allTextContents()) expect(text).not.toMatch(/含む：.*(卵|乳|小麦)/);
  // 選んだ内容は URL に残さない
  expect(page.url()).not.toMatch(/allerg|egg|milk|wheat/);
});

test("存在しないタイプIDでもエラーにならない", async ({ page }) => {
  await page.goto("/nutrition?type=T99&age=xx&activity=yy");
  await expect(page.getByRole("heading", { name: "食事ガイド", level: 1 })).toBeVisible();
  await expect(page.getByLabel("診断タイプ")).toHaveValue("");
});

test("診断結果から自分のタイプの食事ガイドに移動できる", async ({ page }) => {
  await completeDiagnosis(page);
  const typeName = (await page.locator("h1").first().textContent())?.trim() ?? "";
  await page.getByRole("link", { name: "あなたの食事ガイドを見る" }).click();
  await expect(page).toHaveURL(/\/nutrition\?type=T\d{2}&age=junior_high/);
  await expect(page.getByLabel("診断タイプ").locator("option:checked")).toHaveText(typeName);
  await expect(page.getByText(`${typeName}の練習の特徴`)).toBeVisible();
  await expect(page.getByText("タイプで必要な栄養の量が決まるわけではありません")).toBeVisible();
});

test("食事ガイドにアクセシビリティ違反がなく、横にはみ出さない", async ({ page }) => {
  await page.goto("/nutrition?type=T04&age=high_school&activity=match_day&kickoff=afternoon");
  await page.locator("details summary").filter({ hasText: "食材・作り方を見る" }).first().click();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("note のリンクが未設定のときは有料教材へのボタンを出さない", async ({ page }) => {
  await page.goto("/nutrition");
  await expect(page.getByText("FOOTBALL DNA LABのメンバーシップ（note）")).toBeVisible();
  await expect(page.getByText("月額980円")).toBeVisible();
  await expect(page.getByText("月額2,980円")).toBeVisible();
  await expect(page.getByText("note のメンバーシップは準備中です。")).toBeVisible();
});
