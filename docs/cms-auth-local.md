# CMS authentication — Phase 1B-A

This is a local-only foundation on Next.js 16.3.5. No cloud project is linked.
The public site still uses `staticContentSource`; its business APIs are unchanged.

## Trust boundaries

- `/admin/login` uses a Next.js Server Action for email/password login. There is
  no browser Supabase client, signup action, OAuth callback, or user-supplied redirect.
- `src/proxy.ts` runs only on `/admin/:path*`. It verifies/refreshes the session
  with `getUser()`, forwards refreshed request cookies, returns response cookies,
  and marks every admin response private/no-store/noindex.
- The protected route-group layout calls `requireCmsAdminPage()`. Dashboard data
  calls it independently. Future reads and mutations must call `requireCmsAdmin()`
  directly, including Server Actions and route handlers; a layout or Proxy check
  never substitutes for authorization at the data boundary.
- `requireCmsAdmin()` creates a request-local ordinary SSR client, verifies the
  identity with an Auth-server `getUser()` call, then selects that UUID's active
  `admin` membership. It returns only UUID, verified email and role. Neither
  cookie user data, editable user metadata, email matching nor `getSession()`
  authorizes access. There is no persistent authorization cache.
- Normal application access uses only the publishable key and the user's JWT.
  No service-role client/key exists in application source or browser bundles.
- Membership RLS allows an authenticated active admin to SELECT only their own
  active row. Anonymous has no table privilege. No API role has membership-write
  privileges/policies. The owner-only bootstrap process changes membership.
- `is_cms_admin()` is a stable SECURITY INVOKER SQL function with an empty search
  path, relying on the same RLS. Future content RLS may use it. No content tables
  or content permissions are included in this phase.
- Two unique seats (`admin_slot` 1 and 2) cap membership at two identities,
  including temporarily inactive seats. Both have exactly the same `admin` role.
  A replacement account requires a deliberate owner-side seat reassignment.
- Cookies use a dedicated `cb-cms-auth` namespace, HttpOnly, SameSite=Lax, and
  Path=/admin. No public consent/attribution cookie is read or changed. They use
  Secure=false solely for the hard-allowed loopback HTTP endpoint in this phase.
  Hosted URLs, missing settings and secret/service keys are rejected before any
  connection. Cloud/HTTPS support needs the explicit Phase 1B-B change.
- Login creates a new Supabase session. Unauthorized login revokes that session
  and clears its cookies. Logout revokes the current session's refresh token and
  clears only CMS cookies. Supabase-issued access JWTs can remain valid until
  expiry (300 seconds locally); this is not a custom token revocation system.
  Membership deactivation is checked afresh and takes effect immediately.

## Local setup and validation

Prerequisites: Node >=22, Docker, npm. The CLI and Playwright are pinned in the
lockfile. Never use `supabase link`, `db push`, remote URLs or production keys here.

```sh
npm ci
npx playwright install chromium
# Create once; reuse only this project's dedicated network.
docker network create --driver bridge \
  --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 \
  cleanbrothers-cms-local
npm run cms:start
npm run test:cms:db
npm test
npm run test:cms
npm run build
npm run test:e2e
npx tsc --noEmit --incremental false
npm run lint
git diff --check
npm run cms:stop
```

The Supabase CLI currently publishes its API/database/mail-test ports on all
host interfaces even with the network's loopback binding option. This stack is
for a private local test machine, contains synthetic identities only, and should
be stopped when tests finish. Next's test server itself binds only to loopback.
No external SMTP, production project, real account or customer data is needed.

Docker Desktop's credential helper stalled public image downloads on the test
machine. An isolated temporary `DOCKER_CONFIG` containing only `{"auths":{}}`,
with `DOCKER_HOST` pointing to the local Docker socket, allowed anonymous public
image downloads. No user Docker configuration or stored credential was changed.

The web test harness reads `supabase status --output json` in memory, requires
project `cleanbrothers-cms-local`, refuses a linked project, and verifies the exact
API origin `http://127.0.0.1:56321`. It gives the Next.js child process ONLY the
CMS publishable configuration, PATH and Node/telemetry settings; no CRM variables
or bootstrap key are inherited. Next runs at `http://127.0.0.1:56300` with
`reuseExistingServer: false`. Browser requests to other origins are rejected.

For an interactive local session, copy only the local API URL and publishable
key into ignored `.env.local` under `CMS_SUPABASE_URL` and
`CMS_SUPABASE_PUBLISHABLE_KEY`. `.env.example` contains names and comments only
for these new settings. Never place a service key there. Without valid local
configuration the public site builds normally and admin login fails safely.

## Fixtures and controlled bootstrap

Playwright creates three randomized `example.invalid` Auth identities using the
local Auth Admin API: an active admin, an inactive admin and a non-member. Their
password is generated per worker and never committed. Only the first two get
membership rows. Cleanup deletes only identities created by that worker, with
membership cascade deletion. The suite refuses to seed a non-empty membership
table. No Auth state, screenshots, traces or video are persisted by default.
SQL tests run in a transaction and roll back all fixtures and changes.

The privileged test helper lives in `scripts/cms-local.mjs` and `tests/e2e`, not
in the application. It obtains the **local** service key only in memory for Auth
fixture creation/deletion. Membership setup uses `docker exec`/`psql` on the exact
local CMS database container as its database owner. Runtime clients never use it.

Future real bootstrap (Phase 1B-B, not performed): an authorized operator creates
exactly two Auth identities through the dedicated CMS project's administrative
API/console, confirms them through a controlled flow, then assigns their verified
UUIDs to seats 1 and 2 using a database-owner connection. Do not hardcode email
allowlists. The SQL shape is:

```sql
-- Supply user_id and slot via a trusted CLI; not a browser endpoint.
insert into public.cms_admin_members (user_id, admin_slot, role, is_active)
values (:'user_id'::uuid, :'slot'::smallint, 'admin', true);
```

Keep bootstrap credentials outside the web process. Disable a member with an
owner-side `is_active=false` update; reassign occupied seats deliberately. No
browser membership-management endpoint, service-key client, or open signup exists.
The local CLI maps `auth.email.enable_signup` to the email provider enable flag;
it must be true for password login. Global `auth.enable_signup=false` blocks
public signup, verified against the live local API (`signup_disabled`).

## Test changes from Phase 1A

The exact route inventory now includes `/admin/login`; admin is no longer an
unauthenticated placeholder. The old placeholder assertion was replaced with a
shell-only isolation assertion plus authenticated browser coverage. Import-graph
checks now cover every admin module and Proxy. Dedicated Auth fetches are allowed,
while CRM endpoints, public tracking imports and marketing calls remain forbidden.
All public URL, metadata, consent, CRM, WhatsApp and static-adapter tests remain.
The in-memory unit loader supports explicit mocks for server-only auth tests;
real Auth/database behavior is independently tested by pgTAP and Playwright.

## Security review and next phase

The checks cover unauthenticated/forged access, non-members, inactive members,
revocation after login, direct SQL privileges, fixed redirects, session refresh,
logout, cache headers, noindex, mobile RTL and public-cookie/marketing isolation.
Admin/preview remain outside the sitemap. Auth sessions and membership are never
cached across requests. Next Server Actions enforce their standard Origin/Host
CSRF checks; no cross-origin allowlist is added.

The original Phase 1B-A audit found 9 inherited vulnerable packages (1 low,
1 moderate, 6 high, 1 critical). The subsequent local security gate updated Next.js
and eslint-config-next to 16.3.5 and resolved the remaining vulnerable transitive
dependencies. The final audit on 2026-09-21 reports zero vulnerabilities, including
development dependencies. All regression suites pass; four additional tests call
the dashboard data boundary directly without running Proxy or a layout.
See [the security gate report](phase-1b-security-gate.md) for all advisories,
exact version changes, exposure analysis and validation evidence.

Cookie Path=/admin remains unchanged. Server Actions invoked from admin pages
receive this cookie; a future /preview/* URL would not. Prefer an authenticated
/admin/preview/* URL, with its own isolated layout and independent data-boundary
authorization. Any alternative preview session architecture needs a separate
review; no preview authentication or broader cookie scope is implemented here.
The fixed two-seat schema is also unchanged. The security report recommends a
flexible membership table with a controlled bootstrap limit for a future phase,
if two admins is a current product policy rather than a permanent hard cap.

MFA is deferred. The minimal Phase 1B-B sequence is:

1. Review the completed security gate and rerun the audit before hosted work.
2. Create one dedicated CleanBrothers CMS cloud project, separate from CRM; turn
   off public signup, configure password/security limits and controlled email.
3. Apply this migration; inspect grants/RLS and rerun access tests on isolated
   test identities. Configure only the new CMS URL/publishable key in Preview.
   Add an explicit approved-project allowlist and Secure HTTPS cookies before
   allowing hosted URLs. Keep Production disconnected.
4. Provision the two real identities and seats by the controlled bootstrap above.
5. Add TOTP enrollment/challenge/verification pages and an Auth assurance check
   (`aal2`) after verified identity and before returning authorized context.
   Add the same assurance requirement to DB policies/`is_cms_admin()` so direct
   database requests cannot bypass MFA. Test recovery, unenrollment, expired
   challenges and aal1 denial. Keep membership authorization independent of MFA.
6. Only after approval, deploy Preview and repeat the tests with synthetic
   accounts, verify HTTPS cookies/no-store/CSRF/noindex and public tracking
   isolation, then have the two admins enroll. No CMS content modules yet.

References:
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/local-development/cli/config
- Installed Next.js docs: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
