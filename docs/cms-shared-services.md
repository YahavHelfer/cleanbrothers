# Phase 2C1 — shared service audit and local generalization

## Scope and source evidence

Approved parent: `02af571d8d1c15b38e1e203711921b0b512a87e7`, branch
`feature/cms-cloud-foundation`. This phase is local only. Cloud migrations,
content, Storage, flags, identities, deployments and Production are unchanged.

All six existing routes import `ServiceLandingPage`. Source objects are in
`src/data/serviceLandingPages.ts`; galleries and crops are in `src/data/serviceImages.ts`.
The renderer is `ServiceLandingView`, the public behavior adapter is
`ServiceLandingPage`, and CRM identity previously came from `config.serviceName`.

| Stable key | Exact existing CRM identity | Hero images | FAQ | Optional presentation | Related service |
| --- | --- | ---: | ---: | --- | --- |
| sofa-cleaning | ניקוי ספות | 4 | 6 | Per-image crops; before/after pair | armchair-chair-cleaning |
| mattress-cleaning | ניקוי מזרנים | 1 | 5 | Before/after pair | delicate-upholstery-cleaning |
| carpet-cleaning | ניקוי שטיחים | 1 | 5 | Before/after pair | sofa-cleaning |
| car-upholstery-cleaning | ניקוי ריפודי רכב | 4 | 6 | Shared crop; before/after pair | delicate-upholstery-cleaning |
| armchair-chair-cleaning | ניקוי כורסאות וכיסאות | 1 | 5 | Single-image result | sofa-cleaning |
| delicate-upholstery-cleaning | ניקוי ריפודים עדינים | 1 | 6 | Single-image result; authoritative existing history | mattress-cleaning, car-upholstery-cleaning |

Every service has: canonical path, display name, SEO title/description, eyebrow,
H1, intro, hero images/alt, signs title/description/list, process
title/description/list, benefits description/list, result description, FAQ and
related links. Signs have five entries, processes four, benefits five.
Before/after has its own title, description, two image paths and two alt texts.
No target uses the optional video or single `image` field. The air-conditioner
source object's video does not make its special page a shared-template target.

All target pages use the same CTA mechanics: fixed phone/contact anchors,
WhatsApp copy derived from display name, and a form with the exact CRM identity
above. Metadata preserves per-service SEO/canonical and primary-image OG/Twitter;
FAQ JSON-LD is generated from each FAQ. No target has additional custom JSON-LD.
Homepage, `/services`, special air-conditioner/window pages and all other public
pages remain outside the managed registry.

## Media policy

Only the 20 distinct static image files referenced by these six sources belong
to this import (12 hero images and eight before/after files). Inventory hashing
found no identical files. A physical static path is one logical asset/version;
reused paths share it, while reference-level alt/caption remain contextual.
No bytes are copied, transformed or uploaded. Existing pilot asset/version IDs
and history must remain intact. Before/after roles need their own immutable refs.
Two legacy car images are 4284×5712, exceeding the 16M-pixel upload limit. Any
legacy exception must be confined to the exact reviewed static inventory; new
local/Preview uploads retain their existing limits.

## Implementation and review boundaries

- `service-registry.ts` owns the six keys, canonical routes, stable document IDs
  and exact CRM mappings. Neither routing nor integration identity is editorial.
- Schema 1/2 remain valid for existing pilot history. Schema 3 extends their
  strict text/list/FAQ model with approved shared-service links, explicit crops
  and before/after fields. It stores immutable version IDs, not arbitrary URLs.
  Unknown fields (including CRM/routing/HTML) are rejected in TypeScript and SQL.
- The single forward migration is
  `20260923160000_cms_shared_services.sql`. It generalizes the document-key
  constraint, introduces keyed RPCs, adds schema-3 validation and before/after
  refs, and extends static media only to an exact code-reviewed inventory.
  All historical migration files remain unchanged. It creates no bucket or
  cloud resource and imports no content automatically.
- `npm run cms:import-shared-services` is an operator-only local command. It
  refuses linked/cloud stacks, verifies all file hashes, imports media and six
  baselines atomically, and returns the existing Revision 1 for managed documents
  without rewriting revisions, publication pointers, generations or audit.
- The stable baseline media IDs are deterministic per physical static path.
  Existing pilot IDs are preserved. New upload limits and private provider
  rules remain unchanged. The static exception checks the exact path, version,
  content hash, dimensions, byte size and MIME of each inventory entry.
- `/admin/services/[serviceKey]` and
  `/admin/preview/services/[serviceKey]?revision=<UUID>` replace the concrete
  editor/Preview files without changing the existing pilot URL. Unknown or
  unmanaged keys fail closed. Reads bind the revision to the registry document
  ID; SQL CAS/publish/restore lock and validate the selected document separately.
- The list shows imported/missing state, draft/published revisions, last edit
  time and editor/publisher attribution. Special services are explicitly labeled
  unmanaged. There is no create-service UI.
- Publication still changes only one pointer atomically, drafts never publish,
  restores create new immutable revisions and copy historical media refs. Human
  actions use `auth.uid()`; imports use explicit null/system authorship.
- The resolver is memoized per key/request for HTML and metadata. Existing
  `CMS_PILOT_CONTENT_SOURCE=published` AND a valid, explicit
  `CMS_CONTENT_SERVICE_ALLOWLIST` entry are required. `CMS_CONTENT_ENABLED=true`
  alone has no effect. Unknown/wildcard/duplicate allowlists fail closed.
  Newly generalized services are additionally confined to the isolated local
  endpoint in this phase; even broadened cloud Preview flags cannot enable them.
  Cloud flags are not changed. All defaults remain static.
- Authenticated Preview uses the presentation-only component, no lead form,
  no actionable phone/WhatsApp integration, no analytics and existing
  no-store/noindex protection. Each repository/action independently authorizes
  AAL2 plus active completed membership; Proxy is not relied on alone.

## Acceptance tests

`cms-public-equivalence.test.mjs` compares exact SSR HTML and metadata of all
16 public pages with approved parent `02af571…`, including homepage, `/services`
and both special pages. The shared-service unit matrix checks all six baseline
renderings, FAQ JSON-LD, image crops/alt/CTA/form/SEO and immutable CRM mapping.
The generic multi-image projection retains the original carousel's numbered alt
text; losing that suffix was detected and fixed, not normalized out of the test.

The PostgreSQL suite independently exercises all six documents: bootstrap
idempotency, strict types, RLS/role/AAL checks, forged media, cross-document bases,
draft isolation, stale conflicts, publish, restore, immutable historical refs,
revision numbers, audit actors and unchanged histories after repeat import.
The browser suite compares actual database baseline renderings with static
pages, then performs complete UI lifecycles for sofa and mattress, focused
lifecycles/exact Preview for remaining services, stale-input preservation,
wrong-service revision rejection, unknown-key 404 and AAL1 denial.

## Next phase recommendation (not executed)

Phase 2C2 requires a separate review of this migration and diff, followed by the
smallest controlled cloud rollout. Apply only the approved forward migration,
bootstrap the remaining five documents without touching pilot history, deploy
the generic admin to protected Preview and keep public routes static initially.
Recheck cloud equivalence before relaxing the local-only new-service guard and
enabling one explicit service at a time. Production stays static. Special pages,
Page Builder, service creation and Promotions remain separate work.

Media detail usage links now carry the owning service key from the authenticated
SQL projection and validate it against the registry. They no longer point every
revision at the original pilot. Before/after labels are explicit. Publisher
attribution is selected from the current published revision, including when
multiple publication events share a transaction timestamp.

Browser semantic comparisons preserve text, links, images, alt, object-fit/crop,
CRM form value, metadata and JSON-LD. They compare same-origin paths across the
two local ports and suppress carousel autoplay with reduced motion; temporary
image-loading opacity is not a content field. The separate SSR gate compares
complete HTML, including all classes, byte-for-byte without normalization.

The public media projection carries the service keys that actually published a
version. The same-origin bytes route checks those owners against the explicit
content allowlist before reading bytes. A version published only by a disabled
service is denied, and never-published versions still have no public projection.
This replaces the last exact-pilot allowlist check in that delivery route;
cloud media enablement remains confined to the previously approved pilot.
