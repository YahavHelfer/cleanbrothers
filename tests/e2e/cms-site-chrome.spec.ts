import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { appOrigin, localSql } from "../../scripts/cms-local.mjs";
import { createActor, cleanupActors, resetContent, session, type Actor } from "./helpers/content-fixtures";

let actor: Actor;
const settingsDocument = "c0000000-0000-4000-8000-000000000301";
function state() {
  return JSON.parse(localSql(`select row_to_json(s) from content_publication_state s where document_id='${settingsDocument}'`)) as {
    generation: number; draft_revision_id: string; published_revision_id: string;
  };
}
test.beforeEach(async () => {
  resetContent();
  execFileSync(process.execPath,["scripts/cms-import-site.mjs"],{stdio:"pipe"});
  actor=await createActor(true);
});
test.afterEach(async () => { await cleanupActors(); });

test("global settings UI keeps draft private, previews exact revision, publishes and restores without changing default public site", async ({page,context,request}) => {
  await session(actor,context);
  const baseline=state();
  const publicBaseline=await request.get(`${appOrigin}/`);
  expect(publicBaseline.status()).toBe(200);
  const baselineHtml=await publicBaseline.text();
  await page.goto("/admin/site");
  await expect(page.getByRole("heading",{name:"הגדרות האתר"})).toBeVisible();
  await page.goto("/admin/site/settings");
  await expect(page.getByRole("textbox",{name:"שם העסק לתצוגה"})).toBeVisible();
  await page.getByRole("textbox",{name:"שם העסק לתצוגה"}).fill("CleanBrothers בדיקת טיוטה");
  await expect(page.getByRole("button",{name:"שמירת טיוטה"})).toBeEnabled();
  const [mutation]=await Promise.all([
    page.waitForRequest(request=>request.method()==="POST" && request.url()===`${appOrigin}/admin/site/settings`),
    page.getByRole("button",{name:"שמירת טיוטה"}).click(),
  ]);
  await expect.poll(()=>state().draft_revision_id).not.toBe(baseline.draft_revision_id);
  const draft=state();
  expect(draft.published_revision_id).toBe(baseline.published_revision_id);
  expect(localSql("select public.cms_read_public_site('settings')->'payload'->>'businessName'")).toBe("CleanBrothers");
  const revisionCount=localSql(`select count(*) from content_revisions where document_id='${settingsDocument}'`);
  for (const origin of ["null","https://untrusted.invalid"]) {
    const rejected=await context.request.post(`${appOrigin}/admin/site/settings`,{headers:{
      origin,"next-action":(await mutation.headerValue("next-action"))!,
      "content-type":(await mutation.headerValue("content-type"))!,
    },data:mutation.postDataBuffer()!,maxRedirects:0});
    expect(rejected.status()).toBe(500);
    expect(localSql(`select count(*) from content_revisions where document_id='${settingsDocument}'`)).toBe(revisionCount);
  }
  const exact=await page.goto(`/admin/preview/site/settings?revision=${draft.draft_revision_id}`);
  expect(exact?.headers()["cache-control"]).toContain("private, no-store");
  expect(exact?.headers()["x-robots-tag"]).toContain("noindex, nofollow");
  await expect(page.locator("#admin-content")).toContainText("CleanBrothers בדיקת טיוטה");
  expect((await page.locator("#admin-content").innerHTML())).not.toMatch(/GTM-|gtag\(|fbq\(|connect\.facebook|wa\.me/);
  await page.goto("/admin/site/settings");
  await page.getByRole("checkbox",{name:/מאשר.*לפרסם/}).check();
  await page.getByRole("button",{name:"פרסום",exact:true}).click();
  await expect.poll(()=>state().published_revision_id).toBe(draft.draft_revision_id);
  expect(localSql("select public.cms_read_public_site('settings')->'payload'->>'businessName'")).toBe("CleanBrothers בדיקת טיוטה");
  expect(await (await request.get(`${appOrigin}/`)).text()).toBe(baselineHtml);
  await page.goto("/admin/site/settings");
  await page.getByRole("button",{name:"שחזור כטיוטה חדשה"}).last().click();
  await expect.poll(()=>state().draft_revision_id).not.toBe(draft.draft_revision_id);
  const restored=state();
  expect(restored.draft_revision_id).not.toBe(baseline.published_revision_id);
  expect(restored.published_revision_id).toBe(draft.draft_revision_id);
  await page.goto("/admin/site/settings");
  await page.getByRole("checkbox",{name:/מאשר.*לפרסם/}).check();
  await page.getByRole("button",{name:"פרסום",exact:true}).click();
  await expect.poll(()=>state().published_revision_id).toBe(restored.draft_revision_id);
  expect(localSql("select public.cms_read_public_site('settings')->'payload'->>'businessName'")).toBe("CleanBrothers");
});

test("site editor and exact preview require AAL2 membership",async({page,context})=>{
  await session(actor,context,false);
  await page.goto("/admin/site/settings");
  await expect(page).toHaveURL(/\/admin\/mfa\/(setup|challenge)/);
  await page.goto(`/admin/preview/site/settings?revision=${state().draft_revision_id}`);
  await expect(page).toHaveURL(/\/admin\/mfa\/(setup|challenge)/);
  await context.clearCookies();
  const outsider=await createActor(false);
  await session(outsider,context);
  await page.goto("/admin/site/settings");
  await expect(page).not.toHaveURL(/\/admin\/site\/settings/);
});
