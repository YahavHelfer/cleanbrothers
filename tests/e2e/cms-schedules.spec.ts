import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { localSql } from "../../scripts/cms-local.mjs";
import { cleanupActors, createActor, resetContent, session, type Actor } from "./helpers/content-fixtures";

let actor: Actor;
test.beforeEach(async () => {
  resetContent();
  execFileSync(process.execPath, ["scripts/cms-import-about.mjs"], { stdio: "pipe" });
  actor = await createActor(true);
});
test.afterEach(async () => { await cleanupActors(); });

test("local schedule Admin creates draft, previews exact revision, schedules and cancels without public activation", async ({ page, context, request }) => {
  await session(actor, context);
  await page.goto("/admin/promotions/schedules");
  await expect(page.getByRole("heading", { name: "מבצעים מתוזמנים" })).toBeVisible();
  const create = page.locator("form").first();
  await create.getByRole("textbox", { name: "שם פנימי" }).fill("מבצע בדיקת תזמון");
  await create.locator('[name="startLocal"]').fill("2030-05-01T12:00");
  await create.locator('[name="endLocal"]').fill("2030-05-01T13:00");
  await create.getByRole("checkbox", { name: "באנר גלובלי" }).check();
  await create.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect.poll(() => localSql("select count(*) from cms_promotion_schedules")).toBe("1");
  expect(localSql("select status from cms_promotion_schedules limit 1")).toBe("draft");
  const publicBefore = await request.get("/");
  expect(await publicBefore.text()).not.toContain("מבצע בדיקת תזמון");
  const scheduleId = localSql("select id from cms_promotion_schedules limit 1");
  const preview = await page.goto(`/admin/preview/promotions/schedules/${scheduleId}`);
  expect(preview?.status()).toBe(200);
  expect(preview?.headers()["cache-control"]).toContain("private, no-store");
  expect(preview?.headers()["x-robots-tag"]).toContain("noindex, nofollow");
  await expect(page.getByRole("heading", { name: "הצעת היכרות" })).toBeVisible();
  expect(await page.locator("main a[href^='tel:'], main a[href*='/api/whatsapp']").count()).toBe(0);
  expect(await page.locator("main").innerHTML()).not.toMatch(/GTM-|gtag\(|fbq\(|connect\.facebook/);
  expect(localSql("select status from cms_promotion_schedules limit 1")).toBe("draft");
  await page.goto("/admin/promotions/schedules");
  const card = page.locator("article").filter({ hasText: "מבצע בדיקת תזמון" });
  await card.getByRole("checkbox", { name: /מאשר/ }).check();
  await card.getByRole("button", { name: "קיבוע ותזמון" }).click();
  await expect.poll(() => localSql("select status from cms_promotion_schedules limit 1")).toBe("scheduled");
  expect(localSql("select count(*) from cms_active_promotion_placements")).toBe("0");
  await page.reload();
  const scheduled = page.locator("article").filter({ hasText: "מבצע בדיקת תזמון" });
  await scheduled.getByRole("checkbox", { name: /מאשר/ }).check();
  await scheduled.getByRole("button", { name: "ביטול תזמון" }).click();
  await expect.poll(() => localSql("select status from cms_promotion_schedules limit 1")).toBe("cancelled");
  expect(localSql("select count(*) from cms_active_promotion_placements")).toBe("0");
  const publicAfter = await request.get("/");
  expect(await publicAfter.text()).not.toContain("מבצע בדיקת תזמון");
});

test("schedule routes reject password-only CMS sessions", async ({ page, context }) => {
  await session(actor, context, false);
  await page.goto("/admin/promotions/schedules");
  await expect(page).toHaveURL(/\/admin\/mfa\/(setup|challenge)/);
  await page.goto("/admin/preview/promotions/schedules/57000000-0000-4000-8000-000000000001");
  await expect(page).toHaveURL(/\/admin\/mfa\/(setup|challenge)/);
});
