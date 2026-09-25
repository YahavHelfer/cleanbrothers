import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { appOrigin, localSql } from "../../scripts/cms-local.mjs";
import { createActor, cleanupActors, resetContent, session, type Actor } from "./helpers/content-fixtures";

let actor: Actor;
const pageDocument = "c0000000-0000-4000-8000-000000000100";
const promotionDocument = "c0000000-0000-4000-8000-000000000200";
function state(documentId = pageDocument) {
  return JSON.parse(localSql(`select row_to_json(s) from content_publication_state s where document_id='${documentId}'`)) as {
    generation: number; draft_revision_id: string; published_revision_id: string;
  };
}
function history() {
  return localSql(`select jsonb_agg(jsonb_build_object('id',r.id,'number',r.revision_number,'body',r.body) order by r.revision_number)
    from content_revisions r where document_id='${pageDocument}'`);
}
async function readyEditor(page: Page) {
  await page.goto("/admin/pages/about");
  await expect(page.getByRole("button", { name: "שמירת טיוטה" })).toBeEnabled();
}
test.beforeEach(async () => {
  resetContent();
  // The script has a hard local-project guard; no cloud connection or real actor.
  execFileSync(process.execPath, ["scripts/cms-import-about.mjs"], { stdio: "pipe" });
  actor = await createActor(true);
});
test.afterEach(async () => { await cleanupActors(); });

test("local pages list, exact Revision 1 preview and static public /about stay isolated", async ({ page, context, request }) => {
  await session(actor, context);
  await page.goto("/admin/pages");
  await expect(page.getByRole("heading", { name: "ניהול עמודים" })).toBeVisible();
  await expect(page.locator("main")).toContainText("/about");
  await expect(page.locator("main")).toContainText("גרסה 1");
  const original = state();
  const preview = await page.goto(`/admin/preview/pages/about?revision=${original.published_revision_id}`);
  expect(preview?.status()).toBe(200);
  expect(preview?.headers()["cache-control"]).toContain("private, no-store");
  expect(preview?.headers()["x-robots-tag"]).toContain("noindex, nofollow");
  await expect(page.getByRole("heading", { name: "עסק צעיר, רציני ומקצועי שמגיע עד אליכם" })).toBeVisible();
  await expect(page.locator("main")).toContainText("עבודה מסודרת");
  await expect(page.locator("main a[href*='whatsapp']")).toHaveCount(0);
  expect((await page.locator("main").innerHTML())).not.toMatch(/GTM-|gtag\(|fbq\(|connect\.facebook/);
  const publicResponse = await request.get(`${appOrigin}/about`);
  expect(publicResponse.status()).toBe(200);
  const publicHtml = await publicResponse.text();
  expect(publicHtml).toContain("עסק צעיר, רציני ומקצועי שמגיע עד אליכם");
  expect(publicHtml).not.toContain("data-page-revision=");
});

test("page UI adds, reorders and hides a block; draft, preview, publish and rollback preserve history", async ({ page, context, request }) => {
  await session(actor, context);
  const baseline = state();
  await readyEditor(page);
  await page.getByRole("group", { name: "פרטי העמוד ו־SEO" }).getByRole("textbox", { name: "כותרת ראשית" }).fill("כותרת בדיקה מקומית");
  await expect(page.locator("[data-block-id]").first().getByRole("textbox", { name: "כותרת ראשית" })).toHaveValue("כותרת בדיקה מקומית");
  await page.getByRole("radio", { name: /מפריד/ }).check();
  await page.getByRole("button", { name: "הוספת בלוק" }).click();
  const spacer = page.locator("[data-block-id]").last();
  await expect(spacer).toContainText("מפריד");
  await spacer.getByRole("button", { name: /הזז למעלה/ }).click();
  await expect(page.locator("[data-block-id]").nth(1)).toContainText("מפריד");
  const overview = page.locator("[data-block-id]").last();
  await overview.getByRole("button", { name: "הסתר" }).click();
  await page.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(baseline.draft_revision_id);
  const draft = state();
  expect(draft.draft_revision_id).not.toBe(baseline.draft_revision_id);
  expect(draft.published_revision_id).toBe(baseline.published_revision_id);
  const oldPublic = await request.get(`${appOrigin}/about`);
  expect(await oldPublic.text()).not.toContain("data-page-revision=");
  await page.goto(`/admin/preview/pages/about?revision=${draft.draft_revision_id}`);
  await expect(page.locator("main")).not.toContainText("שירות מקצועי בגובה העיניים");
  await readyEditor(page);
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect.poll(() => state().published_revision_id).toBe(draft.draft_revision_id);
  expect(state().published_revision_id).toBe(draft.draft_revision_id);
  await page.reload();
  const baselineCard = page.locator(`[data-revision="${baseline.published_revision_id}"]`);
  await baselineCard.getByRole("button", { name: "שחזור כטיוטה חדשה" }).click();
  const restored = state();
  expect(restored.draft_revision_id).not.toBe(baseline.published_revision_id);
  expect(restored.published_revision_id).toBe(draft.draft_revision_id);
  await page.reload();
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  expect(state().published_revision_id).toBe(restored.draft_revision_id);
  expect(JSON.parse(history())).toHaveLength(3);
  const freshPublic = await request.get(`${appOrigin}/about`);
  expect(await freshPublic.text()).not.toContain("data-page-revision=");
});

test("promotion is a separate revision and page keeps its exact promotion version", async ({ page, context }) => {
  await session(actor, context);
  await page.goto("/admin/pages/about/promotion");
  await expect(page.getByRole("button", { name: "שמירת טיוטה" })).toBeEnabled();
  await page.getByRole("textbox", { name: "תיאור המבצע" }).fill("הצעה מקומית ראשונה");
  await page.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect.poll(() => state(promotionDocument).draft_revision_id).not.toBe(state(promotionDocument).published_revision_id);
  const first = state(promotionDocument).draft_revision_id;
  await page.reload();
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום המבצע" }).click();
  expect(state(promotionDocument).published_revision_id).toBe(first);
  await readyEditor(page);
  await page.getByRole("radio", { name: /מבצע/ }).check();
  await page.getByRole("button", { name: "הוספת בלוק" }).click();
  await page.getByRole("button", { name: "שמירת טיוטה" }).click();
  const pinnedPage = state().draft_revision_id;
  await page.goto(`/admin/preview/pages/about?revision=${pinnedPage}`);
  await expect(page.locator("main")).toContainText("הצעה מקומית ראשונה");
  await readyEditor(page);
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await page.goto("/admin/pages/about/promotion");
  await page.getByRole("textbox", { name: "תיאור המבצע" }).fill("הצעה שנייה מאוחרת");
  await page.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect.poll(() => state(promotionDocument).draft_revision_id).not.toBe(first);
  await page.reload();
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום המבצע" }).click();
  await page.goto(`/admin/preview/pages/about?revision=${pinnedPage}`);
  await expect(page.locator("main")).toContainText("הצעה מקומית ראשונה");
  await expect(page.locator("main")).not.toContainText("הצעה שנייה מאוחרת");
});

test("stale page editor retains input; AAL1 and nonmembers cannot access page preview", async ({ page, context }) => {
  await session(actor, context);
  const second = await context.newPage();
  await readyEditor(page);
  await readyEditor(second);
  await page.getByRole("textbox", { name: "שם העמוד" }).fill("עריכה ראשונה");
  const [mutation] = await Promise.all([
    page.waitForRequest(request => request.method() === "POST" && request.url() === `${appOrigin}/admin/pages/about`),
    page.getByRole("button", { name: "שמירת טיוטה" }).click(),
  ]);
  await expect.poll(() => JSON.parse(history()).length).toBe(2);
  await second.getByRole("textbox", { name: "שם העמוד" }).fill("קלט של עורך שני");
  await second.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect(second.locator("main").getByRole("alert")).toContainText("עורך אחר");
  await expect(second.getByRole("textbox", { name: "שם העמוד" })).toHaveValue("קלט של עורך שני");
  const unchanged = history();
  for (const origin of ["null", "https://untrusted.invalid"]) {
    const result = await context.request.post(`${appOrigin}/admin/pages/about`, { headers: {
      origin, "next-action": (await mutation.headerValue("next-action"))!,
      "content-type": (await mutation.headerValue("content-type"))!,
    }, data: mutation.postDataBuffer()!, maxRedirects: 0 });
    expect(result.status()).toBe(500);
    expect(history()).toBe(unchanged);
  }
  await second.close();
  await context.clearCookies();
  await session(actor, context, false);
  await page.goto(`/admin/preview/pages/about?revision=${state().draft_revision_id}`);
  await expect(page).toHaveURL(/\/admin\/mfa\/challenge/);
  const outsider = await createActor(false);
  await context.clearCookies();
  await session(outsider, context);
  await page.goto("/admin/pages/about");
  await expect(page).toHaveURL(/\/admin\/login\?error=forbidden/);
});
