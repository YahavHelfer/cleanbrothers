import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createActor, cleanupActors, resetContent, session, type Actor } from "./helpers/content-fixtures";
import { localSql, appOrigin } from "../../scripts/cms-local.mjs";
import { managedServiceKeys, serviceRegistry, type ManagedServiceKey } from "../../src/content/service-registry";
test.setTimeout(120_000);
const published="http://127.0.0.1:56301";
let actor: Actor;
function bootstrap(){execFileSync(process.execPath,["scripts/cms-import-shared-services.mjs"],{stdio:["ignore","pipe","pipe"]});}
function state(key: ManagedServiceKey){return JSON.parse(localSql(`select row_to_json(s) from content_publication_state s where document_id='${serviceRegistry[key].documentId}'`)) as {generation:number;draft_revision_id:string;published_revision_id:string};}
function immutableSnapshot(){return localSql("select jsonb_build_object('documents',(select jsonb_agg(d order by id) from content_documents d),'revisions',(select jsonb_agg(r order by id) from content_revisions r),'refs',(select jsonb_agg(r order by revision_id,usage_role,position) from revision_media_refs r),'events',(select jsonb_agg(e order by id) from content_publication_events e),'states',(select jsonb_agg(s order by document_id) from content_publication_state s),'assets',(select jsonb_agg(a order by id) from media_assets a),'versions',(select jsonb_agg(v order by id) from media_versions v),'mediaAudit',(select jsonb_agg(e order by id) from media_audit_events e))");}
async function snapshot(page: Page,key:ManagedServiceKey,origin:string){
 await page.emulateMedia({ reducedMotion: "reduce" });
 const response=await page.goto(`${origin}/${key}`);expect(response?.status()).toBe(200);await expect(page.locator("main h1")).toBeVisible();await expect(page.locator(`script[id="${key}-faq-jsonld"]`)).toHaveCount(1);
 return page.evaluate((serviceKey)=>({
  text:document.querySelector("main")!.textContent?.replace(/\s+/g," ").trim(),
  links:Array.from(document.querySelectorAll("main a")).map(a=>[a.getAttribute("href"),a.textContent]),
  images:Array.from(document.querySelectorAll("main img")).map(i=>[((src)=>{if(!src)return src;const u=new URL(src,location.origin);return u.origin===location.origin?u.pathname+u.search+u.hash:src;})(i.getAttribute("src")),i.getAttribute("srcset"),i.getAttribute("alt"),Array.from(i.classList).filter(c=>c.startsWith("object-"))]),
  service:(document.querySelector('[name="service"]') as HTMLSelectElement)?.value,
  title:document.title,
  metadata:Array.from(document.querySelectorAll('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]')).map(m=>[m.getAttribute("name")||m.getAttribute("property"),m.getAttribute("content")]),
  canonical:document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
  faq:JSON.parse(document.getElementById(serviceKey+"-faq-jsonld")!.textContent!),
 }),key);
}
test.beforeEach(async({context})=>{
 resetContent();bootstrap();actor=await createActor(true);
 await context.route("**/*",route=>{const u=new URL(route.request().url());return [appOrigin,published].includes(u.origin)&&!u.pathname.startsWith("/api/")?route.continue():route.abort();});
});
test.afterEach(async()=>{await cleanupActors();});

test("generic editor waits for JavaScript before editing or submitting under no-referrer",async({page,context})=>{
 await session(actor,context);
 const key="carpet-cleaning",initial=state(key),before=immutableSnapshot();
 let release!:()=>void;
 const scriptsReady=new Promise<void>(resolve=>{release=resolve;});
 await page.route("**/_next/**/*.js*",async route=>{await scriptsReady;await route.fallback();});
 try {
  const response=await page.goto(`/admin/services/${key}`,{waitUntil:"commit"});
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  const heading=page.getByLabel("כותרת ראשית",{exact:false});
  await expect(heading).toBeVisible();
  await expect(heading).toBeDisabled();
  await expect(page.getByRole("button",{name:"שמירת טיוטה",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"פרסום",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"שחזור כטיוטה חדשה",exact:true})).toBeDisabled();
  expect(immutableSnapshot()).toBe(before);
  release();
  await expect(heading).toBeEnabled();
  await heading.fill("טיוטה אחרי טעינת העורך");
  const [mutation]=await Promise.all([
   page.waitForRequest(request=>request.method()==="POST"&&request.url()===`${appOrigin}/admin/services/${key}`),
   page.getByRole("button",{name:"שמירת טיוטה",exact:true}).click(),
  ]);
  await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 2");
  expect(state(key).published_revision_id).toBe(initial.published_revision_id);
  // Replay a known valid Server Action with hostile origins, retaining the
  // local test session. The server must reject it before any content mutation.
  const afterSave=immutableSnapshot();
  const actionId=await mutation.headerValue("next-action");
  const contentType=await mutation.headerValue("content-type");
  expect(actionId).toBeTruthy();expect(contentType).toBeTruthy();
  for(const origin of ["https://untrusted.invalid","null"]){
   const rejected=await context.request.post(`${appOrigin}/admin/services/${key}`,{
    headers:{origin,"next-action":actionId!,"content-type":contentType!},
    data:mutation.postDataBuffer()!,maxRedirects:0,
   });
   expect(rejected.status()).toBe(500);
   expect(immutableSnapshot()).toBe(afterSave);
  }
  await page.locator(`[data-revision="${initial.draft_revision_id}"]`).getByRole("button",{name:"שחזור כטיוטה חדשה"}).click();
  await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 3");
  await expect(heading).toHaveValue("ניקוי שטיחים מקצועי עד הבית");
 } finally {release();}
});

test("all six imported database baselines render exactly like static public pages; bootstrap preserves all history",async({page,context})=>{
 const before=immutableSnapshot();bootstrap();expect(immutableSnapshot()).toBe(before);
 expect(localSql("select count(*) from content_documents")).toBe("6");
 expect(localSql("select count(*) from media_versions")).toBe("20");
 for(const key of managedServiceKeys){const original=await snapshot(page,key,appOrigin);expect(await snapshot(page,key,published)).toEqual(original);expect(original.service).toBe(serviceRegistry[key].crmName);}
 const client=await session(actor,context);
 for(const key of managedServiceKeys.filter(k=>k!=="sofa-cleaning"&&k!=="mattress-cleaning")){
  const initial=state(key),original=await snapshot(page,key,published);
  const body=JSON.parse(localSql(`select cms_revision_payload(r) from content_revisions r where id='${initial.draft_revision_id}'`));
  body.h1=`טיוטה ממוקדת ${key}`;
  const result=await client.rpc("cms_save_managed_draft",{target_key:key,expected_generation:initial.generation,base_revision:initial.draft_revision_id,payload:body});
  expect(result.error).toBeNull();expect(await snapshot(page,key,published)).toEqual(original);
  await page.goto(`/admin/preview/services/${key}?revision=${result.data}`);await expect(page.locator("main h1")).toHaveText(body.h1);
  expect((await client.rpc("cms_publish_managed_revision",{target_key:key,expected_generation:state(key).generation,revision:result.data})).error).toBeNull();
  expect((await snapshot(page,key,published)).text).toContain(body.h1);
  const restored=await client.rpc("cms_save_managed_draft",{target_key:key,expected_generation:state(key).generation,base_revision:state(key).draft_revision_id,payload:null,restore_revision:initial.draft_revision_id});expect(restored.error).toBeNull();
  expect((await client.rpc("cms_publish_managed_revision",{target_key:key,expected_generation:state(key).generation,revision:restored.data})).error).toBeNull();
  expect(await snapshot(page,key,published)).toEqual(original);
 }
 const authoritative=immutableSnapshot();bootstrap();expect(immutableSnapshot()).toBe(authoritative);
 await page.goto("/admin/media/7828fc91-9bb4-48b5-84ae-045b3051fc5c");
 const usages=page.getByRole("region",{name:"שימושים בתוכן"});
 await expect(usages.locator('a[href^="/admin/preview/services/sofa-cleaning?"]')).not.toHaveCount(0);
 await expect(usages.locator('a[href^="/admin/preview/services/delicate-upholstery-cleaning?"]')).toHaveCount(0);
 await usages.locator('a[href^="/admin/preview/services/sofa-cleaning?"]').first().click();await expect(page.locator("main h1")).toHaveText("ניקוי ספות מקצועי עד הבית");
});

for(const key of ["sofa-cleaning","mattress-cleaning"] as const)test(`${key}: complete generic UI draft/exact Preview/publish/media/history/rollback`,async({page,context})=>{
 const initial=state(key);const other=key==="sofa-cleaning"?"mattress-cleaning":"sofa-cleaning";const otherState=state(other);
 const original=await snapshot(page,key,appOrigin);
 await session(actor,context);
 await page.goto(`/admin/services/${key}`);
 await expect(page).toHaveURL(`${appOrigin}/admin/services/${key}`);
 const heading=page.getByLabel("כותרת ראשית",{exact:false});await heading.fill(`טיוטה פרטית ${key}`);
 // Select an existing immutable library version, without uploading any file.
 await page.getByRole("combobox",{name:"תמונת השירות 1",exact:true}).selectOption({label:"armchair-chair-cleaning.jpeg — גרסה 1"});
 await page.getByRole("button",{name:"שמירת טיוטה",exact:true}).click();
 await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 2");
 const draft=state(key);expect(draft.published_revision_id).toBe(initial.published_revision_id);expect(draft.draft_revision_id).not.toBe(initial.draft_revision_id);expect(state(other)).toEqual(otherState);
 expect(await snapshot(page,key,appOrigin)).toEqual(original);expect(await snapshot(page,key,published)).toEqual(original);
 const response=await page.goto(`/admin/preview/services/${key}?revision=${draft.draft_revision_id}`);
 expect(response?.headers()["cache-control"]).toContain("no-store");
 await expect(page.locator("main h1")).toHaveText(`טיוטה פרטית ${key}`);
 expect(await page.locator('meta[name="robots"]').getAttribute("content")).toMatch(/noindex/);
 await expect(page.locator('a[href^="https://wa.me"],a[href^="tel:"],form[action^="/api/"]')).toHaveCount(0);
 await expect(page.locator('script[src*="googletagmanager"],script[src*="facebook"],script[src*="google-analytics"]')).toHaveCount(0);
 const wrong=await page.goto(`/admin/preview/services/${other}?revision=${draft.draft_revision_id}`);expect(wrong?.status()).toBe(404);
 await page.goto(`/admin/services/${key}`);await page.getByLabel("אני מאשר/ת לפרסם את הגרסה השמורה").check();await page.getByRole("button",{name:"פרסום",exact:true}).click();
 await expect(page.getByLabel("מצב פרסום")).toContainText("פורסם: גרסה 2");
 const after=await snapshot(page,key,published);expect(after.text).toContain(`טיוטה פרטית ${key}`);expect(after.service).toBe(serviceRegistry[key].crmName);expect(state(other)).toEqual(otherState);
 expect(await snapshot(page,key,appOrigin)).toEqual(original);
 await page.goto(`/admin/preview/services/${key}?revision=${initial.draft_revision_id}`);await expect(page.locator("main h1")).not.toHaveText(`טיוטה פרטית ${key}`);
 await page.goto(`/admin/services/${key}`);await page.locator(`[data-revision="${initial.draft_revision_id}"]`).getByRole("button",{name:"שחזור כטיוטה חדשה"}).click();
 await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 3");
 expect(state(key).published_revision_id).toBe(draft.draft_revision_id);expect(state(key).draft_revision_id).not.toBe(initial.draft_revision_id);
 await page.getByLabel("אני מאשר/ת לפרסם את הגרסה השמורה").check();await page.getByRole("button",{name:"פרסום",exact:true}).click();
 await expect(page.getByLabel("מצב פרסום")).toContainText("פורסם: גרסה 3");
 expect(await snapshot(page,key,published)).toEqual(original);expect(state(other)).toEqual(otherState);
 const preserved=immutableSnapshot();bootstrap();expect(immutableSnapshot()).toBe(preserved);
});

test("generic editor keeps stale input; unknown routes, cross-service revisions and AAL1 fail closed",async({page,context})=>{
 await session(actor,context);const second=await context.newPage();
 await page.goto("/admin/services/sofa-cleaning");await second.goto("/admin/services/sofa-cleaning");
 await page.getByLabel("כותרת ראשית",{exact:false}).fill("עריכה ראשונה");await page.getByRole("button",{name:"שמירת טיוטה",exact:true}).click();await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 2");
 await second.getByLabel("כותרת ראשית",{exact:false}).fill("קלט שלא יימחק");await second.getByRole("button",{name:"שמירת טיוטה",exact:true}).click();
 await expect(second.locator("main").getByRole("alert")).toContainText("עורך אחר");await expect(second.getByLabel("כותרת ראשית",{exact:false})).toHaveValue("קלט שלא יימחק");
 for(const key of ["window-cleaning","air-conditioner-cleaning","unknown"]){expect((await page.goto(`/admin/services/${key}`))?.status()).toBe(404);}
 await context.clearCookies();await session(actor,context,false);
 for(const key of managedServiceKeys){await page.goto(`/admin/preview/services/${key}?revision=${state(key).draft_revision_id}`);await expect(page).toHaveURL(/\/admin\/mfa\/challenge/);}
 await second.close();
});
