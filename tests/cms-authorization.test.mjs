import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

const user = { id: "10000000-0000-4000-8000-000000000001", email: "test@example.invalid" };
function setup({ identity = user, authError = null, row = { user_id: user.id, role: "admin", is_active: true }, dbError = null, fails = false } = {}) {
  const calls = [];
  const client = {
    auth: {
      async getUser() { calls.push("verified-user"); if (fails) throw Error("internal secret"); return { data: { user: identity }, error: authError }; },
      getSession() { throw Error("Unverified cookie identity must not be used"); },
    },
    from(table) {
      calls.push(table);
      return { select(columns) { calls.push(columns); return { eq(column, id) {
        assert.equal(column, "user_id"); assert.equal(id, identity.id);
        return { async maybeSingle() { return { data: row, error: dbError }; } };
      } }; } };
    },
  };
  const load = createSourceLoader({ mocks: {
    "./server": { createCmsServerClient: async () => client },
    "next/navigation": { redirect(destination) { throw Object.assign(new Error("Redirect"), { destination }); } },
  } });
  return { ...load("src/cms/authorization.ts"), client, calls, load };
}

test("CMS boundary validates Auth identity before membership and returns a minimal context", async () => {
  const { requireCmsAdmin, calls } = setup();
  assert.deepEqual(plain(await requireCmsAdmin()), { userId: user.id, email: user.email, role: "admin" });
  assert.deepEqual(calls, ["verified-user", "cms_admin_members", "user_id, role, is_active"]);
});

for (const [name, options, reason] of [
  ["anonymous", { identity: null }, "anonymous"],
  ["forged/unverified session", { authError: Error("invalid JWT") }, "anonymous"],
  ["authenticated non-member", { row: null }, "forbidden"],
  ["inactive member", { row: { user_id: user.id, role: "admin", is_active: false } }, "forbidden"],
  ["another member's identity", { row: { user_id: "another-id", role: "admin", is_active: true } }, "forbidden"],
  ["unknown role", { row: { user_id: user.id, role: "owner", is_active: true } }, "forbidden"],
  ["database error", { dbError: Error("internal database detail") }, "unavailable"],
  ["Auth outage", { fails: true }, "unavailable"],
]) {
  test(`CMS boundary rejects ${name}`, async () => {
    const { requireCmsAdmin, CmsAccessError, calls } = setup(options);
    await assert.rejects(requireCmsAdmin(), (error) => error instanceof CmsAccessError && error.reason === reason && error.message === "CMS access denied");
    if (reason === "anonymous" || options.fails) assert.deepEqual(calls, ["verified-user"]);
  });
}

test("each boundary call revalidates identity and membership without a cross-request cache", async () => {
  const options = { row: { user_id: user.id, role: "admin", is_active: true } };
  const { requireCmsAdmin, calls } = setup(options);
  await requireCmsAdmin();
  options.row.is_active = false;
  await assert.rejects(requireCmsAdmin(), (error) => error.reason === "forbidden");
  assert.equal(calls.filter((call) => call === "verified-user").length, 2);
});

for (const [name, options, destination] of [
  ["anonymous user", { identity: null }, "/admin/login"],
  ["authenticated non-member", { row: null }, "/admin/login?error=forbidden"],
  ["inactive member", { row: { user_id: user.id, role: "admin", is_active: false } }, "/admin/login?error=forbidden"],
]) {
  test(`direct dashboard read rejects ${name} without running Proxy or layout`, async () => {
    const { load, calls } = setup(options);
    const { getCmsDashboard } = load("src/cms/dashboard.ts");
    await assert.rejects(getCmsDashboard(), (error) => error.destination === destination);
    assert.equal(calls[0], "verified-user");
    if (options.identity !== null) assert.ok(calls.includes("cms_admin_members"));
  });
}

test("direct dashboard read independently validates active membership", async () => {
  const { load, calls } = setup();
  const { getCmsDashboard } = load("src/cms/dashboard.ts");
  assert.deepEqual(plain(await getCmsDashboard()), { admin: { userId: user.id, email: user.email, role: "admin" } });
  assert.deepEqual(calls, ["verified-user", "cms_admin_members", "user_id, role, is_active"]);
});

test("CMS config rejects missing settings, cloud URLs, alternate ports and privileged keys", () => {
  const valid = { CMS_SUPABASE_URL: "http://127.0.0.1:56321", CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only" };
  const config = createSourceLoader({ env: valid })("src/cms/config.ts");
  assert.equal(config.getCmsConfig().url, valid.CMS_SUPABASE_URL);
  for (const env of [{}, { ...valid, CMS_SUPABASE_URL: "https://project.supabase.co" }, { ...valid, CMS_SUPABASE_URL: "http://127.0.0.1:54321" }, { ...valid, CMS_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test_only" }]) {
    assert.throws(() => createSourceLoader({ env })("src/cms/config.ts").getCmsConfig(), /CMS configuration unavailable/);
  }
  assert.equal(config.isCmsCookie("cb-cms-auth.0"), true);
  for (const name of ["marketing-consent", "cb-cms-auth-other", "cb-cms-auth.evil", "sb-other-auth-token"]) assert.equal(config.isCmsCookie(name), false);
  assert.equal(config.cmsCookieOptions.httpOnly, true);
  assert.equal(config.cmsCookieOptions.path, "/admin");
});

test("Proxy is scoped to admin and both protected layout and data layer authorize", () => {
  const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  assert.match(source("src/proxy.ts"), /matcher: \["\/admin\/:path\*"\]/);
  assert.match(source("src/proxy.ts"), /private, no-store/);
  assert.match(source("src/app/(admin)/admin/(protected)/layout.tsx"), /await requireCmsAdminPage\(\)/);
  assert.match(source("src/cms/dashboard.ts"), /await requireCmsAdmin\(\)/);
  assert.match(source("src/app/(admin)/admin/(protected)/page.tsx"), /await getCmsDashboard\(\)/);
  const actions = source("src/app/(admin)/admin/actions.ts");
  assert.doesNotMatch(actions, /signUp\(|getSession\(|service_role/);
  assert.match(actions, /redirect\("\/admin"\)/);
});
