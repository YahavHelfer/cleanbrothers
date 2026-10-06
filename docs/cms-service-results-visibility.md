# Service results visibility and photo-copy cleanup

The shared service editor exposes **הסתרת מקטע עבודות ותוצאות** at
`/admin/services/<service-key>`. Schema-3 `resultsHidden` is an optional boolean;
missing/false preserves historical visibility. True omits the entire section
container, including its heading, image, descriptions and gallery CTA. The
same projection is used for saved draft preview and published content.
Mini-central's import baseline sets true. Other service baselines stay visible.

`20261007100000_cms_service_results_visibility.sql` extends the existing strict
SQL validator and updates future generated benefit-image alt text. Its targeted
contextual cleanup appends immutable successors only for affected current CMS
revisions, independently preserving published and unpublished pointers. It
cleans photo-authenticity copy/alt text and the homepage before/after title;
only mini-central receives `resultsHidden: true`. Images, order, crops, SEO,
other content and historical revisions remain intact. Repeated runs are no-ops.
The legacy AC caption field remains readable for historical payload compatibility;
its retired overlay and editor control are removed.

Deployment order: first deploy the backward-compatible application from an
isolated `origin/main` checkout through the existing Vercel production workflow;
then apply the migration using the dedicated linked `supabase/.cloud` CMS target.
Do not apply the migration to the CRM database. Rehearse on a restored fresh
backup, verify current pointers match the backup, and run a dry run first.
No production feature flags or admin permissions need to change.

Verification: `npm test`, `npm run lint`, `npx tsc --noEmit`, and
`npm run build -- --webpack`. Exercise checkbox → save → authenticated preview
→ publish → live read; finally restore the hidden state. Check all service,
homepage and gallery text/alt text and desktop/mobile RTL rendering.
