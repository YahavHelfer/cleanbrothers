import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";
const load = createSourceLoader();
const { sharedServiceKeys: keys, serviceRegistry: registry } = load("src/content/service-registry.ts");
const { serviceBaseline } = load("src/cms/content/baseline.ts");
const { validateServiceDraft, toServiceLanding } = load("src/cms/content/service-model.ts");
const { toServiceLandingProps } = load("src/content/service-landing-adapter.ts");
const { ServiceLandingPage, buildServiceLandingMetadata } = load("src/components/ServiceLandingPage.tsx");
const local = { CMS_SUPABASE_URL:"http://127.0.0.1:56321", CMS_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_local_test" };
import {baselineMedia} from "./helpers/shared-service-media.mjs";

const expected={"sofa-cleaning":"ניקוי ספות","mattress-cleaning":"ניקוי מזרנים","carpet-cleaning":"ניקוי שטיחים","car-upholstery-cleaning":"ניקוי ריפודי רכב","armchair-chair-cleaning":"ניקוי כורסאות וכיסאות","delicate-upholstery-cleaning":"ניקוי ריפודים עדינים"};
for(const key of keys){
 test(`${key}: exact baseline SSR, FAQ/JSON-LD, images, crop, alt, CTAs, form and metadata equivalence`,()=>{
  const draft=serviceBaseline(key),cms=toServiceLandingProps(toServiceLanding(key,draft,baselineMedia(draft)));
  const original=load("src/content/static-source.ts").staticContentSource.getServiceLanding(key),before=toServiceLandingProps(original);
  assert.equal(renderToStaticMarkup(ServiceLandingPage(cms)),renderToStaticMarkup(ServiceLandingPage(before)));
  assert.deepEqual(plain(buildServiceLandingMetadata(cms.config)),plain(buildServiceLandingMetadata(before.config)));
  assert.equal(cms.crmServiceName,expected[key]);
 });
 test(`${key}: editing every title/description preserves CRM and canonical`,()=>{
  const p=serviceBaseline(key);for(const field of Object.keys(load("src/cms/content/pilot-model.ts").pilotTextFields))p[field]="תוכן ערוך";
  const props=toServiceLandingProps(toServiceLanding(key,p,baselineMedia(p)));
  assert.equal(props.crmServiceName,expected[key]);assert.equal(props.config.path,`/${key}`);
 });
 test(`${key}: two gates select only explicitly allowlisted local service`,()=>{
  const use=(env)=>createSourceLoader({env:{...local,...env}})("src/cms/content/public-source.ts").usesCmsSource(key);
  assert.equal(use({CMS_PILOT_CONTENT_SOURCE:"published"}),false);
  assert.equal(use({CMS_CONTENT_SERVICE_ALLOWLIST:key}),false);
  assert.equal(use({CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:keys.filter(k=>k!==key).join(",")}),false);
  assert.equal(use({CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:key}),true);
  assert.equal(use({CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:"*"}),false);
  assert.equal(use({CMS_CONTENT_ENABLED:"true"}),false);
 });
 for(const [risk,edit] of Object.entries({crm:p=>{p.crmServiceName="שינוי";},key:p=>{p.serviceKey="window-cleaning";},html:p=>{p.intro="<script>";},url:p=>{p.relatedLinks=[{label:"x",href:"https://evil.invalid"}];},image:p=>{p.images=["../../etc/passwd"];},unknownVersion:p=>{p.schemaVersion=4;}}))test(`${key}: refuses ${risk}`,()=>{const p=serviceBaseline(key);edit(p);assert.throws(()=>validateServiceDraft(key,p));});
}
test("special keys require their own typed model; unknown keys never enable CMS",()=>{
 const source=createSourceLoader({env:{...local,CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:"air-conditioner-cleaning,window-cleaning"}})("src/cms/content/public-source.ts");
 for(const key of ["air-conditioner-cleaning","window-cleaning","__proto__","constructor","../../sofa-cleaning",""]){assert.equal(source.usesCmsSource(key),["air-conditioner-cleaning","window-cleaning"].includes(key));assert.throws(()=>validateServiceDraft(key,serviceBaseline(keys[0])));}
});
test("approved cloud Preview enables only the explicit service at each rollout step",()=>{
 const ordered=["delicate-upholstery-cleaning",...keys.filter(key=>key!=="delicate-upholstery-cleaning")];
 for(let count=1;count<=ordered.length;count++) {
  const allowlist=ordered.slice(0,count);
  const source=createSourceLoader({env:{...local,VERCEL:"1",VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"feature/cms-cloud-foundation",CMS_SUPABASE_URL:"https://plbwefnwussxlglscfpn.supabase.co",CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:allowlist.join(",")}})("src/cms/content/public-source.ts");
  for(const key of keys)assert.equal(source.usesCmsSource(key),allowlist.includes(key));
 }
});
test("before/after and crop validators refuse arbitrary keys, CSS, paths and HTML",()=>{
 for(const mutate of [p=>p.beforeAfter.beforeImage="/images/evil",p=>p.beforeAfter.title="<b>bad</b>",p=>p.beforeAfter.extra="x",p=>p.imagePosition="fixed inset-0",p=>p.imagePositions={x:"object-center"},p=>p.beforeAfter=null]){const p=serviceBaseline("sofa-cleaning");mutate(p);assert.throws(()=>validateServiceDraft("sofa-cleaning",p));}
});
test("cross-route revision read filters both immutable document ID and revision",async()=>{
 const calls=[];const query={select(){return this;},eq(k,v){calls.push([k,v]);return this;},async maybeSingle(){return {data:null,error:null};}};
 const repo=createSourceLoader({env:local,mocks:{"@/cms/authorization":{requireCmsAdmin:async()=>({userId:"test"})},"@/cms/server":{createCmsServerClient:async()=>({from:()=>query})}}})("src/cms/content/repository.ts");
 assert.equal(await repo.getServiceRevision("sofa-cleaning","a0000000-0000-4000-8000-000000000001"),null);
 assert.deepEqual(calls,[["document_id",registry["sofa-cleaning"].documentId],["id","a0000000-0000-4000-8000-000000000001"]]);
});

test("generic public source fetches only its selected published projection once per adapter call",async()=>{
 for(const key of keys.filter(k=>k!=="delicate-upholstery-cleaning")){
  const draft=serviceBaseline(key);const calls=[];
  const media=baselineMedia(draft).map(row=>({...row,provider:"static"}));
  const source=createSourceLoader({env:{...local,CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:key},mocks:{"next/server":{connection:async()=>{}},"@/cms/media/environment":{requireMediaEnvironment:()=>{}},"@supabase/supabase-js":{createClient:()=>({rpc:async(name,args)=>{calls.push([name,args]);return {data:{revisionId:"a0000000-0000-4000-8000-000000000001",payload:draft,media},error:null};}})}}})("src/cms/content/public-source.ts");
  const result=await source.getPublicService(key);assert.equal(result.page.serviceId,key);assert.deepEqual(plain(calls),[["cms_read_published_service",{target_key:key}]]);
 }
});

test("public media requires an actual published owner in the explicit service allowlist",async()=>{
 const id="a3000000-0000-4000-8000-000000000001";
 for(const [owners,status] of [[["sofa-cleaning"],200],[["mattress-cleaning"],404],[["window-cleaning"],404],[[],404],[undefined,404]]){
  let reads=0;
  const route=createSourceLoader({env:{...local,CMS_MEDIA_LOCAL_ENABLED:"1",CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:"sofa-cleaning"},mocks:{
   "@supabase/supabase-js":{createClient:()=>({rpc:async()=>({data:{id,storage_provider:"local",serviceKeys:owners},error:null})})},
   "@/cms/media/repository":{mediaBytes:async()=>{reads++;return {bytes:Buffer.from("fixture")};}},
  }})("src/app/cms-media/[id]/route.ts");
  const response=await route.GET(new Request(`http://127.0.0.1:56301/cms-media/${id}`),{params:Promise.resolve({id})});
  assert.equal(response.status,status);assert.equal(reads,status===200?1:0);
 }
});

const previewEnv = { ...local, VERCEL: "1", VERCEL_ENV: "preview",
 VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation", CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
 CMS_PILOT_CONTENT_SOURCE: "published", CMS_MEDIA_PREVIEW_ENABLED: "1" };
const rolloutKeys = ["delicate-upholstery-cleaning", ...keys.filter(key => key !== "delicate-upholstery-cleaning")];

test("new shared services stay static outside the dedicated approved Preview and isolated local environment", async () => {
 for (const invalid of [{VERCEL_ENV:"production"},{VERCEL_GIT_COMMIT_REF:"main"},{VERCEL_GIT_COMMIT_REF:"feature/other"},
  {VERCEL_GIT_COMMIT_REF:""},{CMS_SUPABASE_URL:"https://unrelated.supabase.co"},{CMS_SUPABASE_URL:local.CMS_SUPABASE_URL},
  {VERCEL:""},{VERCEL:"",VERCEL_ENV:""},{CMS_SUPABASE_PUBLISHABLE_KEY:""}]) {
  let reads=0;
  const source=createSourceLoader({env:{...previewEnv,...invalid,CMS_CONTENT_SERVICE_ALLOWLIST:keys.join(",")},
   mocks:{"@supabase/supabase-js":{createClient:()=>{reads++;throw Error("unexpected cloud access");}}}})("src/cms/content/public-source.ts");
  for(const key of keys.filter(key=>key!=="delicate-upholstery-cleaning")) {
   assert.equal(source.usesCmsSource(key),false);
   assert.equal((await source.getPublicService(key)).revisionId,null);
  }
  assert.equal(reads,0);
 }
});

test("Preview allowlist rejects wildcards, special keys, duplicates and malformed lists", () => {
 for(const allowlist of ["","*","sofa-cleaning,*","window-cleaning","air-conditioner-cleaning",
  "sofa-cleaning,window-cleaning","sofa-cleaning,sofa-cleaning","sofa-cleaning,"," sofa-cleaning","__proto__","constructor"]) {
  const source=createSourceLoader({env:{...previewEnv,CMS_CONTENT_SERVICE_ALLOWLIST:allowlist}})("src/cms/content/environment.ts");
  for(const key of keys)assert.equal(source.usesCmsSource(key),false,allowlist);
 }
});

test("non-allowlisted Preview services retain static content without querying CMS", async () => {
 for(let count=1;count<rolloutKeys.length;count++) {
  let reads=0;
  const source=createSourceLoader({env:{...previewEnv,CMS_CONTENT_SERVICE_ALLOWLIST:rolloutKeys.slice(0,count).join(",")},
   mocks:{"@supabase/supabase-js":{createClient:()=>{reads++;throw Error("unexpected cloud access");}}}})("src/cms/content/public-source.ts");
  for(const key of rolloutKeys.slice(count)) {
   const page=await source.getPublicService(key);
   assert.equal(page.revisionId,null);
   assert.deepEqual(plain(page.page),plain(load("src/content/static-source.ts").staticContentSource.getServiceLanding(key)));
  }
  assert.equal(reads,0);
 }
});

test("each explicitly enabled Preview service uses only its keyed published snapshot and exact media baseline", async () => {
 for(const key of rolloutKeys.slice(1)) {
  const draft=serviceBaseline(key),calls=[];
  const media=baselineMedia(draft).map(row=>({...row,provider:"static"}));
  const source=createSourceLoader({env:{...previewEnv,CMS_CONTENT_SERVICE_ALLOWLIST:`delicate-upholstery-cleaning,${key}`},
   mocks:{"next/server":{connection:async()=>{}},"@supabase/supabase-js":{createClient:()=>({rpc:async(name,args)=>{
    calls.push([name,args]);return {data:{revisionId:"a0000000-0000-4000-8000-000000000001",payload:draft,media},error:null};
   }})}}})("src/cms/content/public-source.ts");
  const result=await source.getPublicService(key);
  assert.deepEqual(plain(calls),[["cms_read_published_service",{target_key:key}]]);
  const actual=toServiceLandingProps(result.page),expected=toServiceLandingProps(load("src/content/static-source.ts").staticContentSource.getServiceLanding(key));
  assert.equal(renderToStaticMarkup(ServiceLandingPage(actual)),renderToStaticMarkup(ServiceLandingPage(expected)));
  assert.deepEqual(plain(buildServiceLandingMetadata(actual.config)),plain(buildServiceLandingMetadata(expected.config)));
 }
});
