import { expect, test, type APIResponse } from "@playwright/test";
import { appOrigin, localSql } from "../../scripts/cms-local.mjs";
import { createActor, cleanupActors, resetContent, session, type Actor } from "./helpers/content-fixtures";

let actor: Actor;
const publicOrigin = "http://127.0.0.1:56301";
function pageId(slug: string) {
  return localSql(`select i.document_id from public.cms_new_page_identity i where i.current_slug='${slug}'`);
}
function state(id: string) {
  return JSON.parse(localSql(`select row_to_json(s) from public.content_publication_state s where s.document_id='${id}'`)) as {
    generation: number; draft_revision_id: string; published_revision_id: string | null;
  };
}
async function expectUnavailable(response: APIResponse, privateCopy = "עמוד בדיקה") {
  const html = await response.text();
  // The opt-in public build must return a real 404 before Next streams.
  // The default build is disabled and may use Next's streamed soft-404 shell.
  if (response.url().startsWith(publicOrigin)) expect(response.status()).toBe(404);
  else expect([200,404]).toContain(response.status());
  expect(html).not.toContain('data-page-revision=');
  expect(html).not.toContain(privateCopy);
  expect(`${html} ${response.headers()["x-robots-tag"] || ""}`).toMatch(/noindex/i);
}
test.beforeEach(async () => { resetContent(); actor = await createActor(true); });
test.afterEach(async () => { await cleanupActors(); });

test("new page UI keeps drafts private, publishes one route, redirects a changed slug and preserves history", async ({ page, context, request }) => {
  await session(actor,context);
  await page.goto("/admin/pages/new");
  await page.getByRole("textbox",{ name: "שם העמוד" }).fill("עמוד בדיקה");
  await page.getByRole("textbox",{ name: "כתובת העמוד" }).fill("cms-test-page");
  await page.getByRole("combobox",{ name: "תבנית" }).selectOption("standard");
  await page.getByRole("button",{ name: "יצירת טיוטה" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[0-9a-f-]{36}$/);
  const id = pageId("cms-test-page");
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  const initial = state(id);
  expect(initial.published_revision_id).toBeNull();
  await expectUnavailable(await request.get(`${publicOrigin}/cms-test-page`));
  await expectUnavailable(await request.get(`${appOrigin}/cms-test-page`));

  await expect(page.getByRole("button",{ name: "שמירת טיוטה" })).toBeEnabled();
  await page.getByRole("radio",{ name: /מפריד/ }).check();
  await page.getByRole("button",{ name: "הוספת בלוק" }).click();
  await page.locator("[data-block-id]").last().getByRole("button",{ name: /הזז למעלה/ }).click();
  await page.locator("[data-block-id]").nth(1).getByRole("button",{ name: "הסתר" }).click();
  await page.getByRole("button",{ name: "שמירת טיוטה" }).click();
  await expect.poll(() => state(id).draft_revision_id).not.toBe(initial.draft_revision_id);
  const draft = state(id);
  expect(draft.published_revision_id).toBeNull();
  const privatePreview = await page.goto(`/admin/preview/pages/${id}?revision=${draft.draft_revision_id}`);
  expect(privatePreview?.status()).toBe(200);
  expect(privatePreview?.headers()["cache-control"]).toContain("private, no-store");
  expect(privatePreview?.headers()["x-robots-tag"]).toContain("noindex, nofollow");
  await expect(page.locator("main")).toContainText("עמוד בדיקה");
  await page.goto(`/admin/pages/${id}`);
  await expect(page.getByRole("button",{ name: "פרסום", exact: true })).toBeEnabled();
  await page.getByRole("checkbox",{ name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button",{ name: "פרסום", exact: true }).click();
  await expect.poll(() => state(id).published_revision_id).toBe(draft.draft_revision_id);
  const publicPage = await request.get(`${publicOrigin}/cms-test-page`);
  expect(publicPage.status()).toBe(200);
  expect(await publicPage.text()).toContain("עמוד בדיקה");
  await expectUnavailable(await request.get(`${appOrigin}/cms-test-page`));

  await page.goto(`/admin/pages/${id}`);
  await page.getByRole("textbox",{ name: "כתובת העמוד לאחר פרסום" }).fill("cms-test-renamed");
  await page.getByRole("button",{ name: "שמירת טיוטה" }).click();
  await expect.poll(() => state(id).draft_revision_id).not.toBe(draft.draft_revision_id);
  await expectUnavailable(await request.get(`${publicOrigin}/cms-test-renamed`));
  expect((await request.get(`${publicOrigin}/cms-test-page`)).status()).toBe(200);
  await page.goto(`/admin/pages/${id}`);
  await page.getByRole("checkbox",{ name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button",{ name: "פרסום", exact: true }).click();
  await expect.poll(() => localSql(`select current_slug from public.cms_new_page_identity where document_id='${id}'`)).toBe("cms-test-renamed");
  const redirect = await request.get(`${publicOrigin}/cms-test-page?utm_source=pilot`,{ maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toContain("/cms-test-renamed?utm_source=pilot");
  expect((await request.get(`${publicOrigin}/cms-test-renamed`)).status()).toBe(200);

  await page.goto(`/admin/pages/${id}`);
  await page.getByRole("textbox",{ name: "שם העותק" }).fill("עמוד מועתק");
  await page.getByRole("textbox",{ name: "כתובת חדשה" }).fill("cms-test-copy");
  await page.getByRole("button",{ name: "שכפל עמוד" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[0-9a-f-]{36}$/);
  const copyId = pageId("cms-test-copy");
  expect(copyId).not.toBe(id);
  expect(state(copyId).published_revision_id).toBeNull();
  await expectUnavailable(await request.get(`${publicOrigin}/cms-test-copy`), "עמוד מועתק");
  await page.goto(`/admin/pages/${id}`);
  await page.getByRole("checkbox",{ name: "אני מאשר/ת את הפעולה" }).check();
  await page.getByRole("button",{ name: "ביטול פרסום" }).click();
  await expect.poll(() => localSql(`select lifecycle from public.cms_new_page_identity where document_id='${id}'`)).toBe("unpublished");
  await expectUnavailable(await request.get(`${publicOrigin}/cms-test-renamed`));
  await page.goto(`/admin/pages/${id}`);
  await page.getByRole("checkbox",{ name: "אני מאשר/ת את הפעולה" }).check();
  await page.getByRole("button",{ name: "העברה לארכיון" }).click();
  await expect.poll(() => localSql(`select lifecycle from public.cms_new_page_identity where document_id='${id}'`)).toBe("archived");
  await page.goto("/admin/pages");
  await expect(page.locator("main")).not.toContainText("cms-test-renamed");
  await page.goto("/admin/pages?archive=1");
  await expect(page.locator("main")).toContainText("cms-test-renamed");
  await page.goto(`/admin/pages/${id}`);
  await page.getByRole("checkbox",{ name: "אני מאשר/ת את הפעולה" }).check();
  await page.getByRole("button",{ name: "שחזור מהארכיון" }).click();
  await expect.poll(() => localSql(`select lifecycle from public.cms_new_page_identity where document_id='${id}'`)).toBe("unpublished");
  await expectUnavailable(await request.get(`${publicOrigin}/cms-test-renamed`));
  expect(Number(localSql(`select count(*) from public.content_revisions where document_id='${id}'`))).toBeGreaterThan(1);
});
