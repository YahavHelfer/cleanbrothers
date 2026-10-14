// Offline proposals only. Does not open a CMS client or publish a revision.
import { mkdir, writeFile } from 'node:fs/promises';
import { createSourceLoader, plain } from '../tests/helpers/source-module.mjs';
const load = createSourceLoader();
const { sharedServiceKeys } = load('src/content/service-registry.ts');
const { serviceBaseline } = load('src/cms/content/baseline.ts');
const { acBaseline, windowBaseline } = load('src/cms/content/special-baseline.ts');
const { validateSpecialContent } = load('src/cms/content/special-model.ts');
const { siteSettingsBaseline } = load('src/cms/site/baseline.ts');
const { homeBaseline } = load('src/cms/home/baseline.ts');
const proposals = {
  notice: 'Review only. Compare with the latest published CMS revision and merge approved text fields. Preserve current media, promotions and unrelated edits. No production import or publication was performed.',
  services: {
    ...Object.fromEntries(sharedServiceKeys.map(key => [key, plain(serviceBaseline(key))])),
    'air-conditioner-cleaning': plain(validateSpecialContent('air-conditioner-cleaning', acBaseline)),
    'window-cleaning': plain(validateSpecialContent('window-cleaning', windowBaseline)),
  },
  siteSettings: plain(siteSettingsBaseline),
  home: plain(homeBaseline),
};
await mkdir('docs/seo', { recursive: true });
await writeFile('docs/seo/cms-draft-proposals.json', JSON.stringify(proposals, null, 2));
console.log('Saved validated, offline CMS baseline proposals for 10 services, site settings and homepage.');
