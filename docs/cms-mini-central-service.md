# Mini-central air conditioner cleaning

Public route: `/mini-central-air-conditioner-cleaning`.
Stable CMS key: `mini-central-air-conditioner-cleaning`.
Editor: `/admin/services/mini-central-air-conditioner-cleaning`.
CRM inquiry identity: `ניקוי מזגן מיני מרכזי` (code-owned, independent of editorial title).

Uses the existing schema-3 shared service template, keyed repositories,
authenticated preview, immutable draft/publish/restore and request-memoized
published reader. Optional `pageCopy` adds editable section and CTA labels;
historical schema-1/2/3 service documents remain valid. SEO title/description,
Service structured data, breadcrumb name and listing title/description derive from
the same service snapshot. OG/Twitter image follows the CMS shared primary image.

Images, alt text, order and crops are edited at
`/admin/pages/home#service-images-mini-central-air-conditioner-cleaning`.
Publish that homepage revision to update photography across the service and
listing. An empty collection remains empty. The migration creates immutable
homepage successors when necessary; historical image collections remain readable.

## Content evidence

The business owner confirmed on 2026-10-14: mini-central cleaning costs
550 ILS including VAT for motor, evaporator, outlets and filters, subject to
motor/evaporator access checks. Duct cleaning is a separate 150 ILS per duct,
using a dedicated brush and industrial vacuum. Typical system cleaning takes
90–120 minutes. Water and electricity are required; nearby parking is helpful.
No repair, performance or health guarantee is implied.
The reused AC
photo is labeled as illustrative and is not claimed as mini-central work.

## Apply and publish

Apply `supabase/migrations/20261006100000_cms_mini_central_service.sql` through
the normal migration workflow. It registers the identity/route, extends strict
SQL contracts and seeds the complete Hebrew baseline with the existing
idempotent import RPC. It does not replace existing service content or history.

For the unlinked isolated local stack, `npm run cms:import-mini-central`
can restore a missing baseline; rerunning preserves publication pointers and
revisions. `cms:import-shared-services` also includes the service.

Public CMS activation requires adding the exact key to
`CMS_CONTENT_SERVICE_ALLOWLIST`, preserving existing entries, and the existing
published source/environment gates:
- Local/approved Preview: `CMS_PILOT_CONTENT_SOURCE=published`.
- Approved Production: `CMS_CONTENT_SOURCE=published`.
- Shared photographs use the existing homepage source/allowlist gates.

Production activation on 2026-10-06 uses the dedicated CMS project
`plbwefnwussxlglscfpn` and the existing Vercel `cleanbrothers` project.
The migration was rehearsed against a restored fresh cloud backup and applied
through `supabase/.cloud`; existing histories and service publication pointers
were preserved. The production service allowlist includes the new key.
A compatibility release preceded the migration so existing nine-service image
readers could safely accept the extended snapshot. Releases follow the existing
`origin/main` → Vercel production deployment process.

When source gates are disabled, the established import-baseline fallback remains.

Editor workflow: save draft → preview saved revision → confirm and publish.
Public reads are request-rendered and no-store; publish also revalidates the
service route and `/services`. The new service appears in the complete service
listing, inquiry dropdown and sitemap, and is an available CMS navigation,
footer, homepage-card and promotion target. Existing navigation still links
to the complete service listing; homepage cards retain their selected set.

## Validation

Run `npm test`, `npm run lint`, `npx tsc --noEmit`,
`npm run build -- --webpack`, and
`npm run test:e2e -- --config tests/mini-central.playwright.config.ts`.
The dedicated browser test uses only the isolated local CMS and its existing
fixture workflow. It verifies 390/768/1440px RTL layouts, CTAs/inquiry identity,
saved preview, draft isolation, publication appearing on the page and listing,
metadata and baseline-import idempotency. It restores imported baselines
afterwards and never submits a customer lead.

## Cloud verification — 2026-10-06

Production release `1db02d79189d97721631ae356bba2ff3d05eabb9` is READY in
Vercel deployment `dpl_HCgpmn6j13detzxEi4njoVedULKx`, serving the canonical
domain. The service, listing, sitemap, homepage and existing AC service return
HTTP 200. Canonical, social metadata, FAQ and breadcrumb data were checked.

Authenticated CMS verification saved revision 2, checked private preview and
draft isolation, published it and observed the temporary heading live. Revision
1 was restored through the normal editor as revision 3 and published. All
original content and SEO fields match exactly; other publication states and
shared image histories remain unchanged. Text and shared image editors are
accessible. Desktop/mobile RTL rendering, image loading, contact-anchor
navigation, inquiry service selection, empty-form validation and the WhatsApp
redirect were checked. No customer lead or WhatsApp message was submitted.

The isolated final release passed 501 tests, lint, TypeScript and the webpack
production build. Fresh backup dumps and recovery evidence are retained in the
ignored, restricted `supabase/.cloud/backups/mini-central-20261006/` directory.
