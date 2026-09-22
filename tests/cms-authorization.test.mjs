import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

const user = { id: "10000000-0000-4000-8000-000000000001", email: "test@example.invalid" };
function setup({ identity = user, authError = null, row = { user_id: user.id, role: "admin", is_active: true }, dbError = null, fails = false,
  aal = "aal2", factors = [{ id: "factor-own", status: "verified", factor_type: "totp" }], pendingPassword = false,
  methods = ["password"], claimsError = null, subject = user.id } = {}) {
  const calls = [];
  const client = {
    auth: {
      async getUser() { calls.push("verified-user"); if (fails) throw Error("internal secret"); return { data: { user: identity && { ...identity, factors } }, error: authError }; },
      async getClaims() { calls.push("verified-claims"); return { data: { claims: { sub: subject, role: "authenticated", aal, amr: methods.map((method) => ({ method })) } }, error: claimsError }; },
      getSession() { throw Error("Unverified cookie identity must not be used"); },
    },
    async rpc(name) {
      calls.push(name);
      assert.ok(["is_cms_member_for_onboarding", "cms_invite_password_pending"].includes(name));
      return { error: dbError, data: name === "cms_invite_password_pending" ? pendingPassword :
        !!row && row.user_id === identity.id && row.role === "admin" && row.is_active === true };
    },
    from(table) {
      calls.push(table);
      return { select(columns) { calls.push(columns); return { eq(column, id) {
        assert.equal(column, "user_id"); assert.equal(id, identity.id);
        return { async maybeSingle() { return { data: row, error: dbError }; } };
      } }; } };
    },
  };
  const server = { createCmsServerClient: async () => client, clearCmsCookies: async () => calls.push("clear-cookies") };
  const load = createSourceLoader({ env: { CMS_SUPABASE_URL: "http://127.0.0.1:56321", CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only" }, mocks: {
    "./server": server,
    "@/cms/server": server,
    "next/navigation": { redirect(destination) { throw Object.assign(new Error("Redirect"), { destination }); } },
  } });
  return { ...load("src/cms/authorization.ts"), client, calls, load };
}

test("CMS boundary validates Auth identity before membership and returns a minimal context", async () => {
  const { requireCmsAdmin, calls } = setup();
  assert.deepEqual(plain(await requireCmsAdmin()), { userId: user.id, email: user.email, role: "admin" });
  assert.deepEqual(calls, adminCalls);
});

const adminCalls = ["verified-user", "verified-claims", "is_cms_member_for_onboarding", "cms_invite_password_pending", "cms_admin_members", "user_id, role, is_active"];

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
    if (options.identity !== null) assert.ok(calls.includes("is_cms_member_for_onboarding"));
  });
}

test("direct dashboard read independently validates active membership", async () => {
  const { load, calls } = setup();
  const { getCmsDashboard } = load("src/cms/dashboard.ts");
  assert.deepEqual(plain(await getCmsDashboard()), { admin: { userId: user.id, email: user.email, role: "admin" } });
  assert.deepEqual(calls, adminCalls);
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
  assert.match(actions, /cmsStepDestination/);
});

for (const [name, options, destination] of [
  ["AAL1 without factor", { aal: "aal1", factors: [] }, "/admin/mfa/setup"],
  ["AAL1 with verified factor", { aal: "aal1" }, "/admin/mfa/challenge"],
  ["pending unverified factor", { aal: "aal1", factors: [{ id: "pending", status: "unverified", factor_type: "totp" }] }, "/admin/mfa/challenge"],
  ["invited member without password", { aal: "aal1", pendingPassword: true, methods: ["otp"], factors: [] }, "/admin/onboarding/password"],
  ["AAL2 cannot skip initial password", { pendingPassword: true, methods: ["otp", "totp"] }, "/admin/onboarding/password"],
]) {
  test(`${name}: onboarding is allowed but direct dashboard/data access is denied`, async () => {
    const { load, requireCmsAdmin, requireCmsMemberForOnboarding, calls } = setup(options);
    const member = await requireCmsMemberForOnboarding();
    assert.equal(load("src/cms/onboarding.ts").cmsStepDestination(member.step), destination);
    await assert.rejects(requireCmsAdmin(), (error) => error.reason === member.step);
    await assert.rejects(load("src/cms/dashboard.ts").getCmsDashboard(), (error) => error.destination === destination);
    assert.ok(!calls.includes("cms_admin_members"), "onboarding never reads protected rows");
  });
}

for (const options of [
  { claimsError: Error("invalid signature") }, { subject: "forged-subject" }, { aal: "aal3" }, { aal: null },
]) {
  test(`untrusted/mismatched assurance claims never grant admin or onboarding (${JSON.stringify(options)})`, async () => {
    const { requireCmsAdmin, requireCmsMemberForOnboarding, calls } = setup(options);
    await assert.rejects(requireCmsAdmin(), (error) => error.reason === "anonymous");
    await assert.rejects(requireCmsMemberForOnboarding(), (error) => error.reason === "anonymous");
    assert.ok(!calls.includes("is_cms_member_for_onboarding"));
  });
}

test("ordinary password/recovery sessions cannot masquerade as initial invitation sessions", async () => {
  for (const methods of [["password"], ["recovery"], []]) {
    await assert.rejects(setup({ pendingPassword: true, methods }).requireCmsMemberForOnboarding(), (error) => error.reason === "forbidden");
  }
});

test("invitation accepts only exact configured origin, path, token_hash and invite type", () => {
  const { load } = setup();
  const { parseCmsInvitation } = load("src/cms/invitation.ts");
  const origin = "http://127.0.0.1:56300";
  const token = "a".repeat(64);
  const valid = `${origin}/admin/auth/confirm?token_hash=${token}&type=invite`;
  assert.equal(parseCmsInvitation(valid), token);
  for (const invalid of [
    valid.replace(origin, "https://evil.invalid"), valid.replace(origin, "http://localhost:56300"),
    valid.replace("type=invite", "type=recovery"), valid.replace("type=invite", "type=signup"),
    valid.replace(token, "short"), `${valid}&type=invite`, `${valid}&token_hash=${token}`,
    `${valid}&next=https://evil.invalid`, `${valid}&next=/admin`, `${valid}&redirect_to=//evil.invalid`,
    `${valid}#access_token=forged`, valid.replace("/admin/auth/confirm", "/admin/login"),
  ]) assert.throws(() => parseCmsInvitation(invalid), /Invalid CMS invitation/);
  const preview = createSourceLoader({ env: { CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co", CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only", VERCEL: "1", VERCEL_ENV: "preview" } });
  const previewOrigin = preview("src/cms/config.ts").getCmsAppOrigin();
  const parser = preview("src/cms/invitation.ts").parseCmsInvitation;
  assert.equal(parser(valid.replace(origin, previewOrigin)), token);
  for (const other of ["https://www.cleanbrothers.co.il", "https://cleanbrothers.vercel.app", `${previewOrigin}.evil.invalid`, origin]) {
    assert.throws(() => parser(valid.replace(origin, other)), /Invalid CMS invitation/);
  }
});

test("invalid invitation is rejected before token consumption; expired or nonmember invites fail closed", async () => {
  const { load, client } = setup({ aal: "aal1", factors: [], pendingPassword: true, methods: ["otp"] });
  const { confirmCmsInvitation } = load("src/cms/invitation.ts");
  let verifications = 0;
  client.auth.verifyOtp = async (input) => { verifications++; assert.equal(input.type, "invite"); return { error: null }; };
  const valid = `http://127.0.0.1:56300/admin/auth/confirm?token_hash=${"b".repeat(64)}&type=invite`;
  await assert.rejects(confirmCmsInvitation(client, `${valid}&next=//evil.invalid`));
  assert.equal(verifications, 0);
  await confirmCmsInvitation(client, valid);
  client.auth.verifyOtp = async () => ({ error: Error("expired token with private detail") });
  await assert.rejects(confirmCmsInvitation(client, valid), /Invalid CMS invitation/);
  const outsider = setup({ row: null });
  outsider.client.auth.verifyOtp = async () => ({ error: null });
  await assert.rejects(outsider.load("src/cms/invitation.ts").confirmCmsInvitation(outsider.client, valid), (error) => error.reason === "forbidden");
});

test("confirmation validates the HTTP host/protocol without trusting Next's internal localhost origin", () => {
  const { cmsInvitationRequestUrl } = setup().load("src/cms/invitation.ts");
  const path = `/admin/auth/confirm?token_hash=${"a".repeat(64)}&type=invite`;
  assert.equal(cmsInvitationRequestUrl(`http://localhost:56300${path}`, "127.0.0.1:56300", "http"), `http://127.0.0.1:56300${path}`);
  for (const host of [null, "localhost:56300", "evil.invalid", "127.0.0.1:56300.evil.invalid", "127.0.0.1:56300,evil.invalid"]) {
    assert.throws(() => cmsInvitationRequestUrl(`http://127.0.0.1:56300${path}`, host, "http"));
  }
  assert.throws(() => cmsInvitationRequestUrl(`http://localhost:56300${path}`, "127.0.0.1:56300", "https,http"));
});

test("initial passwords require length, mixed case, digit and symbol", () => {
  const { isStrongCmsPassword } = setup().load("src/cms/invitation.ts");
  assert.equal(isStrongCmsPassword("Private-Synthetic!123"), true);
  for (const password of [null, "short!A1", "lowercase-only!123", "UPPERCASE-ONLY!123", "NoNumbersHere!", "NoSymbolsHere123", "A1!" + "a".repeat(126)]) {
    assert.equal(isStrongCmsPassword(password), false);
  }
});

test("first-password action denies ordinary active AAL1/AAL2, inactive and nonmember sessions", async () => {
  for (const options of [{ aal: "aal1" }, {}, { row: null }, { row: { user_id: user.id, role: "admin", is_active: false } }]) {
    const { load, client } = setup(options);
    let mutated = false;
    client.auth.updateUser = async () => { mutated = true; return { error: null }; };
    const input = new FormData(); input.set("password", "Private-Synthetic!123"); input.set("confirmPassword", "Private-Synthetic!123");
    const result = await load("src/app/(admin)/admin/onboarding-actions.ts").setCmsInitialPassword({ error: "" }, input);
    assert.match(result.error, /לא ניתן/);
    assert.equal(mutated, false);
  }
});

test("enrollment rejects existing factors, nonmembers and incomplete invitations", async () => {
  for (const options of [{ aal: "aal1" }, { row: null }, { aal: "aal1", factors: [{ id: "pending", status: "unverified", factor_type: "totp" }] }, { aal: "aal1", pendingPassword: true, methods: ["otp"], factors: [] }]) {
    const { load, client } = setup(options);
    let enrolled = false;
    client.auth.mfa = { enroll: async () => { enrolled = true; return { error: Error("fixture") }; } };
    assert.match((await load("src/app/(admin)/admin/onboarding-actions.ts").enrollCmsTotp()).error, /לא ניתן/);
    assert.equal(enrolled, false);
  }
});

test("enrollment returns only factor ID and data-image QR, never raw secret or otpauth URI", async () => {
  const { load, client } = setup({ aal: "aal1", factors: [] });
  client.auth.mfa = { enroll: async () => ({ error: null, data: { id: "own-factor", totp: { qr_code: "data:image/svg+xml;utf-8,synthetic", secret: "DO-NOT-RETURN", uri: "otpauth://DO-NOT-RETURN" } } }) };
  const result = await load("src/app/(admin)/admin/onboarding-actions.ts").enrollCmsTotp();
  assert.deepEqual(plain(result), { error: "", factorId: "own-factor", qrCode: "data:image/svg+xml;utf-8,synthetic" });
});

test("MFA action rejects another factor, invalid codes, and a pending factor when a verified one exists", async () => {
  for (const [factorId, code, factors] of [
    ["another-factor", "123456", [{ id: "factor-own", status: "verified", factor_type: "totp" }]],
    ["factor-own", "not-otp", [{ id: "factor-own", status: "verified", factor_type: "totp" }]],
    ["pending", "123456", [{ id: "pending", status: "unverified", factor_type: "totp" }, { id: "factor-own", status: "verified", factor_type: "totp" }]],
  ]) {
    const { load, client } = setup({ aal: "aal1", factors });
    let challenged = false;
    client.auth.mfa = { challengeAndVerify: async () => { challenged = true; return { error: null }; } };
    const input = new FormData(); input.set("factorId", factorId); input.set("code", code);
    assert.match((await load("src/app/(admin)/admin/onboarding-actions.ts").verifyCmsTotp({ error: "" }, input)).error, /לא ניתן/);
    assert.equal(challenged, false);
  }
});

test("MFA API success without server-verified AAL2 never grants dashboard access", async () => {
  const { load, client } = setup({ aal: "aal1" });
  client.auth.mfa = { challengeAndVerify: async () => ({ error: null }) };
  const input = new FormData(); input.set("factorId", "factor-own"); input.set("code", "123456");
  assert.match((await load("src/app/(admin)/admin/onboarding-actions.ts").verifyCmsTotp({ error: "" }, input)).error, /לא ניתן/);
});

test("full admin authorization rechecks the protected row after onboarding eligibility", async () => {
  const row = { user_id: user.id, role: "admin", is_active: true };
  const { client, requireCmsAdmin } = setup({ row });
  const originalRpc = client.rpc;
  client.rpc = async (name) => {
    const result = await originalRpc(name);
    if (name === "cms_invite_password_pending") row.is_active = false;
    return result;
  };
  await assert.rejects(requireCmsAdmin(), (error) => error.reason === "forbidden");
});

test("MFA verification rechecks membership even if the Auth verification succeeds", async () => {
  const row = { user_id: user.id, role: "admin", is_active: true };
  const { load, client } = setup({ row, aal: "aal1" });
  client.auth.mfa = { challengeAndVerify: async () => { row.is_active = false; return { error: null }; } };
  const input = new FormData(); input.set("factorId", "factor-own"); input.set("code", "123456");
  assert.match((await load("src/app/(admin)/admin/onboarding-actions.ts").verifyCmsTotp({ error: "" }, input)).error, /לא ניתן/);
});
