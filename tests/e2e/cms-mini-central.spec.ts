import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createActor, cleanupActors, resetContent, session } from "./helpers/content-fixtures";
import { appOrigin, localSql } from "../../scripts/cms-local.mjs";

const key = "mini-central-air-conditioner-cleaning";
const published = "http://127.0.0.1:56301";
function bootstrap() {
  for (const script of ["cms-import-shared-services", "cms-import-special-services", "cms-import-home"])
    execFileSync(process.execPath, [`scripts/${script}.mjs`], { stdio: "pipe" });
}
test.setTimeout(120_000);
test("mini-central: responsive page, CMS preview, draft isolation, publish and inquiry identity", async ({ page, context }) => {
  resetContent();
  bootstrap();
  const actor = await createActor(true);
  try {
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(20_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return [appOrigin, published].includes(url.origin) && !url.pathname.startsWith("/api/")
        ? route.continue() : route.abort();
    });
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect((await page.goto(`${published}/${key}`, { waitUntil: "domcontentloaded" }))?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveText("ניקוי מזגן מיני מרכזי");
      await expect(page.locator('[name="service"]')).toHaveValue("ניקוי מזגן מיני מרכזי");
      expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('main a[href="tel:0559577731"]').first()).toBeVisible();
      expect(await page.locator('main a[href^="/api/whatsapp"]').first().getAttribute("href")).toContain(encodeURIComponent("ניקוי מזגן מיני מרכזי"));
      await page.screenshot({ path: `/tmp/cleanbrothers-mini-${width}.png`, fullPage: true });
      await page.locator('main a[href="#contact-form"]').first().click();
      await expect(page.locator('#contact-form')).toBeInViewport();
      await expect(page.locator('script[id="mini-central-air-conditioner-cleaning-faq-jsonld"]')).toHaveCount(1);
    }
    await page.goto(`${published}/services`);
    await page.locator(`[data-service-card="${key}"] a`).click();
    await expect(page).toHaveURL(`${published}/${key}`);
    await session(actor, context);
    await page.goto(`${published}/admin/services/${key}`);
    await page.getByLabel("כותרת ראשית", { exact: false }).fill("ניקוי מיני מרכזי — תוכן שנערך ב-CMS");
    await page.getByLabel("שם השירות לתצוגה", { exact: false }).fill("ניקוי מזגן מיני מרכזי בתיאום");
    await page.getByLabel("כותרת SEO", { exact: false }).fill("מיני מרכזי — כותרת מעודכנת");
    await page.getByLabel("כפתור הצעת מחיר", { exact: false }).fill("בדיקת התאמה דרך האתר");
    await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
    await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 2");
    const previewHref = await page.getByRole("link", { name: "תצוגה מקדימה", exact: true }).first().getAttribute("href");
    await page.goto(published + previewHref);
    await expect(page.locator("main h1")).toHaveText("ניקוי מיני מרכזי — תוכן שנערך ב-CMS");
    await expect(page.locator('main a[href="tel:0559577731"]')).toHaveCount(0);
    await page.goto(`${published}/${key}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1")).toHaveText("ניקוי מזגן מיני מרכזי");
    await page.goto(`${published}/admin/services/${key}`);
    await page.getByLabel("אני מאשר/ת לפרסם את הגרסה השמורה").check();
    await page.getByRole("button", { name: "פרסום", exact: true }).click();
    await expect(page.getByLabel("מצב פרסום")).toContainText("פורסם: גרסה 2");
    await page.goto(`${published}/${key}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1")).toHaveText("ניקוי מיני מרכזי — תוכן שנערך ב-CMS");
    await expect(page).toHaveTitle(/מיני מרכזי — כותרת מעודכנת/);
    await expect(page.locator('main a[href="#contact-form"]').first()).toHaveText("בדיקת התאמה דרך האתר");
    await expect(page.locator('[name="service"]')).toHaveValue("ניקוי מזגן מיני מרכזי");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.cleanbrothers.co.il/${key}`);
    await page.goto(`${published}/services`);
    await expect(page.locator(`[data-service-card="${key}"] h2`)).toHaveText("ניקוי מזגן מיני מרכזי בתיאום");
    const before = localSql("select count(*) from public.content_revisions");
    execFileSync(process.execPath, ["scripts/cms-import-mini-central.mjs"], { stdio: "pipe" });
    expect(localSql("select count(*) from public.content_revisions")).toBe(before);
  } finally {
    await cleanupActors();
    bootstrap();
  }
});
