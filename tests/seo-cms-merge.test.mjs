import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCmsDraft } from '../scripts/seo-merge-cms-draft.mjs';
import { createSourceLoader, plain } from './helpers/source-module.mjs';
const load = createSourceLoader();
test('service merge retains current media, revisions-independent data and unrelated draft FAQ', () => {
  const draft = plain(load('src/cms/content/baseline.ts').serviceBaseline('sofa-cleaning'));
  draft.faqs.push({ question: 'שאלה מהטיוטה הנוכחית', answer: 'תוכן שמור' });
  draft.imageAlt = 'תיאור תמונה שנערך ב-CMS';
  const before = structuredClone(draft);
  const result = mergeCmsDraft('sofa-cleaning',draft);
  assert.deepEqual(draft,before);
  for (const field of ['images','beforeAfter','imagePositions','imageAlt','relatedLinks','pageCopy','resultsHidden'])
    assert.deepEqual(result[field],draft[field]);
  assert.ok(result.faqs.some(faq=>faq.question==='שאלה מהטיוטה הנוכחית'));
  assert.match(result.intro,/300 ₪/);
});
test('AC merge disables expired bundle while retaining media and current popup visibility', () => {
  const draft = plain(load('src/cms/content/special-baseline.ts').acBaseline);
  draft.promotion.enabled = false;
  draft.promotion.bundleEnabled = true;
  const result = mergeCmsDraft('air-conditioner-cleaning',draft);
  assert.deepEqual(result.media,draft.media);
  assert.equal(result.promotion.enabled,false);
  assert.equal(result.promotion.bundleEnabled,false);
  assert.equal(result.promotion.regularPrice,draft.promotion.regularPrice);
});
test('homepage merge retains block identities, order, visibility and photography', () => {
  const draft = plain(load('src/cms/home/baseline.ts').homeBaseline);
  const result = mergeCmsDraft('home',draft);
  assert.deepEqual(result.blocks.map(block=>Object.fromEntries(Object.entries(block).filter(([key])=>key!=='payload'))),draft.blocks.map(block=>Object.fromEntries(Object.entries(block).filter(([key])=>key!=='payload'))));
  for(const block of draft.blocks.filter(block=>!['homePricing','homeEstimate','homeAreas'].includes(block.type)))
    assert.deepEqual(result.blocks.find(item=>item.id===block.id),block);
});
