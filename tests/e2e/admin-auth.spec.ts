import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { createHmac, randomUUID } from "node:crypto";
import { getLocalStack, localSql, appOrigin } from "../../scripts/cms-local.mjs";

const stack = getLocalStack();
const privileged = createClient(stack.url, stack.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const password = `Cb-Test!${randomUUID()}`;
const identities = {
  active: { id: "", email: `cms-active-${randomUUID()}@example.invalid` },
  inactive: { id: "", email: `cms-inactive-${randomUUID()}@example.invalid` },
  outsider: { id: "", email: `cms-outsider-${randomUUID()}@example.invalid` },
};

const extraIds: string[] = [];

test.beforeEach(async () => {
  expect(localSql("select count(*) from public.cms_admin_members")).toBe("0");
  for (const identity of Object.values(identities)) {
    const { data, error } = await privileged.auth.admin.createUser({ email: identity.email, password, email_confirm: true, user_metadata: { role: "admin" } });
    if (error || !data.user) throw new Error("Local fixture creation failed");
    identity.id = data.user.id;
  }
  localSql(`insert into public.cms_admin_members (user_id, is_active) values ('${identities.active.id}', true), ('${identities.inactive.id}', false)`);
});

test.afterEach(async () => {
  for (const id of [...Object.values(identities).map((identity) => identity.id), ...extraIds.splice(0)]) {
    if (id) {
      const { error } = await privileged.auth.admin.deleteUser(id);
      if (error) throw new Error("Local fixture cleanup failed");
    }
  }
  usedCounters.clear();
  expect(localSql("select count(*) from auth.users")).toBe("0");
  expect(localSql("select count(*) from public.cms_admin_members")).toBe("0");
});

test.beforeEach(async ({ context }) => {
  // Fail on unexpected external requests, including all CRM/marketing hosts.
  await context.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== appOrigin) {
      await route.abort();
      throw new Error("Unexpected external browser request");
    }
    await route.continue();
  });
});

async function login(page: Page, email = identities.active.email, secret = password) {
  await page.goto("/admin/login");
  await page.getByLabel("כתובת אימייל").fill(email);
  await page.getByLabel("סיסמה", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "כניסה למערכת" }).click();
}

async function authenticatedContext(context: BrowserContext, email: string, expired = false, mfa: "none" | "pending" | "verified" = "verified") {
  const jar = new Map<string, string>();
  const client = createServerClient(stack.url, stack.key, {
    cookieOptions: { name: "cb-cms-auth", path: "/admin", httpOnly: true, sameSite: "lax", secure: false },
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (updates) => { for (const { name, value } of updates) jar.set(name, value); },
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Local session fixture failed");
  let secret = "";
  let factorId = "";
  if (mfa !== "none") {
    const enrolled = await client.auth.mfa.enroll({ factorType: "totp" });
    if (enrolled.error || !enrolled.data) throw new Error("Local factor fixture failed");
    secret = enrolled.data.totp.secret;
    factorId = enrolled.data.id;
    if (mfa === "verified") {
      const verified = await client.auth.mfa.challengeAndVerify({ factorId, code: await totp(secret) });
      if (verified.error) throw new Error("Local TOTP fixture failed");
    }
  }
  if (expired) {
    // Keep the real signed JWT/refresh token; only expire the SDK's stored timer
    // to force a genuine Auth-server refresh on the next server request.
    const serialized = [...jar.values()].join("");
    const session = JSON.parse(Buffer.from(serialized.slice("base64-".length), "base64url").toString());
    session.expires_at = Math.floor(Date.now() / 1000) - 60;
    jar.clear();
    const encoded = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
    for (let offset = 0; offset < encoded.length; offset += 3000) jar.set(`cb-cms-auth.${offset / 3000}`, encoded.slice(offset, offset + 3000));
  }
  await context.addCookies([...jar].map(([name, value]) => ({ name, value, domain: "127.0.0.1", path: "/admin", httpOnly: true, sameSite: "Lax" as const })));
  return { client, secret, factorId };
}

// RFC 6238 TOTP generation exists only in the isolated test runner. No fixtures,
// codes, token hashes, cookies or enrollment secrets are written to disk/logs.
const usedCounters = new Map<string, number>();
async function totp(secret: string) {
  let counter = Math.floor(Date.now() / 30_000);
  if (usedCounters.get(secret) === counter) {
    await new Promise((resolve) => setTimeout(resolve, 30_000 - Date.now() % 30_000 + 200));
    counter = Math.floor(Date.now() / 30_000);
  }
  usedCounters.set(secret, counter);
  const bits = [...secret.replace(/=+$/, "").toUpperCase()].map((char) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const message = Buffer.alloc(8); message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  return String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

function browserClient(context: BrowserContext) {
  return createServerClient(stack.url, stack.key, {
    cookieOptions: { name: "cb-cms-auth" },
    cookies: { getAll: async () => (await context.cookies()).filter((cookie) => cookie.name.startsWith("cb-cms-auth")), setAll: () => {} },
  });
}

async function assertPrivateScreen(page: Page) {
  const response = await page.reload();
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scripts = await page.locator("script").evaluateAll((nodes) => nodes.map((node) => node.outerHTML).join("\n"));
  expect(scripts).not.toMatch(/googletagmanager|connect\.facebook|google-consent-defaults|GoogleAdsTag|MarketingAttributionTracker|SummerAc/);
  expect(await page.evaluate(() => ["gtag", "fbq", "dataLayer"].some((name) => name in window))).toBe(false);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("link", { name: "צפייה באתר" })).toHaveCount(0);
}

test("anonymous admin and future descendants redirect to accessible login", async ({ page }) => {
  for (const route of ["/admin", "/admin/future-module", "/admin/mfa/setup", "/admin/mfa/challenge", "/admin/onboarding/password"]) {
    await page.goto(route);
    await expect(page).toHaveURL(`${appOrigin}/admin/login`);
    await expect(page.getByRole("heading", { name: "כניסה לניהול האתר" })).toBeVisible();
  }
});

test("invalid login returns a generic Hebrew error without internal details", async ({ page }) => {
  await login(page, identities.active.email, "wrong-password");
  await expect(page.locator("main").getByRole("alert")).toHaveText("לא ניתן להיכנס למערכת עם הפרטים שנמסרו. בדקו את הפרטים ונסו שוב.");
  await expect(page).toHaveURL(`${appOrigin}/admin/login`);
  expect(await page.locator("body").innerText()).not.toMatch(/AuthApiError|invalid_credentials|stack trace|56321|service_role/);
});

test("active AAL2 admin can access dashboard; login redirects; response is private and cookies are HttpOnly", async ({ page, context }) => {
  await authenticatedContext(context, identities.active.email);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "לוח הבקרה" })).toBeVisible();
  await expect(page.getByText(identities.active.email, { exact: true })).toBeVisible();
  const response = await page.goto("/admin");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  const cookies = (await context.cookies()).filter((cookie) => cookie.name.startsWith("cb-cms-auth"));
  expect(cookies.length).toBeGreaterThan(0);
  expect(cookies.every((cookie) => cookie.httpOnly && cookie.path === "/admin" && cookie.sameSite === "Lax")).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain("cb-cms-auth");
  await page.goto("/admin/login?next=https://example.invalid");
  await expect(page).toHaveURL(`${appOrigin}/admin`);
});

for (const kind of ["outsider", "inactive"] as const) {
  test(`valid ${kind} identity is denied by login AND by a direct authenticated request`, async ({ page, context }) => {
    await login(page, identities[kind].email);
    await expect(page.locator("main").getByRole("alert")).toContainText("לא ניתן להיכנס");
    await authenticatedContext(context, identities[kind].email, false, "none");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?error=forbidden$/);
    await expect(page.locator("main").getByRole("alert")).toHaveText("לחשבון זה אין הרשאת גישה לניהול האתר.");
    await expect(page.getByRole("heading", { name: "לוח הבקרה" })).toHaveCount(0);
    await page.getByRole("button", { name: "יציאה מהחשבון" }).click();
    await expect(page).toHaveURL(`${appOrigin}/admin/login`);
  });
}

test("logout removes access while preserving public consent and attribution cookies", async ({ page, context }) => {
  await context.addCookies([
    { name: "cb_analytics_consent", value: "rejected", url: appOrigin },
    { name: "cb_first_touch_attribution", value: "unchanged", url: appOrigin },
  ]);
  await authenticatedContext(context, identities.active.email);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "לוח הבקרה" })).toBeVisible();
  await page.getByRole("button", { name: "יציאה מהמערכת" }).click();
  await expect(page).toHaveURL(`${appOrigin}/admin/login`);
  await page.goto("/admin");
  await expect(page).toHaveURL(`${appOrigin}/admin/login`);
  const cookies = await context.cookies();
  expect(cookies.filter((cookie) => cookie.name.startsWith("cb-cms-auth"))).toHaveLength(0);
  expect(cookies.find((cookie) => cookie.name === "cb_analytics_consent")?.value).toBe("rejected");
  expect(cookies.find((cookie) => cookie.name === "cb_first_touch_attribution")?.value).toBe("unchanged");
});

test("session refresh writes cookies and the resulting session survives another request", async ({ page, context }) => {
  await authenticatedContext(context, identities.active.email, true);
  const before = (await context.cookies()).filter((cookie) => cookie.name.startsWith("cb-cms-auth")).map((cookie) => cookie.value).join("");
  const response = await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "לוח הבקרה" })).toBeVisible();
  expect(response?.headers()["cache-control"]).toContain("no-store");
  const after = (await context.cookies()).filter((cookie) => cookie.name.startsWith("cb-cms-auth")).map((cookie) => cookie.value).join("");
  expect(after === before).toBe(false);
  await page.reload();
  await expect(page.getByRole("heading", { name: "לוח הבקרה" })).toBeVisible();
});

test("revoking membership denies an already logged-in AAL2 administrator immediately", async ({ page, context }) => {
  await authenticatedContext(context, identities.active.email);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "לוח הבקרה" })).toBeVisible();
  try {
    localSql(`update public.cms_admin_members set is_active = false where user_id = '${identities.active.id}'`);
    await page.reload();
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator("main").getByRole("alert")).toContainText("אין הרשאת גישה");
  } finally {
    localSql(`update public.cms_admin_members set is_active = true where user_id = '${identities.active.id}'`);
  }
});

test("auth and dashboard screens are private, Hebrew RTL and free of public navigation/tracking", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  await assertPrivateScreen(page);
  await authenticatedContext(context, identities.active.email);
  await page.goto("/admin");
  await assertPrivateScreen(page);
});

test("Supabase itself rejects public signup and anonymous membership reads", async () => {
  const client = createClient(stack.url, stack.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const signup = await client.auth.signUp({ email: `no-signup-${randomUUID()}@example.invalid`, password });
  expect(signup.error?.code).toBe("signup_disabled");
  expect(signup.data.user).toBeNull();
  const read = await client.from("cms_admin_members").select("*");
  expect(read.error).not.toBeNull();
});

test("password login at AAL1 routes only to setup; direct membership data and password setup are denied", async ({ page, context }) => {
  await login(page);
  await expect(page).toHaveURL(`${appOrigin}/admin/mfa/setup`);
  await expect(page.getByRole("heading", { name: "הגדרת אימות דו־שלבי" })).toBeVisible();
  const client = browserClient(context);
  expect((await client.auth.getClaims()).data?.claims.aal).toBe("aal1");
  expect((await client.rpc("is_cms_member_for_onboarding")).data).toBe(true);
  expect((await client.rpc("is_cms_admin_aal2")).data).toBe(false);
  expect((await client.from("cms_admin_members").select("user_id")).data).toEqual([]);
  for (const route of ["/admin", "/admin/onboarding/password", "/admin/mfa/challenge"]) {
    await page.goto(route);
    await expect(page).toHaveURL(`${appOrigin}/admin/mfa/setup`);
    await expect(page.getByRole("heading", { name: "לוח הבקרה" })).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await assertPrivateScreen(page);
  await page.getByRole("button", { name: "יציאה מהחשבון" }).click();
  await expect(page).toHaveURL(`${appOrigin}/admin/login`);
  await page.goto("/admin/mfa/setup");
  await expect(page).toHaveURL(`${appOrigin}/admin/login`);
});

test("setup enrolls TOTP, renders a private QR once and resumes pending verification after reload", async ({ page, context }) => {
  await login(page);
  await expect(page).toHaveURL(`${appOrigin}/admin/mfa/setup`);
  await page.getByRole("button", { name: "הצגת קוד QR" }).click();
  const qr = page.getByRole("img", { name: "קוד QR להגדרת אימות דו־שלבי" });
  await expect(qr).toBeVisible();
  expect((await qr.getAttribute("src"))?.startsWith("data:image/svg+xml;")).toBe(true);
  await expect(page.getByLabel("קוד אימות", { exact: true })).toBeVisible();
  const factors = await browserClient(context).auth.mfa.listFactors();
  expect(factors.data?.all.filter((factor) => factor.factor_type === "totp" && factor.status === "unverified").length).toBe(1);
  await page.reload();
  await expect(page).toHaveURL(`${appOrigin}/admin/mfa/challenge`);
  await expect(page.getByRole("img")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertPrivateScreen(page);
});

test("pending TOTP is verified through the UI and server claims/RLS reach AAL2", async ({ page, context }) => {
  const { secret } = await authenticatedContext(context, identities.active.email, false, "pending");
  await page.goto("/admin");
  await expect(page).toHaveURL(`${appOrigin}/admin/mfa/challenge`);
  const code = await totp(secret);
  await page.getByLabel("קוד אימות", { exact: true }).fill(String((Number(code) + 1) % 1_000_000).padStart(6, "0"));
  await page.getByRole("button", { name: "אימות והמשך" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("לא ניתן להשלים");
  await expect(page.getByRole("heading", { name: "לוח הבקרה" })).toHaveCount(0);
  // A failed verification does not consume the valid code.
  await page.getByLabel("קוד אימות", { exact: true }).fill(code);
  await page.getByRole("button", { name: "אימות והמשך" }).click();
  await expect(page).toHaveURL(`${appOrigin}/admin`);
  const client = browserClient(context);
  expect((await client.auth.getClaims()).data?.claims.aal).toBe("aal2");
  expect((await client.rpc("is_cms_admin_aal2")).data).toBe(true);
  expect((await client.from("cms_admin_members").select("user_id")).data).toEqual([{ user_id: identities.active.id }]);
});

test("later password login requires a fresh challenge; AAL1 cannot remove a verified factor", async ({ page, context }) => {
  test.setTimeout(65_000);
  const { client, secret, factorId } = await authenticatedContext(context, identities.active.email);
  await client.auth.signOut({ scope: "local" });
  await context.clearCookies();
  await login(page);
  await expect(page).toHaveURL(`${appOrigin}/admin/mfa/challenge`);
  const aal1 = browserClient(context);
  expect((await aal1.auth.getClaims()).data?.claims.aal).toBe("aal1");
  expect((await aal1.auth.mfa.unenroll({ factorId })).error).not.toBeNull();
  await page.goto("/admin/mfa/setup");
  await expect(page).toHaveURL(`${appOrigin}/admin/mfa/challenge`);
  await page.getByLabel("קוד אימות", { exact: true }).fill(await totp(secret));
  await page.getByRole("button", { name: "אימות והמשך" }).click();
  await expect(page).toHaveURL(`${appOrigin}/admin`);
  expect((await browserClient(context).auth.getClaims()).data?.claims.aal).toBe("aal2");
});

for (const kind of ["inactive", "outsider"] as const) {
  test(`${kind} with genuine AAL2 is denied dashboard and every onboarding route`, async ({ page, context }) => {
    await authenticatedContext(context, identities[kind].email);
    expect((await browserClient(context).auth.getClaims()).data?.claims.aal).toBe("aal2");
    for (const route of ["/admin", "/admin/mfa/setup", "/admin/mfa/challenge", "/admin/onboarding/password"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/login\?error=forbidden$/);
      await expect(page.locator("main").getByRole("alert")).toContainText("אין הרשאת גישה");
    }
    expect((await browserClient(context).rpc("is_cms_admin_aal2")).data).toBe(false);
  });
}

async function syntheticInvitation(member = true) {
  // generateLink creates a local fixture but sends no email, even to test SMTP.
  const result = await privileged.auth.admin.generateLink({ type: "invite", email: `cms-invited-${randomUUID()}@example.invalid`, options: { redirectTo: `${appOrigin}/admin/auth/confirm` } });
  if (result.error || !result.data.user || !result.data.properties.hashed_token) throw new Error("Local invitation fixture failed");
  const id = result.data.user.id;
  extraIds.push(id);
  if (member) localSql(`insert into public.cms_admin_members (user_id, is_active) values ('${id}', true)`);
  return { id, url: `/admin/auth/confirm?token_hash=${result.data.properties.hashed_token}&type=invite` };
}

test("SSR invite confirms, sets an initial password once, then requires MFA without URL-fragment sessions", async ({ page, context }) => {
  const invite = await syntheticInvitation();
  await page.goto(invite.url);
  await expect(page).toHaveURL(`${appOrigin}/admin/onboarding/password`);
  await expect(page.getByRole("heading", { name: "הגדרת סיסמה ראשונה" })).toBeVisible();
  expect((await browserClient(context).rpc("cms_invite_password_pending")).data).toBe(true);
  expect((await browserClient(context).rpc("complete_cms_initial_password_setup")).data).toBe(false);
  expect((await browserClient(context).rpc("is_cms_admin_aal2")).data).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertPrivateScreen(page);
  await page.goto("/admin/mfa/setup");
  await expect(page).toHaveURL(`${appOrigin}/admin/onboarding/password`);
  for (const label of ["סיסמה חדשה", "אימות הסיסמה"]) await page.getByLabel(label, { exact: true }).fill("weakpasswordonly");
  await page.getByRole("button", { name: "שמירת סיסמה והמשך" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("לא ניתן להגדיר");
  for (const label of ["סיסמה חדשה", "אימות הסיסמה"]) await page.getByLabel(label, { exact: true }).fill(password);
  await page.getByRole("button", { name: "שמירת סיסמה והמשך" }).click();
  await expect(page).toHaveURL(`${appOrigin}/admin/mfa/setup`);
  expect((await browserClient(context).rpc("cms_invite_password_pending")).data).toBe(false);
  expect((await browserClient(context).auth.getClaims()).data?.claims.aal).toBe("aal1");
  await page.goto("/admin/onboarding/password");
  await expect(page).toHaveURL(`${appOrigin}/admin/mfa/setup`);
  const enrolled = await browserClient(context).auth.mfa.enroll({ factorType: "totp" });
  if (enrolled.error || !enrolled.data) throw new Error("Local invited-user factor fixture failed");
  await page.goto("/admin");
  await expect(page).toHaveURL(`${appOrigin}/admin/mfa/challenge`);
  await page.getByLabel("קוד אימות", { exact: true }).fill(await totp(enrolled.data.totp.secret));
  await page.getByRole("button", { name: "אימות והמשך" }).click();
  await expect(page).toHaveURL(`${appOrigin}/admin`);
  expect((await browserClient(context).auth.getClaims()).data?.claims.aal).toBe("aal2");
  const completion = await browserClient(context).from("cms_admin_members").select("password_setup_completed_at").single();
  expect(!!completion.data?.password_setup_completed_at).toBe(true);
  await page.goto(invite.url);
  await expect(page).toHaveURL(`${appOrigin}/admin/login?error=invite`);
  expect((await context.cookies()).filter((cookie) => cookie.name.startsWith("cb-cms-auth")).length).toBe(0);
});

test("unsafe redirects and wrong confirmation types are rejected before consuming an invitation", async ({ page, context }) => {
  const invite = await syntheticInvitation();
  for (const invalid of [`${invite.url}&next=https://example.invalid`, invite.url.replace("type=invite", "type=recovery"), "/admin/auth/confirm?type=invite&token_hash=invalid"]) {
    await page.goto(invalid);
    await expect(page).toHaveURL(`${appOrigin}/admin/login?error=invite`);
    await expect(page.locator("main").getByRole("alert")).toContainText("לא ניתן לאשר");
    expect((await context.cookies()).filter((cookie) => cookie.name.startsWith("cb-cms-auth")).length).toBe(0);
  }
  await page.goto(invite.url);
  await expect(page).toHaveURL(`${appOrigin}/admin/onboarding/password`);
});

test("a valid invitation without an active CMS membership grants no onboarding session", async ({ page, context }) => {
  const invite = await syntheticInvitation(false);
  await page.goto(invite.url);
  await expect(page).toHaveURL(`${appOrigin}/admin/login?error=invite`);
  expect((await context.cookies()).filter((cookie) => cookie.name.startsWith("cb-cms-auth")).length).toBe(0);
});
