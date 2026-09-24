import {test,expect,type Page} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {createActor,cleanupActors,resetContent,session,type Actor} from "./helpers/content-fixtures";
import {localSql,appOrigin} from "../../scripts/cms-local.mjs";
import {specialServiceKeys,serviceRegistry,type SpecialServiceKey} from "../../src/content/service-registry";
test.setTimeout(180_000);
const published="http://127.0.0.1:56301";
let actor:Actor;
function bootstrap(){for(const command of ['shared','special'])execFileSync(process.execPath,[`scripts/cms-import-${command}-services.mjs`],{stdio:["ignore","pipe","pipe"]});}
function state(key:SpecialServiceKey){return JSON.parse(localSql(`select row_to_json(s) from content_publication_state s where document_id='${serviceRegistry[key].documentId}'`)) as {generation:number;draft_revision_id:string;published_revision_id:string};}
function otherState(key:SpecialServiceKey){return localSql(`select jsonb_build_object('states',(select jsonb_agg(s order by document_id) from content_publication_state s where document_id<>'${serviceRegistry[key].documentId}'),'revisions',(select jsonb_agg(r order by id) from content_revisions r where document_id<>'${serviceRegistry[key].documentId}'))`);}
function allState(){return localSql("select jsonb_build_object('revisions',(select jsonb_agg(r order by id) from content_revisions r),'refs',(select jsonb_agg(r order by revision_id,usage_role,position) from revision_media_refs r),'events',(select jsonb_agg(e order by id) from content_publication_events e),'states',(select jsonb_agg(s order by document_id) from content_publication_state s),'assets',(select jsonb_agg(a order by id) from media_assets a))");}
async function snapshot(page:Page,key:SpecialServiceKey,origin:string){
 await page.emulateMedia({reducedMotion:"reduce"});
 const response=await page.goto(`${origin}/${key}`);expect(response?.status()).toBe(200);await expect(page.locator('main h1')).toBeVisible();
 return page.evaluate(()=>({text:document.querySelector('main')!.textContent?.replace(/\s+/g,' ').trim(),links:[...document.querySelectorAll('main a')].map(a=>[a.getAttribute('href'),a.textContent]),images:[...document.querySelectorAll('main img')].map(i=>[((src)=>{if(!src)return src;const u=new URL(src,location.origin);return u.origin===location.origin?u.pathname+u.search:src;})(i.getAttribute('src')),i.getAttribute('alt')]),service:(document.querySelector('[name="service"]') as HTMLSelectElement)?.value,title:document.title,metadata:[...document.querySelectorAll('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]')].map(m=>[m.getAttribute('name')||m.getAttribute('property'),m.getAttribute('content')]),canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href'),jsonld:[...document.querySelectorAll('main script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent!))}));
}
test.beforeEach(async({context})=>{resetContent();bootstrap();actor=await createActor(true);await context.route('**/*',route=>{const u=new URL(route.request().url());return [appOrigin,published].includes(u.origin)&&!u.pathname.startsWith('/api/')?route.continue():route.abort();});});
test.afterEach(async()=>{await cleanupActors();});
for(const key of specialServiceKeys)test(`${key}: actual UI lifecycle, exact revision, SEO, media history, fresh publish and rollback`,async({page,context})=>{
 const initial=state(key),others=otherState(key),before=allState();bootstrap();expect(allState()).toBe(before);
 expect(localSql('select count(*) from content_documents')).toBe('8');expect(localSql('select count(*) from media_versions')).toBe('23');
 const original=await snapshot(page,key,appOrigin);expect(await snapshot(page,key,published)).toEqual(original);
 await session(actor,context);await page.goto(`/admin/services/${key}`);
 const heading=page.getByRole('textbox',{name:'כותרת ראשית',exact:true});await expect(heading).toBeEnabled();await heading.fill(`טיוטה מיוחדת ${key}`);
 await page.getByRole('textbox',{name:'כותרת SEO',exact:true}).fill(`SEO טיוטה ${key}`);
 if(key==='window-cleaning')await page.getByRole('button',{name:'הוספת פריט — תמונות ראש העמוד',exact:true}).click();
 const hero=page.getByRole('group',{name:'תמונות ראש העמוד',exact:true});
 await hero.getByRole('combobox').first().selectOption({label:'armchair-chair-cleaning.jpeg — גרסה 1'});
 await hero.getByRole('textbox',{name:'תיאור חלופי',exact:true}).first().fill('תמונת בדיקה מקומית');
 await page.getByRole('button',{name:'שמירת טיוטה',exact:true}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('טיוטה: גרסה 2');
 const draft=state(key);expect(draft.published_revision_id).toBe(initial.published_revision_id);expect(otherState(key)).toBe(others);
 expect(await snapshot(page,key,published)).toEqual(original);expect(await snapshot(page,key,appOrigin)).toEqual(original);
 const response=await page.goto(`/admin/preview/services/${key}?revision=${draft.draft_revision_id}`);
 expect(response?.headers()['cache-control']).toContain('no-store');expect(response?.headers()['cache-control']).toContain('private');
 await expect(page.locator('main h1')).toHaveText(`טיוטה מיוחדת ${key}`);
 expect(await page.locator('meta[name="robots"]').getAttribute('content')).toMatch(/noindex, nofollow/);
 await expect(page.locator('main form,a[href^="/api/whatsapp"],a[href^="tel:"],script[src*="googletagmanager"],script[src*="facebook"]')).toHaveCount(0);
 await expect(page.locator('main img').first()).toHaveAttribute('alt',/תמונת בדיקה מקומית/);
 const other=key==='window-cleaning'?'air-conditioner-cleaning':'window-cleaning';expect((await page.goto(`/admin/preview/services/${other}?revision=${draft.draft_revision_id}`))?.status()).toBe(404);
 await page.goto(`/admin/services/${key}`);await page.getByLabel('אני מאשר/ת לפרסם את הגרסה השמורה').check();await page.getByRole('button',{name:'פרסום',exact:true}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('פורסם: גרסה 2');
 const changed=await snapshot(page,key,published);expect(changed.text).toContain(`טיוטה מיוחדת ${key}`);expect(changed.title).toContain(`SEO טיוטה ${key}`);expect(changed.service).toBe(serviceRegistry[key].crmName);expect(otherState(key)).toBe(others);
 expect(await snapshot(page,key,appOrigin)).toEqual(original);
 await page.goto(`/admin/preview/services/${key}?revision=${initial.draft_revision_id}`);await expect(page.locator('main h1')).not.toHaveText(`טיוטה מיוחדת ${key}`);await expect(page.locator('img[alt*="תמונת בדיקה מקומית"]')).toHaveCount(0);
 await page.goto(`/admin/services/${key}`);await page.locator(`[data-revision="${initial.draft_revision_id}"]`).getByRole('button',{name:'שחזור כטיוטה חדשה'}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('טיוטה: גרסה 3');
 expect(state(key).published_revision_id).toBe(draft.draft_revision_id);
 await page.getByLabel('אני מאשר/ת לפרסם את הגרסה השמורה').check();await page.getByRole('button',{name:'פרסום',exact:true}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('פורסם: גרסה 3');
 expect(await snapshot(page,key,published)).toEqual(original);expect(otherState(key)).toBe(others);
 const authoritative=allState();bootstrap();expect(allState()).toBe(authoritative);
});
for(const key of specialServiceKeys)test(`${key}: stale editors retain Hebrew conflict/input; server rejects bad Origin`,async({page,context})=>{
 await session(actor,context);const second=await context.newPage();await page.goto(`/admin/services/${key}`);await second.goto(`/admin/services/${key}`);
 await page.getByRole('textbox',{name:'כותרת ראשית',exact:true}).fill('עריכה ראשונה');
 const [mutation]=await Promise.all([page.waitForRequest(r=>r.method()==='POST'&&r.url()===`${appOrigin}/admin/services/${key}`),page.getByRole('button',{name:'שמירת טיוטה',exact:true}).click()]);
 await expect(page.getByLabel('מצב פרסום')).toContainText('טיוטה: גרסה 2');
 await second.getByRole('textbox',{name:'כותרת ראשית',exact:true}).fill('קלט נשמר אצל העורך השני');await second.getByRole('button',{name:'שמירת טיוטה',exact:true}).click();await expect(second.locator('main').getByRole('alert')).toContainText('עורך אחר');await expect(second.getByRole('textbox',{name:'כותרת ראשית',exact:true})).toHaveValue('קלט נשמר אצל העורך השני');
 const saved=allState();for(const origin of ['null','https://untrusted.invalid']){const result=await context.request.post(`${appOrigin}/admin/services/${key}`,{headers:{origin,'next-action':(await mutation.headerValue('next-action'))!,'content-type':(await mutation.headerValue('content-type'))!},data:mutation.postDataBuffer()!,maxRedirects:0});expect(result.status()).toBe(500);expect(allState()).toBe(saved);}
 await second.close();
});
test('special private previews deny AAL1/nonmember and all eight services share the admin list',async({page,context})=>{
 await session(actor,context);await page.goto('/admin/services');await expect(page.locator('main article')).toHaveCount(8);
 await context.clearCookies();await session(actor,context,false);for(const key of specialServiceKeys){await page.goto(`/admin/preview/services/${key}?revision=${state(key).draft_revision_id}`);await expect(page).toHaveURL(/\/admin\/mfa\/challenge/);}
 const outsider=await createActor(false);await context.clearCookies();await session(outsider,context);for(const key of specialServiceKeys){await page.goto(`/admin/services/${key}`);await expect(page).toHaveURL(/\/admin\/login\?error=forbidden/);}
});
test('AC promotion edits synchronize page and private preview without tracking and preserve code-controlled popup timing',async({page,context})=>{
 await session(actor,context);await page.goto('/admin/services/air-conditioner-cleaning');
 await page.getByLabel('מחיר מבצע התחלתי בש״ח',{exact:true}).fill('219');await page.getByRole('textbox',{name:'תווית המבצע בחלונית',exact:true}).fill('הצעה מקומית לבדיקה');
 await page.getByRole('button',{name:'שמירת טיוטה',exact:true}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('טיוטה: גרסה 2');
 const draft=state('air-conditioner-cleaning');await page.goto(`/admin/preview/services/air-conditioner-cleaning?revision=${draft.draft_revision_id}`);
 await expect(page.getByLabel('תצוגת המבצע')).toContainText('219');await expect(page.getByLabel('תצוגת המבצע')).toContainText('הצעה מקומית לבדיקה');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('main a[href^="/api/"]')).toHaveCount(0);
 await page.goto('/admin/services/air-conditioner-cleaning');await page.getByLabel('הצגת המבצע',{exact:true}).uncheck();await page.getByRole('button',{name:'שמירת טיוטה',exact:true}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('טיוטה: גרסה 3');
 await page.goto(`/admin/preview/services/air-conditioner-cleaning?revision=${state('air-conditioner-cleaning').draft_revision_id}`);await expect(page.getByLabel('תצוגת המבצע')).toHaveCount(0);await expect(page.locator('main')).not.toContainText('219');
 // Public baseline popup still opens after its original code-controlled delay.
 await page.goto('/air-conditioner-cleaning');const popup=page.locator('[aria-labelledby="summer-ac-promotion-title"]');await expect(popup).toBeVisible({timeout:15_000});await expect(popup).toContainText('199');await expect(popup).toContainText('250');await page.getByRole('button',{name:'סגירת מבצע הקיץ'}).click();
});
test('both special editors block all mutations until hydration even with no-referrer',async({page,context})=>{
 await session(actor,context);
 for(const key of specialServiceKeys){
  const before=allState();let release!:()=>void;const scripts=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/_next/**/*.js*',async route=>{await scripts;await route.fallback();});
  try{
   await page.goto(`/admin/services/${key}`,{waitUntil:'commit'});
   await expect(page.getByRole('textbox',{name:'כותרת ראשית',exact:true})).toBeDisabled();
   await expect(page.getByRole('button',{name:'שמירת טיוטה',exact:true})).toBeDisabled();
   await expect(page.getByRole('button',{name:'פרסום',exact:true})).toBeDisabled();expect(allState()).toBe(before);
   release();await expect(page.getByRole('textbox',{name:'כותרת ראשית',exact:true})).toBeEnabled();
  }finally{release();await page.unroute('**/_next/**/*.js*');}
 }
});
test('uploaded special-page media bypasses public image optimization; replacement never rewrites exact historical versions',async({page,context})=>{
 await session(actor,context);
 const {readFileSync}=await import('node:fs');
 const upload=async(file:string,asset?:string)=>{
  const response=await context.request.post('/admin/media/upload',{headers:{origin:appOrigin},multipart:{file:{name:file,mimeType:file.endsWith('.JPG')?'image/jpeg':'image/png',buffer:readFileSync(`public/images/services/${file}`)},altText:'צילום מזגן קיים לבדיקה מקומית',...(asset?{asset,generation:'1'}:{})}});
  expect(response.status()).toBe(201);return (await response.json()).id as string;
 };
 const asset=await upload('Air-conditioner-cleaning4.JPG');expect(asset).toMatch(/^[a-f0-9-]{36}$/);
 const version=()=>localSql(`select current_version_id from media_assets where id='${asset}'`);
 const v1=version(),initial=Object.fromEntries(specialServiceKeys.map(key=>[key,state(key)]));
 for(const key of specialServiceKeys){
  await page.goto(`/admin/services/${key}`);
  if(key==='window-cleaning')await page.getByRole('button',{name:'הוספת פריט — תמונות ראש העמוד',exact:true}).click();
  const group=page.getByRole('group',{name:key==='window-cleaning'?'תמונות ראש העמוד':'גלריה',exact:true});
  await group.getByRole('combobox').first().selectOption(v1);await group.getByRole('textbox',{name:'תיאור חלופי',exact:true}).first().fill('מדיה מקומית מאומתת');
  await page.getByRole('button',{name:'שמירת טיוטה',exact:true}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('טיוטה: גרסה 2');
 }
 // Reuse the approved JPEG bytes: the existing upload validator rejects both legacy PNGs.
 // A new immutable version ID still must never replace the version bound to a revision.
 await upload('Air-conditioner-cleaning4.JPG',asset);expect(version()).not.toBe(v1);
 for(const key of specialServiceKeys){
  await page.goto(`/admin/preview/services/${key}?revision=${state(key).draft_revision_id}`);
  const image=page.locator(`img[src="/admin/media/file/${v1}"]`);await expect(image).toHaveCount(1);await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  await expect(page.locator('img[src*="/_next/image?url=%2Fadmin%2Fmedia"]')).toHaveCount(0);
  await page.goto(`/admin/services/${key}`);await page.getByLabel('אני מאשר/ת לפרסם את הגרסה השמורה').check();await page.getByRole('button',{name:'פרסום',exact:true}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('פורסם: גרסה 2');
  await page.goto(`${published}/${key}`);const publicImage=page.locator(`img[src="/cms-media/${v1}"]`);await expect(publicImage).toHaveCount(1);await publicImage.scrollIntoViewIfNeeded();await expect.poll(()=>publicImage.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
  await page.goto(`/admin/services/${key}`);await page.locator(`[data-revision="${initial[key].draft_revision_id}"]`).getByRole('button',{name:'שחזור כטיוטה חדשה'}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('טיוטה: גרסה 3');await page.getByLabel('אני מאשר/ת לפרסם את הגרסה השמורה').check();await page.getByRole('button',{name:'פרסום',exact:true}).click();await expect(page.getByLabel('מצב פרסום')).toContainText('פורסם: גרסה 3');
  await page.goto(`${published}/${key}`);await expect(page.locator(`img[src="/cms-media/${v1}"]`)).toHaveCount(0);
 }
});
