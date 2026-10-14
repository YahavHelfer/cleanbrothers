import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin = process.env.SEO_AUDIT_ORIGIN || 'http://127.0.0.1:56410';
const phase = process.argv[2] || 'after';
const browser = await chromium.launch();
const output = { phase, origin, conditions: { viewport: '390x844', cpuSlowdown: 4, latencyMs: 150, downloadBytesPerSecond: 200000, uploadBytesPerSecond: 93750, runs: 3, reducedMotion: 'reduce', externalServices: 'blocked', cache: 'disabled per browser context' }, pages: [], performance: [], issues: [] };
await mkdir('docs/seo', { recursive: true });
try {
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  assert.equal(paths.length, new Set(paths).size);
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const links = new Set();
  for (const path of new Set([...paths, '/data-deletion'])) {
    const response = await page.goto(`${origin}${path}`, { waitUntil: 'load' });
    const record = await page.evaluate(() => ({ path: location.pathname, title: document.title, description: document.querySelector('meta[name="description"]')?.content, canonical: document.querySelector('link[rel="canonical"]')?.href, h1: [...document.querySelectorAll('main h1')].map(e => e.textContent), lang: document.documentElement.lang, dir: document.documentElement.dir, schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => JSON.parse(e.textContent)), links: [...document.querySelectorAll('a[href]')].map(e => e.getAttribute('href')), overflow: document.documentElement.scrollWidth > innerWidth, invisibleImages: [...document.images].filter(e => getComputedStyle(e).opacity === '0').length })) ;
    record.status = response.status();
    output.pages.push(record);
    if (record.schemas.length === 0 || record.status !== 200 || record.h1.length !== 1 || !record.title || !record.description || record.canonical !== `https://www.cleanbrothers.co.il${path === '/' ? '/' : path}` || record.lang !== 'he' || record.dir !== 'rtl' || record.overflow) output.issues.push({ path, reason: 'HTML invariant' });
    for (const href of record.links) if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api/')) links.add(href.split('#')[0].split('?')[0]);
  }
  for (const path of links) {
    const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
    if (response.status >= 400) output.issues.push({ path, status: response.status, reason: 'broken internal link' });
  }
  output.unknown = [];
  for (const path of ['/seo-audit-nonexistent', '/seo-audit-nonexistent/deeper']) {
    const response = await fetch(`${origin}${path}`); output.unknown.push({ path, status: response.status });
  }
  output.robots = await (await fetch(`${origin}/robots.txt`)).text();
  const admin = await fetch(`${origin}/admin`, { redirect: 'manual' });
  output.admin = { status: admin.status, robots: admin.headers.get('x-robots-tag'), cache: admin.headers.get('cache-control') };
  await context.close();
  if (!process.argv.includes('--html-only')) for (const path of ['/', '/sofa-cleaning', '/air-conditioner-cleaning', '/window-cleaning', '/mini-central-air-conditioner-cleaning']) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      // Prevent analytics, external embeds and any CRM writes during verification.
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return url.origin !== origin || route.request().method() !== 'GET' ? route.abort() : route.continue();
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.addInitScript(() => {
        window.seoMetrics = { lcp: null, cls: 0 };
        new PerformanceObserver(list => { for (const e of list.getEntries()) window.seoMetrics.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.seoMetrics.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const metrics = await page.evaluate(() => ({ ...window.seoMetrics, overflow: document.documentElement.scrollWidth > innerWidth }));
      output.performance.push({ path, run, ...metrics });
      if (run === 1) {
        await page.screenshot({ path: `/private/tmp/cleanbrothers-seo-${phase}-${path.replaceAll('/', '') || 'home'}.png`, fullPage: true });
        await page.screenshot({ path: `/private/tmp/cleanbrothers-seo-${phase}-${path.replaceAll('/', '') || 'home'}-viewport.png` });
        const quote = page.locator('a[href="#contact-form"]').first();
        if (await quote.count()) {
          try { await quote.click({ timeout: 2500 }); }
          catch { output.issues.push({ path, reason: 'quote CTA obstructed' }); }
          await page.waitForTimeout(700);
          const selected = await page.locator('select').first().inputValue();
          output.pages.find(p => p.path === path).selectedService = selected;
        }
      }
      await context.close();
    }
  }
} finally { await browser.close(); }
await writeFile(`docs/seo/${phase}.json`, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ phase, pages: output.pages.length, issues: output.issues, unknown: output.unknown, performance: output.performance }));
if (phase !== 'before') {
  assert.deepEqual(output.issues, []);
  assert.ok(output.unknown.every(r => r.status === 404));
  assert.ok(output.pages.every(p => p.invisibleImages === 0));
}
