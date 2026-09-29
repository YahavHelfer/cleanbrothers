# Phase 5F-A: Production compatibility, not activation

Stage 0 has no CMS or Google activation variables. This change only makes the
server gates capable of recognizing a later, explicitly configured Production
deployment. It does not configure Vercel, Supabase, CRM, Google or the scheduler.

The common Production identity requires `VERCEL=1`, `VERCEL_ENV=production`,
the exact CleanBrothers Vercel project ID, `VERCEL_GIT_COMMIT_REF=main`, and the
exact dedicated CMS Supabase URL. CMS access also requires a publishable key
with the `sb_publishable_` format. The app origin for that identity is the
canonical HTTPS Production domain. CMS cookies remain Secure, HttpOnly, Lax,
and scoped to `/admin`; repository authorization and AAL2 are unchanged.

Previous Preview assumptions and their separate Production switches:

| Area | Existing Preview behavior | Additional Production gate |
| --- | --- | --- |
| Admin | Dedicated CMS URL and publishable key on Vercel Preview | Exact Production identity and publishable key; no public source implied |
| Services | `CMS_PILOT_CONTENT_SOURCE=published`, exact service allowlist; shared/special services use the approved branch | `CMS_CONTENT_SOURCE=published` plus exact `CMS_CONTENT_SERVICE_ALLOWLIST` |
| Existing/new pages | Approved Preview branch and dedicated CMS project | Their independent `CMS_PAGE_*` / `CMS_NEW_PAGE_*` source and allowlist |
| Homepage | Approved Preview page boundary | `CMS_HOME_SOURCE=published` and `CMS_HOME_ALLOWLIST=home` |
| Site settings | Approved Preview branch | Independent `CMS_SITE_SOURCE=published` and staged exact allowlist |
| Scheduled public placements | Approved Preview branch | Independent `CMS_SCHEDULED_PROMOTIONS_SOURCE=active` and exact placement allowlist |
| Google Reviews | Approved Preview identity and fixed Place ID | Exact Production identity plus `GOOGLE_REVIEWS_SOURCE=google`, server key and fixed Place ID |
| Media | Preview-only cloud media switch and content allowlist | Independent `CMS_MEDIA_PRODUCTION_ENABLED=1`, server-only media key, exact CMS service source and allowlist |

Preview and isolated local behavior remain supported. No wildcard source or
allowlist is accepted. The Production media switch is separate because service
revisions can contain immutable media references; without it, media remains
unavailable. The existing private CMS media bucket and server-only key policy
are unchanged. No switch above is present in Stage 0 Production.
