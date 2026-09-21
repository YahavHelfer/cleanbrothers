import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { getLocalStack, localSql, appOrigin } from "../../scripts/cms-local.mjs";

const stack = getLocalStack();
const privileged = createClient(stack.url, stack.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const password = `Cb-Test!${randomUUID()}`;
const identities = {
  active: { id: "", email: `cms-active-${randomUUID()}@example.invalid` },
  inactive: { id: "", email: `cms-inactive-${randomUUID()}@example.invalid` },
  outsider: { id: "", email: `cms-outsider-${randomUUID()}@example.invalid` },
};

test.beforeAll(async () => {
  expect(localSql("select count(*) from public.cms_admin_members")).toBe("0");
  for (const identity of Object.values(identities)) {
    const { data, error } = await privileged.auth.admin.createUser({ email: identity.email, password, email_confirm: true, user_metadata: { role: "admin" } });
    if (error || !data.user) throw new Error("Local fixture creation failed");
    identity.id = data.user.id;
  }
  localSql(`insert into public.cms_admin_members (user_id, admin_slot, is_active) values ('${identities.active.id}', 1, true), ('${identities.inactive.id}', 2, false)`);
});

test.afterAll(async () => {
  for (const { id } of Object.values(identities)) {
    if (id) {
      const { error } = await privileged.auth.admin.deleteUser(id);
      if (error) throw new Error("Local fixture cleanup failed");
    }
  }
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

async function authenticatedContext(context: BrowserContext, email: string, expired = false) {
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
}

test("anonymous admin and future descendants redirect to accessible login", async ({ page }) => {
  for (const route of ["/admin", "/admin/future-module"]) {
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

test("active admin logs in; authorized login redirects; response is private and cookies are HttpOnly", async ({ page, context }) => {
  await login(page);
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
    await authenticatedContext(context, identities[kind].email);
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
  await login(page);
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

test("revoking membership denies an already logged-in administrator immediately", async ({ page }) => {
  await login(page);
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

test("login and dashboard initialize no marketing scripts and remain usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const loggedIn of [false, true]) {
    if (loggedIn) await login(page); else await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: loggedIn ? "לוח הבקרה" : "כניסה לניהול האתר" })).toBeVisible();
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const scripts = await page.locator("script").evaluateAll((nodes) => nodes.map((node) => node.outerHTML).join("\n"));
    expect(scripts).not.toMatch(/googletagmanager|connect\.facebook|google-consent-defaults|GoogleAdsTag|MarketingAttributionTracker|SummerAc/);
    expect(await page.evaluate(() => ["gtag", "fbq", "dataLayer"].some((name) => name in window))).toBe(false);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("Supabase itself rejects public signup and anonymous membership reads", async () => {
  const client = createClient(stack.url, stack.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const signup = await client.auth.signUp({ email: `no-signup-${randomUUID()}@example.invalid`, password });
  expect(signup.error?.code).toBe("signup_disabled");
  expect(signup.data.user).toBeNull();
  const read = await client.from("cms_admin_members").select("*");
  expect(read.error).not.toBeNull();
});
