import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const origin = process.env.SEO_AUDIT_ORIGIN || 'http://127.0.0.1:56411';
const browser = await chromium.launch();
const result = { pages: [], calculator: [] };
try {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const path of ['/', '/air-conditioner-cleaning', '/mini-central-air-conditioner-cleaning', '/sofa-cleaning', '/mattress-cleaning']) {
    const response = await page.goto(`${origin}${path}`);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('h1').count(), 1);
    assert.ok((await page.locator('footer').innerText()).includes('ראשון–חמישי 08:00–18:00, שישי 07:30–15:00'));
    assert.ok((await page.locator('footer').innerText()).includes('info@cleanbrothers.co.il'));
    const schema = await page.locator('#cleanbrothers-local-business-jsonld').textContent();
    assert.equal(JSON.parse(schema).openingHoursSpecification.length, 2);
    const main = await page.locator('main').innerText();
    if (path === '/air-conditioner-cleaning') {
      for (const amount of ['199','249','550','150']) assert.ok(main.includes(amount));
      assert.equal(await page.locator('.line-through').count(), 0);
      assert.ok(!main.includes('המזגן ה־6'));
    }
    if (path === '/mini-central-air-conditioner-cleaning') {
      for (const text of ['550 ₪','150 ₪','מברשת ייעודית','שואב אבק תעשייתי','כוללים מע״מ']) assert.ok(main.includes(text));
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    result.pages.push({ path, status: response.status(), hours: true, email: true, schemaHours: true, overflow: false });
  }
  await context.close();
  const interactive = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await interactive.route('**/*', route => {
    const request = route.request();
    return new URL(request.url()).origin === origin && request.method() === 'GET' ? route.continue() : route.abort();
  });
  const ui = await interactive.newPage();
  await ui.goto(origin);
  await ui.getByRole('button', { name: 'דחיית עוגיות לא הכרחיות' }).click();
  const panel = ui.locator('aside [aria-live="polite"]');
  for (const [label,price] of [['מזגן עילי עד 2 כ״ס (כולל)','199 ₪'],['מזגן עילי מעל 2 כ״ס','249 ₪'],['מיני מרכזי','550 ₪']]) {
    await ui.getByRole('button', { name: `בחירת ${label}`, exact: true }).click();
    assert.ok((await panel.textContent()).includes(price));
    result.calculator.push({ label, price });
  }
  await ui.locator('button').filter({ hasText: /^מזרון$/ }).click();
  for (const [label,price] of [['יחיד — צד אחד','200 ₪'],['יחיד — שני צדדים','250 ₪'],['זוגי — צד אחד','300 ₪'],['זוגי — שני צדדים','350 ₪'],['מיטה וחצי — צד אחד','250 ₪'],['מיטה וחצי — שני צדדים','300 ₪'],['מיטת נוער — היקף לפי תמונה','300 ₪']]) {
    await ui.getByRole('button', { name: `בחירת ${label}`, exact: true }).click();
    assert.ok((await panel.textContent()).includes(price));
    result.calculator.push({ label, price });
  }
  await ui.locator('button').filter({ hasText: /^ספה$/ }).click();
  assert.ok((await panel.textContent()).includes('החל מ־300 ₪'));
  await ui.locator('button').filter({ hasText: /^שטיח$/ }).click();
  assert.ok((await panel.textContent()).includes('הצעה לפי תמונה'));
  await ui.screenshot({ path: '/private/tmp/cleanbrothers-business-calculator.png', fullPage: true });
  await interactive.close();
} finally { await browser.close(); }
await writeFile('docs/seo/business-facts-smoke.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
