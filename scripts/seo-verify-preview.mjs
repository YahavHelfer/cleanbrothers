// Read-only verification through Vercel's existing authorized CLI connection.
// Credentials stay in the CLI: never expose a bypass token to source or logs.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const exec = promisify(execFile);
const url = new URL(process.argv[2]);
assert.equal(url.protocol,'https:');
assert.ok(url.hostname.endsWith('.vercel.app'));
const origin = url.origin;
const directory = await mkdtemp(join(tmpdir(),'cleanbrothers-preview-check-'));
let counter = 0;
const cache = new Map();
function request(path) {
  if(cache.has(path)) return cache.get(path);
  const promise = (async()=>{
    const stem = join(directory,String(counter++));
    await exec('vercel',['curl',path,'--deployment',origin,'--','--silent','--show-error','--max-time','45','--dump-header',`${stem}.headers`,'--output',`${stem}.body`],{maxBuffer:1024*1024});
    const headers = await readFile(`${stem}.headers`,'utf8');
    const status = [...headers.matchAll(/^HTTP\/\S+ (\d+)/gm)].at(-1)?.[1];
    const type = [...headers.matchAll(/^content-type:\s*(.+)$/gim)].at(-1)?.[1].trim();
    return { status:Number(status),type:type||'application/octet-stream',body:await readFile(`${stem}.body`),noindex:/^x-robots-tag:.*noindex/im.test(headers) };
  })();
  cache.set(path,promise);return promise;
}
const result = { origin,readOnly:true,externalServicesBlocked:true,pages:[],missing:[] };
const browser = await chromium.launch();
try {
  const context = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
    const target = new URL(route.request().url());
    if(target.origin!==origin || route.request().method()!=='GET' || target.pathname.startsWith('/api/') || target.pathname.endsWith('.js')) return route.abort();
    const response = await request(target.pathname+target.search);
    return route.fulfill({status:response.status,contentType:response.type,body:response.body});
  });
  const page = await context.newPage();
  for(const path of ['/','/sofa-cleaning','/mattress-cleaning','/air-conditioner-cleaning','/mini-central-air-conditioner-cleaning']) {
    const response = await request(path);
    assert.equal(response.status,200);assert.ok(response.noindex);
    await page.goto(origin+path,{waitUntil:'networkidle',timeout:120000});
    assert.equal(await page.locator('main h1').count(),1);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href,new URL(path,'https://www.cleanbrothers.co.il').href);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    schemas.forEach(data=>JSON.parse(data));assert.ok(schemas.length>0);
    const footer = await page.locator('footer').innerText();
    assert.ok(footer.includes('info@cleanbrothers.co.il'));
    assert.ok(footer.includes('שישי 07:30–15:00'));
    const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false);
    await page.screenshot({path:join(directory,`${path.slice(1)||'home'}-mobile.png`)});
    result.pages.push({path,status:200,noindex:true,canonical:true,schemas:schemas.length,mobileOverflow:false,hours:true,email:true});
  }
  for(const path of ['/seo-preview-missing','/seo-preview-missing/deeper']) {
    const response=await request(path);assert.equal(response.status,404);result.missing.push({path,status:404});
  }
  await context.close();
  // Screenshots contain public review content only; temporary raw headers are
  // deleted because they can contain Vercel session cookies.
  for(const name of ['home','sofa-cleaning','mattress-cleaning','air-conditioner-cleaning','mini-central-air-conditioner-cleaning'])
    await writeFile(`/private/tmp/cleanbrothers-preview-${name}-mobile.png`,await readFile(join(directory,`${name}-mobile.png`)));
  await writeFile('docs/seo/preview-verification.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); await rm(directory,{recursive:true,force:true}); }
