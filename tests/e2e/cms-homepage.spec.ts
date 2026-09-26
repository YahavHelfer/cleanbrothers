import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { appOrigin, localSql } from "../../scripts/cms-local.mjs";
import { cleanupActors, createActor, resetContent, session, type Actor } from "./helpers/content-fixtures";

const homeId = "d4000000-0000-4000-8000-000000000000";
const publishedOrigin = "http://127.0.0.1:56301";
let actor: Actor;
function state() { return JSON.parse(localSql(`select row_to_json(s) from content_publication_state s where document_id='${homeId}'`)) as {
  generation: number; draft_revision_id: string; published_revision_id: string;
}; }
function revisionCount() { return Number(localSql(`select count(*) from content_revisions where document_id='${homeId}'`)); }
function otherState() { return localSql(`select coalesce(jsonb_agg(jsonb_build_object('id',document_id,'generation',generation,
  'draft',draft_revision_id,'published',published_revision_id) order by document_id),'[]'::jsonb)
  from content_publication_state where document_id<>'${homeId}'`); }
test.beforeEach(async () => {
  resetContent();
  execFileSync(process.execPath, ["scripts/cms-import-about.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/cms-import-home.mjs"], { stdio: "pipe" });
  actor = await createActor(true);
});
test.afterEach(async () => { await cleanupActors(); });

test("homepage UI keeps draft private, publishes exact revision and rolls back with AAL2", async ({ page, context, request }) => {
  await session(actor, context);
  const baseline = state(), other = otherState();
  expect(revisionCount()).toBe(1);
  await page.goto("/admin/pages");
  await expect(page.locator("main")).toContainText("דף הבית");
  await page.goto("/admin/pages/home");
  await expect(page.getByRole("heading", { name: "עריכת דף הבית" })).toBeVisible();
  await expect(page.getByRole("button", { name: "שמירת טיוטה" })).toBeEnabled();
  await expect(page.locator("[data-block-id]")).toHaveCount(11);
  await expect(page.locator("[data-block-id]").first()).toContainText("פתיח");

  // A temporary rich-text block, pinned promotion, service reordering, and a
  // safe visibility change exercise the actual hydrated editor controls.
  const type = page.getByRole("group", { name: "הוספת מקטע" }).getByRole("combobox");
  await type.selectOption("richText");
  await page.getByRole("group", { name: "הוספת מקטע" }).getByRole("button", { name: "הוספת מקטע" }).click();
  await expect(page.locator("[data-block-id]")).toHaveCount(12);
  await type.selectOption("promotionBanner");
  await page.getByRole("group", { name: "הוספת מקטע" }).getByRole("button", { name: "הוספת מקטע" }).click();
  await expect(page.locator("[data-block-id]")).toHaveCount(13);
  const trust = page.locator("[data-block-id]").nth(1);
  await trust.getByRole("button", { name: "הסתר" }).click();
  await page.locator("[data-block-id]").nth(2).getByRole("button", { name: "הזז למטה" }).click();
  const services = page.locator("[data-block-id]").filter({ hasText: "שירותים לפי סדר הופעה" });
  await services.getByRole("button", { name: "למטה" }).first().click();
  await page.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(baseline.draft_revision_id);
  const changed = state();
  expect(changed.published_revision_id).toBe(baseline.published_revision_id);
  expect(otherState()).toBe(other);
  const staticHome = await request.get(`${appOrigin}/`);
  expect(staticHome.status()).toBe(200);
  const cmsHomeBefore = await request.get(`${publishedOrigin}/`);
  expect(cmsHomeBefore.status()).toBe(200);
  expect(await cmsHomeBefore.text()).not.toContain("הצעת היכרות");

  const preview = await page.goto(`/admin/preview/pages/home?revision=${changed.draft_revision_id}`);
  expect(preview?.status()).toBe(200);
  expect(preview?.headers()["cache-control"]).toContain("private, no-store");
  expect(preview?.headers()["x-robots-tag"]).toContain("noindex, nofollow");
  await expect(page.locator("main")).toContainText("הצעת היכרות");
  expect(await page.locator("main").innerHTML()).not.toMatch(/\/api\/whatsapp|GTM-|gtag\(|fbq\(/);

  await page.goto("/admin/pages/home");
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect.poll(() => state().published_revision_id).toBe(changed.draft_revision_id);
  const live = await request.get(`${publishedOrigin}/`);
  expect(live.status()).toBe(200);
  expect(await live.text()).toContain("הצעת היכרות");
  expect(otherState()).toBe(other);

  await page.goto("/admin/pages/home");
  await page.getByRole("article").filter({ hasText: "גרסה 1" }).getByRole("button", { name: "שחזור כטיוטה חדשה" }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(changed.draft_revision_id);
  expect(state().published_revision_id).toBe(changed.draft_revision_id);
  await page.goto("/admin/pages/home");
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect.poll(() => state().published_revision_id).toBe(state().draft_revision_id);
  expect(revisionCount()).toBe(3);
  const restored = await request.get(`${publishedOrigin}/`);
  expect(restored.status()).toBe(200);
  expect(await restored.text()).not.toContain("הצעת היכרות");
  expect(otherState()).toBe(other);
});

test("stale homepage editor keeps its input; invalid Origin, AAL1 and nonmembers cannot mutate", async ({ page, context }) => {
  await session(actor, context);
  const second = await context.newPage();
  await page.goto("/admin/pages/home");
  await second.goto("/admin/pages/home");
  await expect(page.getByRole("button", { name: "שמירת טיוטה" })).toBeEnabled();
  await expect(second.getByRole("button", { name: "שמירת טיוטה" })).toBeEnabled();
  await page.getByRole("textbox", { name: "כותרת SEO" }).fill("כותרת ניסוי ראשונה");
  const [mutation] = await Promise.all([
    page.waitForRequest(req => req.method() === "POST" && req.url() === `${appOrigin}/admin/pages/home`),
    page.getByRole("button", { name: "שמירת טיוטה" }).click(),
  ]);
  await expect.poll(revisionCount).toBe(2);
  await second.getByRole("textbox", { name: "כותרת SEO" }).fill("קלט של עורך שני");
  await second.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect(second.locator("main").getByRole("alert")).toContainText("עורך אחר");
  await expect(second.getByRole("textbox", { name: "כותרת SEO" })).toHaveValue("קלט של עורך שני");
  expect(revisionCount()).toBe(2);
  for (const origin of ["null", "https://untrusted.invalid"]) {
    const response = await context.request.post(`${appOrigin}/admin/pages/home`, { headers: {
      origin, "next-action": (await mutation.headerValue("next-action"))!,
      "content-type": (await mutation.headerValue("content-type"))!,
    }, data: mutation.postDataBuffer()!, maxRedirects: 0 });
    expect(response.status()).toBe(500);
    expect(revisionCount()).toBe(2);
  }
  await second.close();
  await context.clearCookies();
  await session(actor, context, false);
  await page.goto(`/admin/preview/pages/home?revision=${state().draft_revision_id}`);
  await expect(page).toHaveURL(/\/admin\/mfa\/challenge/);
  const outsider = await createActor(false);
  await context.clearCookies();
  await session(outsider, context);
  await page.goto("/admin/pages/home");
  await expect(page).toHaveURL(/\/admin\/login\?error=forbidden/);
});
