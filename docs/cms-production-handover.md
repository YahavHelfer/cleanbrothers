# CleanBrothers CMS — Production handover

Audit date: 2026-09-30 (Asia/Jerusalem). This is an operational snapshot, not a request to change configuration or content. Checks were read-only. “Live” below means checked against the current Production domain or control-plane metadata during this audit; “prior rollout verification” identifies evidence carried forward from the completed Phase 5F gates. Recheck volatile counts before an operational change.

## 1. System overview and identifiers

The public site runs on Vercel Production from `main`. Published CMS content is in the dedicated Supabase CMS project, separate from the CRM. Server-side source gates select published content per surface; Admin uses the same CMS project with independent AAL2 authorization. Google reviews are optional live server-rendered data, not CMS content. The permanent database scheduler manages Promotion placement state independently of public rendering.

| Item | Current identifier / state |
| --- | --- |
| Local `main` and `origin/main` | `ed552fcef35fac08ec63e52734660085109249da` (live Git check) |
| Vercel Production deployment | `dpl_9CkNqWAdN1EA9cGgqzKj1M1Uyoun`, READY, `main`, same SHA |
| Production domain | `www.cleanbrothers.co.il` resolves to that deployment (live Vercel inspect) |
| Vercel project identity | `cleanbrothers`, `prj_n7Mm1cepeKANL1jNcNjarNh9QR2A` |
| CMS Supabase project | `plbwefnwussxlglscfpn` |
| Google Cloud project | `cleanbrothers-web` |
| Homepage | Published Revision 19; Draft Revision 19 (live Admin read) |

The repository was clean before this documentation change. No release or database mutation was made during the audit.

## 2. Production environment inventory

The following names and scopes were verified with Vercel metadata. Vercel reports `sensitive` for the two key variables and `encrypted` for the other configuration entries; `encrypted` does not mean the flag is an API secret. Values are deliberately omitted. All listed entries are Production-scoped. Existing Vercel platform identity variables (`VERCEL`, `VERCEL_ENV`, `VERCEL_PROJECT_ID`, `VERCEL_GIT_COMMIT_REF`) are supplied by Vercel, not hand-managed CMS secrets. The Production identity gate requires their exact values and the dedicated CMS URL.

| Name | Vercel type | Owner / purpose |
| --- | --- | --- |
| `CMS_SUPABASE_URL` | encrypted config | CMS core: dedicated project identity |
| `CMS_SUPABASE_PUBLISHABLE_KEY` | sensitive key | CMS core: browser-safe Supabase publishable credential; not a service-role key |
| `CMS_CONTENT_SOURCE` | encrypted config | Services: published source gate |
| `CMS_CONTENT_SERVICE_ALLOWLIST` | encrypted config | Services: exact nine-key allowlist |
| `CMS_PAGE_SOURCE` | encrypted config | Generic Pages: published source gate |
| `CMS_PAGE_ALLOWLIST` | encrypted config | Generic Pages: `about` only |
| `CMS_SITE_SOURCE` | encrypted config | Site settings/navigation/footer published gate |
| `CMS_SITE_ALLOWLIST` | encrypted config | Site: exact `settings,navigation,footer` stage |
| `CMS_HOME_SOURCE` | encrypted config | Homepage: published source gate |
| `CMS_HOME_ALLOWLIST` | encrypted config | Homepage: `home` only |
| `CMS_SCHEDULED_PROMOTIONS_SOURCE` | encrypted config | Public active-placement rendering gate |
| `CMS_SCHEDULED_PROMOTIONS_ALLOWLIST` | encrypted config | Exact global/home/nine-service placement tokens |
| `GOOGLE_REVIEWS_SOURCE` | encrypted config | Live Google provider gate |
| `GOOGLE_PLACES_API_KEY` | sensitive key | Production-only server-side Places API credential |
| `GOOGLE_REVIEWS_PLACE_ID` | encrypted config | Code-checked CleanBrothers Place identity |

Intentionally **absent** in Production: `CMS_MEDIA_PRODUCTION_ENABLED`, `CMS_MEDIA_SERVER_KEY`. No other `CMS_` or `GOOGLE_` Production variable appeared in the Vercel metadata inventory. Do not paste environment values into tickets, logs, or this document.

## 3. Public-source matrix

Each CMS source requires the exact approved Production identity in addition to its own flag and allowlist. An unavailable or disabled source resolves to the code-owned static baseline where that surface has one; Google reviews instead omit the optional block. A rollback below is a procedure, not an action taken in this audit.

| Surface | Current source | Gate / allowlist | Fallback and operational rollback |
| --- | --- | --- | --- |
| Nine service detail routes | CMS published | `CMS_CONTENT_SOURCE=published`; nine exact service keys | Static service data; remove/disable the source flag and redeploy the same approved code |
| `/about` | CMS published | `CMS_PAGE_SOURCE=published`; `CMS_PAGE_ALLOWLIST=about` | Static About page; disable page source and redeploy |
| Navigation | CMS published | `CMS_SITE_SOURCE=published`; site allowlist includes `navigation` | Code-owned navigation; disable site source and redeploy |
| Footer | CMS published | Same gate, `footer` | Code-owned footer; disable site source and redeploy |
| Company/site settings | CMS published | Same gate, `settings` | Code-owned settings; disable site source and redeploy |
| `/` Homepage | CMS published | `CMS_HOME_SOURCE=published`; `CMS_HOME_ALLOWLIST=home` | Static Homepage baseline; disable home source and redeploy |
| Scheduled Promotion placements | Active-placement DB reader; currently no placement | `CMS_SCHEDULED_PROMOTIONS_SOURCE=active`; `global:site`, `home:home`, and `service:<each of the nine keys>` | No banner if no eligible placement; disable only the public source flag and redeploy for rendering rollback |
| Google Reviews block | Live server-side Places provider; visible in Homepage Revision 19 | `GOOGLE_REVIEWS_SOURCE=google`, approved Place ID/key and Homepage visible block | Provider failure omits only the optional block; hide block in a new Homepage revision or disable provider source and redeploy |
| Private/trusted media | Disabled | Production media flag and trusted key absent | Static repository media remains available; no trusted Storage fallback |

The nine service keys are: `sofa-cleaning`, `mattress-cleaning`, `carpet-cleaning`, `car-upholstery-cleaning`, `armchair-chair-cleaning`, `delicate-upholstery-cleaning`, `air-conditioner-cleaning`, `window-cleaning`, `post-renovation-cleaning`. The exact Production promotion token list was approved in Phase 5F-C6; current environment metadata verifies the variable exists, but does not expose its value in this audit. Reconfirm its exact value in Vercel before editing it.

## 4. Admin and Auth

Production Admin login was verified in Phase 5F-C1 using the existing administrator and TOTP. The authenticated Admin editor remained readable during this audit; its Homepage editor showed published/draft Revision 19. `requireCmsAdmin()` performs a fresh Auth lookup, verified claims, completed onboarding, AAL2, and an independent active admin-membership read protected by RLS. Proxy is additional protection, not the authorization boundary. A nonmember, inactive member, or AAL1 session is denied by design and by the existing security test suite; this audit did not create a test identity.

The verified CMS session cookie policy is `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/admin`. The live unauthenticated `/admin/login` response was HTTP 200 with `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` and `X-Robots-Tag: noindex, nofollow`. Prior live authenticated Admin/Exact Preview checks confirmed private/no-store, noindex/nofollow, and no public marketing scripts. No credentials or session values were copied for this audit.

Known approved identities: Yahav is active, onboarding complete and AAL2-capable; the second approved administrator remains preserved with onboarding pending and cannot access normal CMS administration until completion and AAL2. No user or membership was changed here. Recheck membership state in CMS Auth before future account operations.

## 5. Managed services

All nine routes returned HTTP 200 in the final live smoke. Current Production Services gating and the completed C2 rollout select published CMS revisions; the Phase 5F-C2B cloud audit found zero Supabase-private media references among the nine published service revisions. The public HTML carries normal title, description, canonical and Open Graph metadata on every route. CMS editors can change presentation; CRM service identity comes from the code-owned service registry, not a CMS title.

| Key and public route | Code-owned CRM identity |
| --- | --- |
| `/sofa-cleaning` | ניקוי ספות |
| `/mattress-cleaning` | ניקוי מזרנים |
| `/carpet-cleaning` | ניקוי שטיחים |
| `/car-upholstery-cleaning` | ניקוי ריפודי רכב |
| `/armchair-chair-cleaning` | ניקוי כורסאות וכיסאות |
| `/delicate-upholstery-cleaning` | ניקוי ריפודים עדינים |
| `/air-conditioner-cleaning` | ניקוי מזגנים |
| `/window-cleaning` | ניקוי חלונות |
| `/post-renovation-cleaning` | ניקיון אחרי שיפוץ ולפני אכלוס |

The ninth service has stable CMS document UUID `46bf0306-f3a9-487e-9a45-3ab3f6fcb3f8`. Its four approved static images and the three current AC assets returned HTTP 200 in this audit. Historical revision IDs were not enumerated again; the published-pointer and baseline lifecycle were verified during the controlled Preview/Production rollouts. Check the current published revision in Admin before editing any individual service.

## 6. Media operating model

Admin media listing/metadata and code-owned static files work through normal CMS Admin/AAL2. Production upload, trusted registration, private Supabase Storage reads/delivery (`/cms-media/[id]`), and replacement are intentionally unavailable. The upload UI is disabled without trusted capability; the server also rejects trusted operations. There is no fallback from trusted operations to the publishable/Admin client. The trusted path requires service-role-class authority for server attestation and private Storage, so no Production `CMS_MEDIA_SERVER_KEY` was provisioned. The publishable key is not an equivalent substitute. Static published media works; the last cloud reference audit counted **0** Supabase-provider media refs in the nine published services. Recheck that count before any future private-media rollout.

## 7. Homepage

Live Admin shows Homepage published **Revision 19** and Draft **Revision 19**, with the visible singleton `homeGoogleReviews` block. Its fixed block UUID is `d4000000-0000-4000-8000-000000000012`. The approved Revision 18→19 change made only this block visible; other Homepage blocks remained approved. A fresh public Document request returned HTTP 200, the expected Homepage sections and Google Reviews block; approved static images sampled in this audit returned 200. Public rendering reads the published pointer, not the Draft. Do not use a warm client navigation as sole proof immediately after publishing.

## 8. Google Reviews operating model

Google source: Cloud project `cleanbrothers-web`, Places API (New) enabled, billing active, Place ID `ChIJM6V_e13OrmgRCjbDT5abAqA`. The Production key is distinct from Preview, restricted to Places API (New), and held only as a Vercel Production sensitive/server environment variable. There is no Production media trusted key. The provider is `server-only`, requests Place Details (New) with a narrow field mask, `cache: no-store`, 3-second timeout, request-scoped React memoization, and fail-soft omission on malformed/error/empty results. No review text, author data, raw Google response, or key is persisted in Homepage revisions. Exact Admin Preview uses synthetic fixtures, never the live provider.

At the last live C7 check the business matched CleanBrothers, aggregate rating was 5/5 from 84 user ratings, and four reviews rendered. These are external, volatile values, not a fixed content baseline. The live Homepage in this audit still rendered the block. UI includes official Google Maps attribution, author attribution, direct review/business links and ordering notice. No browser-side Places endpoint was present in sampled public HTML, and no `aggregateRating` or Review/rating JSON-LD was found. Earlier C7 checks additionally scanned network requests and client bundles for key exposure and found none.

For a fast content rollback, create and publish **a new** Homepage revision changing only `homeGoogleReviews.hidden` to `true`; preserve history and all other blocks. If the provider must be disabled independently, remove/disable `GOOGLE_REVIEWS_SOURCE` in Production and redeploy. Neither was done in this audit.

## 9. Scheduled Promotions

Public placement reading is enabled for approved exact placements; it never executes the scheduler. At the last cloud scheduler audit there were **0 open schedules**, **0 active placements**, and one approved `cron.job`: `cms-promotion-scheduler`, cadence `* * * * *`, command exactly `select public.cms_process_due_promotion_schedules(100);`, executed as `cms_scheduler`. The wrapper samples DB time and invokes the deterministic core; the core does not accept public/service-role execution. The role is narrow (`LOGIN PASSWORD NULL`, no superuser/BYPASSRLS/broad membership, wrapper EXECUTE only, no direct CMS/Auth/Storage table privileges). Promotion revision content and active placement state are separate.

For a public rendering issue, disable `CMS_SCHEDULED_PROMOTIONS_SOURCE` and redeploy. **Do not** disable the cron job as the normal public rollback: schedule transitions and public rendering are separate. Inspect current jobs/placements before any scheduler maintenance; this audit did not run or modify the scheduler.

## 10. Database and migrations

The dedicated CMS project has **21 local migration files** and **21 matching cloud migration versions**, with zero pending/difference in the live `supabase migration list` comparison. In order:

1. `20260921000000_cms_admin_members.sql`
2. `20260921150000_cms_flexible_membership.sql`
3. `20260922000000_cms_mfa_aal2.sql`
4. `20260922150000_cms_content_lifecycle.sql`
5. `20260922180000_cms_content_conflict_response.sql`
6. `20260922200000_cms_media_foundation.sql`
7. `20260922210000_cms_media_preview_storage.sql`
8. `20260923160000_cms_shared_services.sql`
9. `20260924090000_cms_special_services.sql`
10. `20260925090000_cms_page_blocks.sql`
11. `20260925120000_cms_public_page_reader.sql`
12. `20260926100000_cms_new_page_routes.sql`
13. `20260927100000_cms_site_chrome.sql`
14. `20260927150000_cms_homepage_blocks.sql`
15. `20260928000000_cms_scheduled_promotions.sql`
16. `20260928090000_cms_promotion_document_identity.sql`
17. `20260928120000_cms_scheduler_execution_boundary.sql`
18. `20260928150000_cms_scheduler_role.sql`
19. `20260928180000_cms_public_active_promotion_reader.sql`
20. `20260928190000_cms_post_renovation_service_identity.sql`
21. `20260928200000_cms_google_reviews_home_block.sql`

No temporary diagnostic migration appears in the repository or cloud migration history. Matching migration histories do **not** prove absence of arbitrary manual DDL; this audit did not perform a full schema diff. No out-of-band schema change was detected by the available read-only migration and prior role/policy checks.

## 11. CRM isolation

The CMS Supabase project is separate from the CRM project; this audit did not access or mutate CRM records. The service registry fixes the lead/form service identities in code, including the ninth service. No real lead was submitted.

## 12. SEO, tracking and consent

Production public responses for `/`, `/services`, `/about`, `/post-renovation-cleaning`, `/air-conditioner-cleaning`, and `/contact` included title, description, canonical and OG metadata. FAQ, LocalBusiness and Service structured-data markers were present where applicable; the current Homepage has no Review/aggregateRating JSON-LD. WhatsApp still uses the existing attribution route, and cookie-consent/tracking hooks were present in representative public HTML. These were presence/isolation checks, not an end-to-end conversion or analytics event test. Admin and Exact Preview remain marketing-isolated.

## 13. Rollback runbook — execute only with incident authorization

1. Identify the affected surface and record the current Production deployment ID/SHA, env **names and non-secret values**, published revision, and a fresh failing Document response. Keep unaffected gates unchanged.
2. Services: disable/remove `CMS_CONTENT_SOURCE`, redeploy the current approved SHA, and verify all nine routes use the static baseline. Keep the exact allowlist for later controlled reactivation.
3. Generic Pages: disable/remove `CMS_PAGE_SOURCE`, redeploy, and verify `/about` static. Homepage is independent.
4. Site chrome: disable/remove `CMS_SITE_SOURCE`, redeploy, and verify navigation, footer, contact display and JSON-LD against the code-owned baseline.
5. Homepage: disable/remove `CMS_HOME_SOURCE`, redeploy, and verify `/` static. This also removes the CMS-configured visible reviews block from that source.
6. Public Promotions: disable/remove `CMS_SCHEDULED_PROMOTIONS_SOURCE`, redeploy, verify banners absent; leave `cms_scheduler` and its job intact.
7. Google Reviews: prefer a new Homepage revision with only the reviews block hidden. For provider-wide emergency isolation, disable/remove `GOOGLE_REVIEWS_SOURCE`, redeploy, and verify no Places request; keep other CMS sources active.
8. Admin-only incident: evaluate/remove the CMS Admin configuration separately (`CMS_SUPABASE_URL`/publishable key) only with a plan for public-source continuity. Public source gates depend on the same CMS identity; do **not** assume Admin can be disabled by deleting shared CMS config while leaving public CMS healthy. If only access must stop, use an authorized membership/session response instead of ad-hoc shared-env deletion.
9. Code regression: redeploy the last known-good Production SHA with its known-good env snapshot; verify the domain points to READY, then smoke all affected routes. Do not roll back database schema by default.

After any rollback: check the exact Production branch/SHA, fresh Document HTML/metadata, service images, `/admin/login`, no Draft leakage, and CRM/WhatsApp behavior without submitting a lead. Record what changed and obtain separate approval before reactivation.

## 14. Key and secret rotation runbook

- **CMS publishable key:** rotate in the dedicated CMS Supabase project, update only the approved Vercel scopes that use it, redeploy, verify Admin Auth/AAL2 and public readers, then revoke the previous key according to Supabase's supported sequence. This key is publishable and **not** `service_role`; RLS and server authorization remain essential.
- **Production Google Places key:** create/rotate a separate Production key in `cleanbrothers-web`, restrict it to Places API (New), update only Production `GOOGLE_PLACES_API_KEY`, redeploy, verify business identity/attribution and lack of client exposure, then revoke the old Production key. Never reuse the Preview key or put a key in `NEXT_PUBLIC_*`.
- **Preview Google Places key:** rotate independently in the approved Preview branch scope, redeploy protected Preview, verify synthetic Exact Preview and a controlled live public provider check if authorized, then revoke the old Preview key. Do not copy it to Production.
- **Scheduler:** its role/credential is separate from Google, publishable and media credentials; never reuse it. Follow the scheduler provisioning package and its exact job/role drift checks for maintenance.

No Production CMS media service-role-class key exists. Do not create one as a shortcut. Never print keys, cookies, MFA codes or raw review data during rotation. No key was rotated in this audit.

## 15. Known intentional limitations

1. Production private/trusted media upload and `/cms-media/[id]` delivery are disabled; existing published service media is static.
2. Google reviews are external live content. If Google times out, errors, or sends invalid data, only the optional block disappears; the page remains available.
3. Exact Admin Preview uses deterministic synthetic Google reviews, not live Google content.
4. Immediately after CMS publication, warm browser client navigation can show an older payload. Verify with a fresh Document request or hard reload on the current deployment and branch alias.
5. Scheduled Promotions public reading is enabled, but there is currently no active placement; an empty banner area is expected.
6. The live audit did not submit a lead, run an AAL1/nonmember identity test, or perform a full manual-DDL schema diff. Existing security tests and earlier controlled gates cover those behaviors.

## 16. Final Production smoke

Live read-only checks on 2026-09-30: **16/16 routes returned HTTP 200, no critical failure**.

| Routes | Result |
| --- | --- |
| `/`, `/services` | 200; Homepage Reviews block present on `/` |
| All nine service routes listed above | 9/9 returned 200 |
| `/about`, `/contact` | 2/2 returned 200 |
| `/sitemap.xml`, `/robots.txt` | 2/2 returned 200 |
| `/admin/login` | 200; private/no-store, noindex/nofollow |

Four post-renovation static images and three approved AC images returned 200 with expected image content types. Representative public routes had title/description/canonical/OG markers; no aggregateRating JSON-LD was found. Public HTML was not used to expose secrets or reviewer text. An HTTP 200 and metadata presence do not by themselves prove every interactive conversion path, so normal monitoring remains required.

## 17. Operator checklist for future content changes

**Before Publish:** verify active AAL2 Admin session; inspect exact revision and semantic diff; check immutable media refs and alt text; check title/description/canonical; confirm Draft content is absent from public HTML; use Exact Preview; verify CRM identity and safe CTA target; for Promotions check exact schedule, placement, timezone input and expiry behavior.

**After Publish:** use a fresh Document request; compare public content and metadata to the published revision; check images, canonical, FAQ/structured data and form/WhatsApp identity without a real lead; inspect critical browser-console errors; verify no Draft or revision ID leaked; check the deployment/alias currently serving the site.

**Google Reviews:** use a fresh public request; verify business identity, official Maps attribution, author/source links and ordering notice; confirm there is no client-side Places request or review/rating JSON-LD; if provider fails, confirm only this optional block disappears.

**Scheduled Promotions:** verify exact immutable Promotion revision, placement, start/end UTC conversion (Asia/Jerusalem is input/display only), active window and eventual expiry/rollback; verify no overlap and no unintended other placement. Do not invoke the scheduler manually during routine content publication.

**If something fails:** stop further rollout, preserve audit/history, apply only the affected rollback gate above under incident authorization, and record the fresh-route evidence.
