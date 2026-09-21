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

test("CMS cookies permit HTTP only on explicit local loopback outside Vercel", () => {
  const local = { CMS_SUPABASE_URL: "http://127.0.0.1:56321", CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only" };
  for (const nodeEnv of ["development", "production", "test"]) {
    const config = createSourceLoader({ nodeEnv, env: local })("src/cms/config.ts");
    assert.equal(config.getCmsConfig().url, local.CMS_SUPABASE_URL);
    assert.equal(config.cmsCookieOptions.secure, false);
  }
  for (const env of [
    {},
    { ...local, CMS_SUPABASE_URL: "https://unapproved.supabase.co" },
    { ...local, VERCEL: "1", VERCEL_ENV: "preview" },
    { ...local, VERCEL: "1", VERCEL_ENV: "production" },
    { ...local, VERCEL_ENV: "preview" },
  ]) {
    const config = createSourceLoader({ env })("src/cms/config.ts");
    assert.throws(() => config.getCmsConfig(), /CMS configuration unavailable/);
    assert.equal(config.cmsCookieOptions.secure, true);
    assert.equal(config.cmsCookieOptions.httpOnly, true);
    assert.equal(config.cmsCookieOptions.sameSite, "lax");
    assert.equal(config.cmsCookieOptions.path, "/admin");
    assert.equal(config.cmsCookieOptions.domain, undefined);
  }
});

test("CMS cloud is restricted to the verified project on Vercel Preview with Secure cookies", () => {
  const url = "https://plbwefnwussxlglscfpn.supabase.co";
  const preview = { CMS_SUPABASE_URL: url, CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only", VERCEL: "1", VERCEL_ENV: "preview" };
  const config = createSourceLoader({ env: preview })("src/cms/config.ts");
  assert.equal(config.getCmsConfig().url, url);
  assert.equal(config.cmsCookieOptions.secure, true);
  assert.equal(config.cmsCookieOptions.httpOnly, true);
  assert.equal(config.cmsCookieOptions.sameSite, "lax");
  assert.equal(config.cmsCookieOptions.path, "/admin");
  for (const env of [
    { ...preview, VERCEL_ENV: "production" },
    { ...preview, VERCEL_ENV: "development" },
    { ...preview, VERCEL_ENV: undefined },
    { ...preview, VERCEL: undefined },
    { ...preview, CMS_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test_only" },
    ...["http://plbwefnwussxlglscfpn.supabase.co", `${url}/`, `${url}?x=1`, `${url}:443`, "https://other-project.supabase.co", "https://plbwefnwussxlglscfpn.supabase.co.evil.invalid"].map((CMS_SUPABASE_URL) => ({ ...preview, CMS_SUPABASE_URL })),
  ]) {
    assert.throws(() => createSourceLoader({ env })("src/cms/config.ts").getCmsConfig(), /CMS configuration unavailable/);
  }
});

test("CMS logout clears only CMS cookies with the same Secure and path policy", async () => {
  for (const [env, secure] of [
    [{ CMS_SUPABASE_URL: "http://127.0.0.1:56321" }, false],
    [{ VERCEL: "1", VERCEL_ENV: "preview" }, true],
    [{}, true],
  ]) {
    const cleared = [];
    const load = createSourceLoader({ env, mocks: {
      "next/headers": { cookies: async () => ({
        getAll: () => ["cb-cms-auth", "cb-cms-auth.0", "marketing-consent", "cb-cms-auth-other"].map((name) => ({ name, value: "fixture" })),
        set: (name, value, options) => cleared.push({ name, value, options: plain(options) }),
      }) },
    } });
    await load("src/cms/server.ts").clearCmsCookies();
    assert.deepEqual(cleared.map(({ name }) => name), ["cb-cms-auth", "cb-cms-auth.0"]);
    for (const { value, options } of cleared) {
      assert.equal(value, "");
      assert.equal(options.maxAge, 0);
      assert.equal(options.secure, secure);
      assert.equal(options.httpOnly, true);
      assert.equal(options.sameSite, "lax");
      assert.equal(options.path, "/admin");
      assert.equal(options.domain, undefined);
    }
  }
});

test("Supabase SSR login, refresh and logout preserve HTTPS CMS cookie options", async () => {
  const url = "https://plbwefnwussxlglscfpn.supabase.co";
  const jar = new Map();
  const writes = [];
  let sequence = 0;
  const load = createSourceLoader({
    env: { CMS_SUPABASE_URL: url, CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only", VERCEL: "1", VERCEL_ENV: "preview" },
    fetchImpl: async (input) => {
      const endpoint = String(input);
      assert.ok(endpoint.startsWith(`${url}/auth/v1/`));
      if (endpoint.includes("/logout")) return new Response(null, { status: 204 });
      const now = Math.floor(Date.now() / 1000);
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
      const access_token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, role: "authenticated", iat: now, exp: now + 3600, sequence: ++sequence })}.synthetic-signature`;
      const body = endpoint.includes("/user") ? user : { access_token, refresh_token: "synthetic-refresh", token_type: "bearer", expires_in: 3600, user };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  const { createCmsClient } = load("src/cms/client.ts");
  const client = createCmsClient({
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (updates) => {
      writes.push(...plain(updates));
      for (const { name, value } of updates) {
        if (value) jar.set(name, value);
        else jar.delete(name);
      }
    },
  });
  assert.equal((await client.auth.signInWithPassword({ email: user.email, password: "synthetic-only" })).error, null);
  assert.ok(writes.some(({ value }) => value));
  const afterLogin = writes.length;
  assert.equal((await client.auth.refreshSession()).error, null);
  assert.ok(writes.length > afterLogin);
  assert.equal((await client.auth.signOut()).error, null);
  assert.ok(writes.some(({ value, options }) => value === "" && options.maxAge === 0));
  for (const { name, options } of writes) {
    assert.match(name, /^cb-cms-auth(?:\.\d+)?$/);
    assert.equal(options.secure, true);
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.path, "/admin");
    assert.equal(options.domain, undefined);
  }
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
