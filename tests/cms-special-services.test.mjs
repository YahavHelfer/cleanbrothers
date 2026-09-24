import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";
const load=createSourceLoader();
const {acBaseline,windowBaseline}=load("src/cms/content/special-baseline.ts");
const {validateSpecialContent,specialContracts}=load("src/cms/content/special-model.ts");
const {specialStaticMediaInventory:inventory}=load("src/cms/media/special-static-inventory.ts");
const {resolveMediaProjection}=load("src/cms/media/resolve.ts");
const {serviceRegistry}=load("src/content/service-registry.ts");
const local={CMS_SUPABASE_URL:"http://127.0.0.1:56321",CMS_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_local_test",CMS_MEDIA_LOCAL_ENABLED:"1"};
const preview={...local,CMS_MEDIA_LOCAL_ENABLED:"",CMS_MEDIA_PREVIEW_ENABLED:"1",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_PROJECT_ID:"prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",VERCEL_GIT_COMMIT_REF:"feature/cms-cloud-foundation",CMS_SUPABASE_URL:"https://plbwefnwussxlglscfpn.supabase.co"};
const clone=x=>JSON.parse(JSON.stringify(x));
const fixtures={"air-conditioner-cleaning":acBaseline,"window-cleaning":windowBaseline};
function media(content){return Object.entries(content.media).flatMap(([role,items])=>items.map((item,position)=>({provider:"static",media_version_id:item.versionId,usage_role:role,position,alt_text:item.alt,caption:"",width:1000,height:1000})));}
for(const [key,baseline] of Object.entries(fixtures)){
 test(`${key}: typed baseline and resolved CMS render match static output exactly`,()=>{
  const content=validateSpecialContent(key,baseline);
  const Component=load(key==="window-cleaning"?"src/components/WindowCleaningLandingPage.tsx":"src/components/AirConditionerCleaningLandingPage.tsx")[key==="window-cleaning"?"WindowCleaningLandingPage":"AirConditionerCleaningLandingPage"];
  assert.equal(renderToStaticMarkup(Component({content,media:resolveMediaProjection(media(content),"public")})),renderToStaticMarkup(Component({})));
 });
 for(const [name,mutate] of Object.entries({wrongType:p=>p.schemaVersion=key==="window-cleaning"?4:5,crm:p=>p.crmName="bad",route:p=>p.serviceKey="sofa-cleaning",html:p=>p.copy.heroDescription="<script>alert(1)</script>",unknown:p=>p.copy.notAllowed="bad",missing:p=>delete p.copy.heroCta,unsafeMedia:p=>p.media.hero=[{versionId:"https://bad.invalid",alt:"bad"}],promotionInjection:p=>p.promotion={...p.promotion,schedule:"now"},null:p=>p.media=null,unknownRole:p=>p.media.css=[],unsafeSeo:p=>p.seoTitle="<iframe>",bidi:p=>p.h1="x\u202ey"}))test(`${key}: rejects ${name}`,()=>{const p=clone(baseline);mutate(p);assert.throws(()=>validateSpecialContent(key,p));});
 test(`${key}: only explicit local or dedicated Preview gates can activate; every other environment stays static`,async()=>{
  const enabled={...preview,CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:key};
  const invalid=[{VERCEL_ENV:"production"},{VERCEL_ENV:"development"},{VERCEL_ENV:""},{VERCEL:""},{VERCEL_PROJECT_ID:""},{VERCEL_PROJECT_ID:"prj_unrelated"},
   {VERCEL_GIT_COMMIT_REF:"main"},{VERCEL_GIT_COMMIT_REF:"feature/other"},{VERCEL_GIT_COMMIT_REF:""},
   {CMS_SUPABASE_URL:"https://unrelated.supabase.co"},{CMS_SUPABASE_URL:local.CMS_SUPABASE_URL},
   {CMS_SUPABASE_PUBLISHABLE_KEY:""},{CMS_PILOT_CONTENT_SOURCE:""},{CMS_PILOT_CONTENT_SOURCE:"draft"},
   ...["","*",`${key},*`,`${key},${key}`,`${key},unknown-service`,`${key},`,` ${key}`,key==="window-cleaning"?"air-conditioner-cleaning":"window-cleaning"].map(CMS_CONTENT_SERVICE_ALLOWLIST=>({CMS_CONTENT_SERVICE_ALLOWLIST}))];
  for(const env of [{...local},{...local,CMS_CONTENT_ENABLED:"true"},{...local,CMS_PILOT_CONTENT_SOURCE:"published"},{...local,CMS_CONTENT_SERVICE_ALLOWLIST:key},...invalid.map(change=>({...enabled,...change}))]){
   let reads=0;const source=createSourceLoader({env,mocks:{"next/server":{connection:async()=>{}},"@supabase/supabase-js":{createClient:()=>{reads++;throw Error("unexpected external access");}}}})("src/cms/content/public-source.ts");
   assert.equal(source.usesCmsSource(key),false);assert.equal((await source.getPublicSpecialService(key)).revisionId,null);assert.equal(reads,0);
  }
  assert.equal(createSourceLoader({env:{...local,CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:key}})("src/cms/content/environment.ts").usesCmsSource(key),true);
  assert.equal(createSourceLoader({env:enabled})("src/cms/content/environment.ts").usesCmsSource(key),true);
 });
 test(`${key}: source uses one keyed published projection with no privileged key`,async()=>{
  for(const environment of [local,preview]){
  const calls=[];const source=createSourceLoader({env:{...environment,CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:key},mocks:{"next/server":{connection:async()=>{}},"@supabase/supabase-js":{createClient:(url,k,options)=>{assert.equal(url,environment.CMS_SUPABASE_URL);assert.equal(k,environment.CMS_SUPABASE_PUBLISHABLE_KEY);assert.equal(options.auth.persistSession,false);return {rpc:async(name,args)=>{calls.push([name,args]);return {data:{revisionId:"a0000000-0000-4000-8000-000000000001",payload:baseline,media:media(baseline)},error:null}}};}}}})("src/cms/content/public-source.ts");
  assert.deepEqual(plain((await source.getPublicSpecialService(key)).content),plain(baseline));assert.deepEqual(plain(calls),[["cms_read_published_service",{target_key:key}]]);
  }
 });
 test(`${key}: edited visible title never changes CRM identity or canonical`,async()=>{
  const content=clone(baseline);content.publicTitle="שם ערוך";content.h1="כותרת ערוכה";
  const current=createSourceLoader({mocks:{"@/cms/content/public-source":{getPublicSpecialService:async()=>({content})}}});
  const page=current(`src/app/(site)/${key}/page.tsx`);const html=renderToStaticMarkup(await page.default());
  assert.match(html,/כותרת ערוכה/);assert.ok(html.includes(`<option selected="">${serviceRegistry[key].crmName}</option>`));
  assert.ok((await page.generateMetadata()).alternates.canonical.endsWith(`/${key}`));
 });
 test(`${key}: wrong document/revision read cannot leak`,async()=>{
  const filters=[];const query={select(){return this},eq(k,v){filters.push([k,v]);return this},async maybeSingle(){return {data:null}}};
  const repo=createSourceLoader({env:local,mocks:{"@/cms/authorization":{requireCmsAdmin:async()=>({userId:"test"})},"@/cms/server":{createCmsServerClient:async()=>({from:()=>query})}}})("src/cms/content/repository.ts");
  assert.equal(await repo.getServiceRevision(key,"a0000000-0000-4000-8000-000000000001"),null);assert.equal(filters[0][1],serviceRegistry[key].documentId);
 });
}
test("AC Preview stays request-rendered before allowlisting and reads the newly published revision afterward",async()=>{
 const shared="delicate-upholstery-cleaning,sofa-cleaning,mattress-cleaning,carpet-cleaning,car-upholstery-cleaning,armchair-chair-cleaning";
 const env={...preview,CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:shared};
 let connections=0,reads=0;
 const before=createSourceLoader({env,mocks:{"next/server":{connection:async()=>{connections++;}},"@supabase/supabase-js":{createClient:()=>{reads++;throw Error("AC must remain static while disabled");}}}})("src/cms/content/public-source.ts");
 assert.equal((await before.getPublicSpecialService("air-conditioner-cleaning")).revisionId,null);
 assert.equal(reads,0);
 assert.equal(connections,1,"a static Preview build can preserve the old AC page across allowlist redeployment");

 const published=clone(acBaseline);
 published.copy.heroDescription+=" בדיקת פרסום חדשה.";
 const revisionId="a0000000-0000-4000-8000-000000000002";
 const after=createSourceLoader({env:{...env,CMS_CONTENT_SERVICE_ALLOWLIST:`${shared},air-conditioner-cleaning`},mocks:{"next/server":{connection:async()=>{}},"@supabase/supabase-js":{createClient:()=>({rpc:async()=>({data:{revisionId,payload:published,media:media(published)},error:null})})}}})("src/cms/content/public-source.ts");
 const result=await after.getPublicSpecialService("air-conditioner-cleaning");
 assert.equal(result.revisionId,revisionId);
 assert.equal(result.content.copy.heroDescription,published.copy.heroDescription);
 assert.equal((await before.getPublicSpecialService("air-conditioner-cleaning")).content.copy.heroDescription,acBaseline.copy.heroDescription);
});
test("special Preview rollout preserves six shared services and enables only each explicitly selected service",()=>{
 const {sharedServiceKeys,specialServiceKeys}=load("src/content/service-registry.ts");
 const all=[...sharedServiceKeys,...specialServiceKeys];
 for(const allowlist of [[...sharedServiceKeys],[...sharedServiceKeys,"air-conditioner-cleaning"],all,["air-conditioner-cleaning"],["window-cleaning"]]){
  const source=createSourceLoader({env:{...preview,CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:allowlist.join(",")}});
  for(const key of all)assert.equal(source("src/cms/content/environment.ts").usesCmsSource(key),allowlist.includes(key));
  assert.equal(source("src/cms/media/environment.ts").mediaCloudEnabled(),true);
  const disabled=createSourceLoader({env:{...preview,CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:allowlist.join(","),CMS_MEDIA_PREVIEW_ENABLED:""}});
  assert.equal(disabled("src/cms/media/environment.ts").mediaCloudEnabled(),false);
 }
 const automatic=createSourceLoader({env:{...preview,CMS_CONTENT_ENABLED:"true"}});
 for(const key of all)assert.equal(automatic("src/cms/content/environment.ts").usesCmsSource(key),false);
 assert.equal(automatic("src/cms/media/environment.ts").mediaCloudEnabled(),false);
});
test("AC and window cannot accept shared payloads or each other's payload",()=>{
 const {serviceBaseline}=load("src/cms/content/baseline.ts");
 for(const key of Object.keys(fixtures))assert.throws(()=>validateSpecialContent(key,serviceBaseline("sofa-cleaning")));
 assert.throws(()=>validateSpecialContent("air-conditioner-cleaning",windowBaseline));assert.throws(()=>validateSpecialContent("window-cleaning",acBaseline));
});
test("AC image inventory exactly matches approved repo bytes and corrected page baseline",()=>{
 assert.equal(inventory.length,3);for(const i of inventory){assert.ok(existsSync(`public${i.path}`));const b=readFileSync(`public${i.path}`);assert.equal(b.length,i.byteSize);assert.equal(createHash('sha256').update(b).digest('hex'),i.hash);}
 assert.equal(new Set(acBaseline.media.hero.map(i=>i.versionId)).size,3);assert.equal(new Set(acBaseline.media.gallery.map(i=>i.versionId)).size,3);
 assert.equal(acBaseline.media.seo[0].versionId,acBaseline.media.hero[0].versionId);
 assert.equal(windowBaseline.media.hero.length,0);
});
test("AC promotion is bounded structured data, shares prices, and no partial scheduler exists",()=>{
 for(const mutate of [p=>p.promotion.startingPrice=251,p=>p.promotion.regularPrice=-1,p=>p.promotion.startingPrice=1.5,p=>p.promotion.enabled="true",p=>p.promotion.startAt="tomorrow"]){const p=clone(acBaseline);mutate(p);assert.throws(()=>validateSpecialContent("air-conditioner-cleaning",p));}
 const p=clone(acBaseline);p.promotion.enabled=false;p.promotion.bundleEnabled=false;
 const {AirConditionerCleaningView}=load("src/components/AirConditionerCleaningView.tsx");const html=renderToStaticMarkup(AirConditionerCleaningView({content:p,preview:true}));
 assert.ok(!html.includes('summer-ac-promotion-title'));assert.ok(!html.includes('199'));assert.ok(html.includes('250'));
});
test("SQL closed contracts and TS contracts agree exactly; no arbitrary field escapes",()=>{
 const sql=readFileSync('supabase/migrations/20260924090000_cms_special_services.sql','utf8');
 for(const [key,c] of Object.entries(specialContracts))assert.ok(sql.includes(JSON.stringify(c)),key);
 assert.doesNotMatch(sql,/create table|grant .* to authenticated|storage\.buckets|auth\.users/i);
});
test("private and published special media use the authorized byte route directly, never the public image optimizer",()=>{
 const {AirConditionerCleaningView}=load('src/components/AirConditionerCleaningView.tsx'),{WindowCleaningView}=load('src/components/WindowCleaningView.tsx');
 const ac=clone(acBaseline),window=clone(windowBaseline);window.media.hero=[ac.media.gallery[0]];
 for(const [component,content] of [[AirConditionerCleaningView,ac],[WindowCleaningView,window]])for(const audience of ['admin','public']){
  const refs=resolveMediaProjection(media(content).map(m=>({...m,provider:'local'})),audience);
  const html=renderToStaticMarkup(component({content,media:refs,preview:audience==='admin'}));
  assert.doesNotMatch(html,/\/_next\/image\?url=%2F(?:admin|cms-media)/);
  assert.ok(html.includes(audience==='admin'?'/admin/media/file/':'/cms-media/'));
 }
});
