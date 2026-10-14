import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const origin = process.env.SEO_AUDIT_ORIGIN || 'http://127.0.0.1:56410';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.goto(`${origin}/contact?service=${encodeURIComponent('ניקוי ספות')}&utm_source=seo`);
  await page.getByRole('button', { name: 'דחיית עוגיות לא הכרחיות' }).click();
  assert.equal(await page.locator('[name="service"]').inputValue(), 'ניקוי ספות');
  let payload;
  let calls = 0;
  await page.route('**/api/contact-lead', async route => {
    payload = route.request().postDataJSON(); calls++;
    const id = payload.submissionId;
    await route.fulfill({ json: { status: 'converted', leadId: 'seo-local-stub', eventId: 'seo-local-event', duplicate: false, created: true, conversionEligible: true, submissionId: id, conversionTransactionId: id } });
  });
  await page.locator('[name="fullName"]').fill('בדיקה מקומית');
  await page.locator('[name="phone"]').fill('0501234567');
  await page.locator('[name="message"]').fill('בדיקה ללא CRM');
  await page.getByRole('button', { name: 'שליחת פנייה באתר CleanBrothers' }).click();
  await page.getByText('הפרטים נשלחו בהצלחה. נחזור אליכם בהקדם.').waitFor();
  assert.equal(calls, 1);
  assert.equal(payload.service, 'ניקוי ספות');
  assert.equal(payload.message, 'עמוד הפנייה: /contact\nבדיקה ללא CRM');
  assert.deepEqual(payload.marketingAttribution, {});
  assert.match(payload.submissionId, /^[0-9a-f-]{36}$/);
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://www.cleanbrothers.co.il/contact');
  const result = { mocked: true, sentToCRM: false, calls, service: payload.service, pageContextPreserved: true, attributionEmptyAfterConsentRejection: true, submissionIdPresent: true, canonicalQueryFree: true, successVisible: true };
  await writeFile('docs/seo/contact-smoke.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
