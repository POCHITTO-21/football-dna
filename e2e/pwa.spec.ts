import { expect, test } from "@playwright/test";

test("マニフェストとアイコンが配信される", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.lang).toBe("ja");
  for (const icon of manifest.icons) {
    const r = await request.get(icon.src);
    expect(r.ok(), icon.src).toBe(true);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(sw.headers()["cache-control"]).toContain("no-cache");
});

test("Service Worker が診断ページとオフライン画面を保存し、個人用ページは保存しない", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto("/me");
  await page.goto("/teams");
  const cached = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const key of await caches.keys()) {
      if (!key.endsWith("-pages")) continue;
      const cache = await caches.open(key);
      for (const req of await cache.keys()) paths.push(new URL(req.url).pathname);
    }
    return paths.sort();
  });
  expect(cached).toEqual(["/", "/about", "/diagnosis/profile", "/diagnosis/questions", "/offline"]);
  // オフライン時の実際の表示は、端末を機内モードにして手動で確認する（docs/RELEASE_CHECKLIST.md）
});
