// Local merge only: accepts an authenticated editor's exported current draft.
// No CMS clients, network requests, privileged keys or publication operations.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createSourceLoader, plain } from '../tests/helpers/source-module.mjs';
const load = createSourceLoader();
const proposals = JSON.parse(await readFile(new URL('../docs/seo/cms-draft-proposals.json', import.meta.url), 'utf8'));
const factualQuestion = /מחיר|כמה זמן|להתייבש|תעלות|להכין|מזגן עילי בלבד/;
function mergeFaqs(current, proposed) {
  const updates = proposed.filter(faq => factualQuestion.test(faq.question));
  const remaining = new Map(updates.map(faq => [faq.question, faq]));
  const result = current.map(faq => {
    const update = remaining.get(faq.question);
    remaining.delete(faq.question);
    return update || faq;
  });
  return [...result, ...remaining.values()];
}
export function mergeCmsDraft(key, input) {
  const current = structuredClone(input);
  if (key === 'settings') {
    return plain(load('src/cms/site/model.ts').validateSiteSettings({ ...current,
      email: proposals.siteSettings.email, serviceAreas: proposals.siteSettings.serviceAreas }));
  }
  if (key === 'home') {
    for (const block of current.blocks) {
      if (!['homePricing','homeEstimate','homeAreas'].includes(block.type)) continue;
      const proposed = proposals.home.blocks.find(candidate => candidate.type === block.type);
      if (!proposed) continue;
      for (const field of ['eyebrow','title','mobileDescription','description'])
        if (Object.hasOwn(proposed.payload,field)) block.payload[field] = proposed.payload[field];
    }
    return plain(load('src/cms/home/model.ts').validateHomeDraft(current));
  }
  const model = load('src/cms/content/managed-model.ts');
  model.validateManagedDraft(key, current);
  const proposed = proposals.services[key];
  if (!proposed) throw new Error('Unsupported service');
  current.seoTitle = proposed.seoTitle;
  current.seoDescription = proposed.seoDescription;
  current.faqs = mergeFaqs(current.faqs, proposed.faqs);
  if (key === 'air-conditioner-cleaning') {
    current.h1 = proposed.h1;
    current.airConditionerServiceAreas = proposed.airConditionerServiceAreas;
    for (const field of ['startingPrice','bundleEnabled','badge','heroLabel','pricePrefix','description','priceTerms','bundleTerms'])
      current.promotion[field] = proposed.promotion[field];
    // Keep existing popup visibility, legacy regularPrice, media and copy.
  } else if (key === 'mini-central-air-conditioner-cleaning') {
    for (const field of ['h1','intro','signsTitle','signsDescription','processDescription','benefitsDescription'])
      current[field] = proposed[field];
  } else if (['sofa-cleaning','mattress-cleaning'].includes(key)) {
    current.intro = proposed.intro;
  }
  return plain(model.validateManagedDraft(key, current));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [key,inputPath,outputPath] = process.argv.slice(2);
  if (!key || !inputPath || !outputPath || inputPath === outputPath)
    throw new Error('Usage: node scripts/seo-merge-cms-draft.mjs <serviceKey|home|settings> <current-draft.json> <new-output.json>');
  const payload = JSON.parse(await readFile(inputPath,'utf8'));
  const merged = mergeCmsDraft(key,payload.draft || payload);
  await writeFile(outputPath,JSON.stringify(merged,null,2),{ flag:'wx' });
  console.log('Saved a validated local merge. Original draft and publication were not changed. Preserve its generation/revision for the CMS concurrency check.');
}
