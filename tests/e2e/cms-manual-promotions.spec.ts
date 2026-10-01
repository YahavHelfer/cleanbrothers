import { expect, test } from "@playwright/test";
import { appOrigin, localSql } from "../../scripts/cms-local.mjs";
import { cleanupActors, createActor, resetContent, session, type Actor } from "./helpers/content-fixtures";

let actor: Actor;
test.beforeEach(async () => { resetContent(); actor = await createActor(true); });
test.afterEach(async () => { await cleanupActors(); });

test("manual popup stays draft-only, previews privately, activates once and disables", async ({ page, context, browser }) => {
  await session(actor, context);
  await page.goto("/admin/promotions");
  await expect(page.getByRole("heading", { name: "מבצעים", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "מבצע חדש" }).click();
  await expect(page.getByRole("heading", { name: /עריכת מבצע/ })).toBeVisible();
  const id = localSql("select id from public.content_documents where content_key like 'campaign-%' limit 1");
  expect(localSql("select count(*) from public.cms_manual_campaign_placements")).toBe("0");
  await page.getByRole("textbox", { name: "כותרת", exact: true }).fill("מבצע בדיקת פופאפ");
  await expect(page.getByRole("button", { name: "שמירת טיוטה" })).toBeEnabled();
  await page.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect.poll(() => localSql(`select max(revision_number) from public.content_revisions where document_id='${id}'`)).toBe("2");
  expect(localSql("select count(*) from public.cms_manual_campaign_placements")).toBe("0");
  const before = await page.request.get("/api/cms/public-promotion?path=%2F");
  expect(await before.json()).toBeNull();
  await page.reload();
  const previewUrl = await page.getByRole("link", { name: "תצוגה מקדימה של פופאפ" }).getAttribute("href");
  expect(previewUrl).toBeTruthy();
  const preview = await page.goto(previewUrl!);
  expect(preview?.headers()["cache-control"]).toContain("private, no-store");
  expect(preview?.headers()["x-robots-tag"]).toContain("noindex, nofollow");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("מבצע בדיקת פופאפ");
  expect(await page.locator("main").innerHTML()).not.toMatch(/GTM-|gtag\(|fbq\(|connect\.facebook/);
  await expect(page.getByRole("dialog").getByRole("link")).toHaveCount(0);
  await page.goto(`/admin/promotions/${id}`);
  await page.getByRole("checkbox", { name: "אישור פרסום/ביטול" }).check();
  await page.getByRole("button", { name: "פרסום והפעלה" }).click();
  await expect.poll(() => localSql("select count(*) from public.cms_manual_campaign_placements")).toBe("1");
  const publicContext = await browser.newContext({ baseURL: appOrigin, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  try {
    const publicPage = await publicContext.newPage();
    await publicPage.goto("/");
    const restoreTarget = publicPage.locator("header a").first();
    await restoreTarget.focus();
    const promotionDialog = publicPage.getByRole("dialog", { name: "מבצע בדיקת פופאפ" });
    await expect(promotionDialog).toBeVisible();
    const y = await publicPage.evaluate(() => window.scrollY);
    await expect(promotionDialog).toContainText("מבצע בדיקת פופאפ");
    expect(await publicPage.evaluate(() => window.scrollY)).toBe(y);
    await publicPage.keyboard.press("Escape");
    await expect(promotionDialog).not.toBeVisible();
    await expect(restoreTarget).toBeFocused();
    await publicPage.reload();
    await expect(promotionDialog).not.toBeVisible();
  } finally { await publicContext.close(); }
  for (const width of [768, 1440]) {
    const responsive = await browser.newContext({ baseURL: appOrigin, viewport: { width, height: 900 } });
    try {
      const view = await responsive.newPage();
      await view.goto("/");
      await expect(view.getByRole("dialog", { name: "מבצע בדיקת פופאפ" })).toBeVisible();
      expect(await view.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await view.keyboard.press("Tab");
      expect(await view.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(true);
    } finally { await responsive.close(); }
  }
  await page.goto(`/admin/promotions/${id}`);
  await page.getByRole("checkbox", { name: "אישור פרסום/ביטול" }).check();
  await page.getByRole("button", { name: "כיבוי המבצע" }).click();
  await expect.poll(() => localSql("select count(*) from public.cms_manual_campaign_placements")).toBe("0");
  const after = await page.request.get("/api/cms/public-promotion?path=%2F");
  expect(await after.json()).toBeNull();
});
