import assert from "node:assert/strict";
import test from "node:test";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

const load = createSourceLoader();
const model = load("src/cms/site/model.ts");
const baseline = load("src/cms/site/baseline.ts");
const { settings, navigation, footer } = {
  settings: plain(baseline.siteSettingsBaseline), navigation: plain(baseline.siteNavigationBaseline),
  footer: plain(baseline.siteFooterBaseline),
};

test("closed global schemas reject executable content, unknown fields and integration settings", () => {
  assert.equal(model.validateSiteSettings(settings).schemaVersion, 9);
  assert.equal(model.validateSiteNavigation(navigation).schemaVersion, 10);
  assert.equal(model.validateSiteFooter(footer).schemaVersion, 11);
  for (const extra of ["crmEndpoint","ga4Id","supabaseKey","whatsappPhone","canonicalOrigin","logoMediaId"])
    assert.throws(() => model.validateSiteSettings({ ...settings, [extra]: "unsafe" }));
  assert.throws(() => model.validateSiteSettings({ ...settings, businessName: "<script>alert(1)</script>" }));
  assert.throws(() => model.validateSiteSettings({ ...settings, phoneDisplay: "0500000000" }));
  assert.throws(() => model.validateSiteSettings({ ...settings, email: "x@example.com?subject=leak" }));
  assert.throws(() => model.validateSiteSettings({ ...settings, serviceAreas: ["תל אביב","תל אביב"] }));
  assert.equal(model.validateSiteSettings({ ...settings, phoneDisplay: "055-957-7731" }).phoneDisplay,"055-957-7731");
});

test("navigation accepts only typed destinations with unique IDs and contiguous order", () => {
  const first = navigation.items[0];
  for (const unsafe of ["javascript:alert(1)","data:text/html,abc","/admin","/api/whatsapp","https://evil.invalid"])
    assert.throws(() => model.validateSiteNavigation({ ...navigation, items: [{ ...first, target: { kind: "static",path: unsafe } }] }));
  assert.throws(() => model.validateSiteNavigation({ ...navigation,items:[{...first,target:{kind:"page",id:"missing"}}] }));
  assert.throws(() => model.validateSiteNavigation({ ...navigation,items:[first,{...first,order:1}] }));
  assert.throws(() => model.validateSiteNavigation({ ...navigation,items:[{...first,order:2}] }));
  assert.throws(() => model.validateSiteNavigation({ ...navigation,items:[{...first,target:{kind:"service",key:"unknown"}}] }));
  const pageId="a4000000-0000-4000-8000-000000000001";
  const withPage = model.validateSiteNavigation({schemaVersion:10,items:[{...first,target:{kind:"page",id:pageId}}]});
  assert.equal(model.siteTargetPath(withPage.items[0].target,{[pageId]:"original-slug"}),"/original-slug");
  assert.equal(model.siteTargetPath(withPage.items[0].target,{[pageId]:"new-slug"}),"/new-slug");
  assert.equal(model.siteTargetPath(withPage.items[0].target,{}),null);
});

test("footer structure is closed and cannot turn legal or WhatsApp links into arbitrary URLs", () => {
  assert.throws(() => model.validateSiteFooter({...footer,whatsappUrl:"https://wa.me/123"}));
  assert.throws(() => model.validateSiteFooter({...footer,legal:[...footer.legal.slice(0,2),{...footer.legal[2],path:"/admin"}]}));
  assert.throws(() => model.validateSiteFooter({...footer,featuredServices:["sofa-cleaning","sofa-cleaning"]}));
  assert.throws(() => model.validateSiteFooter({...footer,featuredServices:["unknown"]}));
});

test("static baselines reproduce Navbar, Footer, contact and LocalBusiness data", () => {
  const { navLinks } = load("src/data/site.ts");
  const source = load("src/cms/site/public-source.ts");
  const chrome = source.resolveSiteChrome(settings,navigation,footer);
  assert.deepEqual(plain(chrome.navLinks),plain(navLinks));
  assert.deepEqual(plain(chrome.featuredServiceLinks),[
    {label:"ניקוי ספות",href:"/sofa-cleaning"},
    {label:"ניקוי מזגנים",href:"/air-conditioner-cleaning"},
    {label:"ניקוי חלונות",href:"/window-cleaning"},
  ]);
  const structured = load("src/lib/structured-data.ts");
  assert.deepEqual(plain(structured.buildLocalBusinessJsonLd(settings)),plain(structured.localBusinessJsonLd));
  assert.deepEqual(plain(structured.buildServiceJsonLd(settings)),plain(structured.serviceJsonLd));
  const changed = {...settings,businessName:"שם בדיקה",email:"site@example.com"};
  assert.equal(structured.buildServiceJsonLd(changed).provider.name,"שם בדיקה");
  assert.equal(structured.buildLocalBusinessJsonLd(changed).email,"site@example.com");
  assert.equal(chrome.settings.phoneDisplay,"0559577731");
  assert.equal(chrome.footer.whatsappCtaLabel,"שלחו תמונה וקבלו מחיר");
});

test("only the dedicated Preview or local stack can activate explicitly allowlisted site documents", () => {
  const flags={CMS_SUPABASE_URL:"http://127.0.0.1:56321",CMS_SITE_SOURCE:"published",
    CMS_SITE_ALLOWLIST:"settings,navigation,footer"};
  const preview={...flags,CMS_SUPABASE_URL:"https://plbwefnwussxlglscfpn.supabase.co",
    VERCEL:"1",VERCEL_ENV:"preview",VERCEL_PROJECT_ID:"prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF:"feature/cms-cloud-foundation"};
  for (const env of [{...preview,VERCEL_ENV:"production"},
    {...preview,VERCEL_PROJECT_ID:"other"},{...preview,VERCEL_GIT_COMMIT_REF:"main"},
    {...preview,CMS_SUPABASE_URL:"https://other.supabase.co"},
    {...preview,CMS_SITE_ALLOWLIST:"*"},{...preview,CMS_SITE_ALLOWLIST:"footer"},
    {...preview,CMS_SITE_ALLOWLIST:"settings,navigation"},
    {...preview,CMS_SITE_ALLOWLIST:"navigation,navigation"},
    {...preview,CMS_SITE_SOURCE:"draft"},
    {...flags,VERCEL:"1",VERCEL_ENV:"preview"},
    {...flags,CMS_SITE_ALLOWLIST:"*"},{...flags,CMS_SITE_SOURCE:"draft"},
    {...flags,CMS_SUPABASE_URL:"https://plbwefnwussxlglscfpn.supabase.co"}]) {
    const allowed=createSourceLoader({env})("src/cms/site/environment.ts");
    assert.equal(allowed.usesCmsSiteSource(),false);
  }
  assert.equal(createSourceLoader({env:flags})("src/cms/site/environment.ts").usesCmsSiteSource(),true);
  for (const [allowlist,kinds] of [
    ["navigation",["navigation"]],
    ["navigation,footer",["navigation","footer"]],
    ["settings,navigation,footer",["settings","navigation","footer"]],
  ]) {
    const source=createSourceLoader({env:{...preview,CMS_SITE_ALLOWLIST:allowlist}})("src/cms/site/environment.ts");
    assert.equal(source.siteEnvironmentAllowed(),true);
    for (const kind of ["settings","navigation","footer"])
      assert.equal(source.usesCmsSiteSource(kind),kinds.includes(kind));
  }
});

test("default public chrome does not make a CMS request or expose draft data", async () => {
  const source=createSourceLoader({env:{},mocks:{
    "@supabase/supabase-js":{createClient(){throw new Error("Unexpected CMS connection");}},
    "next/server":{connection(){throw new Error("Unexpected dynamic source");}},
  }})("src/cms/site/public-source.ts");
  const chrome=await source.getPublicSiteChrome();
  assert.equal(chrome.revisions.settings,null);
  assert.deepEqual(plain(chrome.navLinks),plain(load("src/data/site.ts").navLinks));
});

test("unapproved hosted branch stays static even with every site flag set", async () => {
  const source=createSourceLoader({env:{CMS_SUPABASE_URL:"https://plbwefnwussxlglscfpn.supabase.co",
    CMS_SITE_SOURCE:"published",CMS_SITE_ALLOWLIST:"settings,navigation,footer",
    VERCEL:"1",VERCEL_ENV:"preview",VERCEL_PROJECT_ID:"prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF:"main"},mocks:{
    "@supabase/supabase-js":{createClient(){throw new Error("Unexpected CMS connection");}},
    "next/server":{connection(){throw new Error("Unexpected dynamic source");}},
  }})("src/cms/site/public-source.ts");
  const chrome=await source.getPublicSiteChrome();
  assert.deepEqual(plain(chrome.revisions),{settings:null,navigation:null,footer:null});
  assert.equal(chrome.settings.businessName,settings.businessName);
});

test("explicit local source resolves only three published snapshots and keeps their revision identities", async () => {
  const calls=[];
  const documents={settings,navigation,footer};
  const revisions={settings:"a4000000-0000-4000-8000-000000000001",
    navigation:"a4000000-0000-4000-8000-000000000002",footer:"a4000000-0000-4000-8000-000000000003"};
  const source=createSourceLoader({env:{CMS_SUPABASE_URL:"http://127.0.0.1:56321",
    CMS_SITE_SOURCE:"published",CMS_SITE_ALLOWLIST:"settings,navigation,footer"},mocks:{
    "@/cms/config":{getCmsConfig:()=>({url:"http://127.0.0.1:56321",key:"local-publishable"})},
    "next/server":{connection:async()=>{}},
    "@supabase/supabase-js":{createClient:()=>({rpc:async(name,{kind})=>{
      calls.push([name,kind]); return {data:{payload:documents[kind],revisionId:revisions[kind],pageRoutes:{}},error:null};
    }})},
  }})("src/cms/site/public-source.ts");
  const chrome=await source.getPublicSiteChrome();
  assert.deepEqual(calls.map(([,kind])=>kind),["settings","navigation","footer"]);
  assert.ok(calls.every(([name])=>name==="cms_read_public_site"));
  assert.deepEqual(plain(chrome.revisions),revisions);
  assert.deepEqual(plain(chrome.navLinks),plain(load("src/data/site.ts").navLinks));
  assert.deepEqual(plain(chrome.settings),settings);
});

test("Preview rollout reads only allowlisted published documents and leaves others static", async () => {
  const revisions={settings:"a4000000-0000-4000-8000-000000000001",
    navigation:"a4000000-0000-4000-8000-000000000002",footer:"a4000000-0000-4000-8000-000000000003"};
  const preview={CMS_SUPABASE_URL:"https://plbwefnwussxlglscfpn.supabase.co",
    CMS_SITE_SOURCE:"published",VERCEL:"1",VERCEL_ENV:"preview",
    VERCEL_PROJECT_ID:"prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF:"feature/cms-cloud-foundation"};
  const changed={settings:{...settings,businessName:"שם בדיקה"},
    navigation:{...navigation,items:[{...navigation.items[0],label:"בית בדיקה"},...navigation.items.slice(1)]},
    footer:{...footer,description:"תיאור בדיקה"}};
  for (const [allowlist,kinds] of [
    ["navigation",["navigation"]],
    ["navigation,footer",["navigation","footer"]],
    ["settings,navigation,footer",["settings","navigation","footer"]],
  ]) {
    const calls=[];
    const source=createSourceLoader({env:{...preview,CMS_SITE_ALLOWLIST:allowlist},mocks:{
      "@/cms/config":{getCmsConfig:()=>({url:preview.CMS_SUPABASE_URL,key:"test-publishable"})},
      "next/server":{connection:async()=>{}},
      "@supabase/supabase-js":{createClient:()=>({rpc:async(name,{kind})=>{
        calls.push(kind);
        return {data:{payload:changed[kind],revisionId:revisions[kind],pageRoutes:{}},error:null};
      }})},
    }})("src/cms/site/public-source.ts");
    const chrome=await source.getPublicSiteChrome();
    assert.deepEqual(calls,kinds);
    for (const kind of ["settings","navigation","footer"])
      assert.equal(chrome.revisions[kind],kinds.includes(kind) ? revisions[kind] : null);
    assert.equal(chrome.settings.businessName,kinds.includes("settings") ? "שם בדיקה" : settings.businessName);
    assert.equal(chrome.navLinks[0].label,"בית בדיקה");
    assert.equal(chrome.footer.description,kinds.includes("footer") ? "תיאור בדיקה" : footer.description);
  }
});
