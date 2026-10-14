import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSourceLoader, plain } from './helpers/source-module.mjs';
const load = createSourceLoader();
test('confirmed operating hours and official email reach visible defaults and business schema', () => {
  const { businessConfig } = load('src/config/business.ts');
  assert.equal(businessConfig.email, 'info@cleanbrothers.co.il');
  const schema = load('src/lib/structured-data.ts').buildLocalBusinessJsonLd();
  assert.equal(schema.email, businessConfig.email);
  assert.deepEqual(plain(schema.openingHoursSpecification).map(row => [row.dayOfWeek, row.opens, row.closes]), [
    [['Sunday','Monday','Tuesday','Wednesday','Thursday'], '08:00', '18:00'],
    [['Friday'], '07:30', '15:00'],
  ]);
});
test('AC pricing does not display a fictitious regular-price discount, including when promotion is off', () => {
  const { acBaseline } = load('src/cms/content/special-baseline.ts');
  assert.equal(acBaseline.promotion.bundleEnabled, false);
  const { AirConditionerCleaningView } = load('src/components/AirConditionerCleaningView.tsx');
  const { AcPromotionContent } = load('src/components/AcPromotionContent.tsx');
  for (const enabled of [true,false]) {
    const content = { ...acBaseline, promotion: { ...acBaseline.promotion, enabled } };
    const html = renderToStaticMarkup(createElement(AirConditionerCleaningView, { content, preview: true }));
    for (const amount of ['199','249','550','150']) assert.ok(html.includes(amount));
    assert.doesNotMatch(html, /line-through/);
    assert.ok(!html.includes('המזגן ה־6'));
  }
  assert.doesNotMatch(renderToStaticMarkup(createElement(AcPromotionContent, { promotion: acBaseline.promotion, preview: true })), /line-through/);
});
test('mini-central price and separate duct cleaning derive from the validated CMS baseline', () => {
  const draft = load('src/cms/content/baseline.ts').serviceBaseline('mini-central-air-conditioner-cleaning');
  assert.match(draft.intro, /550 ₪/);
  assert.match(draft.intro, /150 ₪/);
  assert.match(draft.signsDescription, /למנוע ולמאייד/);
  assert.ok(draft.faqs.some(faq => /כשעה וחצי עד שעתיים/.test(faq.answer)));
  assert.ok(!JSON.stringify(draft).includes('ניקוי תעלות אינו כלול'));
});
