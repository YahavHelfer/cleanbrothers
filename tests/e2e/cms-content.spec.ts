import { test, expect, type Page } from "@playwright/test";
import { createActor, cleanupActors, resetContent, importPilotBaseline, session, state, payload, type Actor } from "./helpers/content-fixtures";
import { localSql, appOrigin } from "../../scripts/cms-local.mjs";

const key = "delicate-upholstery-cleaning";
const editor = `/admin/services/${key}`;
const preview = (id: string) => `/admin/preview/services/${key}?revision=${id}`;
const publishedOrigin = "http://127.0.0.1:56301";
let admin: Actor;
let baseline: string;
test.beforeEach(async ({ context }) => {
  baseline = resetContent();
  admin = await createActor(true);
  // No public integrations or cloud/CRM endpoints may be contacted by a test.
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== appOrigin || url.pathname.startsWith("/api/")) {
      await route.abort(); throw new Error("Unexpected content-preview browser request");
    }
    await route.continue();
  });
});
test.afterEach(async () => { await cleanupActors(); });

async function publicSnapshot(page: Page, origin: string) {
  const response = await page.goto(`${origin}/${key}`);
  expect(response?.status()).toBe(200);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(`script[id="${key}-faq-jsonld"]`)).toHaveCount(1);
  return page.evaluate(() => {
    const main = document.querySelector("main")!.cloneNode(true) as HTMLElement;
    main.querySelectorAll("script,style").forEach((element) => element.remove());
    const localImagePath = (src: string | null) => {
      if (!src) return src;
      const url = new URL(src, location.origin);
      return url.origin === location.origin ? url.pathname + url.search + url.hash : src;
    };
    return {
      text: (main.textContent ?? "").replace(/\s+/g, " ").trim(),
      h1: main.querySelector("h1")?.textContent,
      links: Array.from(main.querySelectorAll("a")).map((a) => [a.getAttribute("href"), a.textContent]),
      images: Array.from(main.querySelectorAll("img")).map((img) => [localImagePath(img.getAttribute("src")), img.getAttribute("srcset"), img.alt]),
      formService: (main.querySelector('select[name="service"]') as HTMLSelectElement)?.value,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content"),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      social: Array.from(document.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')).map((m) => [m.getAttribute("property") ?? m.getAttribute("name"), m.getAttribute("content")]),
      faqJsonLd: JSON.parse(document.querySelector('script[id="delicate-upholstery-cleaning-faq-jsonld"]')!.textContent!),
      faq: Array.from(main.querySelectorAll("details")).map((faq) => [faq.querySelector("summary")?.textContent, faq.querySelector("p")?.textContent]),
    };
  });
}

test("local baseline import is idempotent; static and CMS public rendering are semantically identical", async ({ browser, request }) => {
  expect(importPilotBaseline()).toBe(baseline);
  expect(localSql("select count(*) from content_revisions")).toBe("1");
  const publicContext = await browser.newContext();
  try {
    await publicContext.route("**/*", (route) => [appOrigin, publishedOrigin].includes(new URL(route.request().url()).origin) && !new URL(route.request().url()).pathname.startsWith("/api/") && route.request().method() === "GET" ? route.continue() : route.abort());
    const page = await publicContext.newPage();
    const existing = await publicSnapshot(page, appOrigin);
    const cms = await publicSnapshot(page, publishedOrigin);
    expect(cms).toEqual(existing);
    expect(cms.formService).toBe("ניקוי ריפודים עדינים");
    expect(cms.faq).toHaveLength(6);
    expect(cms.images).toHaveLength(3);
    for (const route of ["/", "/services", "/gallery", "/about", "/contact", "/sofa-cleaning", "/mattress-cleaning", "/carpet-cleaning", "/car-upholstery-cleaning", "/armchair-chair-cleaning", `/${key}`, "/air-conditioner-cleaning", "/window-cleaning", "/privacy-policy", "/accessibility-statement", "/data-deletion"]) {
      expect((await request.get(appOrigin + route)).status(), route).toBe(200);
    }
    const staticOther = await request.get(`${appOrigin}/window-cleaning`);
    const cmsOther = await request.get(`${publishedOrigin}/window-cleaning`);
    // All shared services are opted in on this isolated server; special pages stay static.
    expect((await cmsOther.text()).match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]).toBe((await staticOther.text()).match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]);
  } finally { await publicContext.close(); }
});

test("AAL1, nonmembers, inactive and anonymous cannot open content routes or exact revision preview", async ({ page, context }) => {
  for (const route of ["/admin/services", editor, preview(baseline)]) {
    await page.goto(route); await expect(page).toHaveURL(`${appOrigin}/admin/login`);
  }
  await session(admin, context, false);
  for (const route of ["/admin/services", editor, preview(baseline)]) {
    await page.goto(route); await expect(page).toHaveURL(`${appOrigin}/admin/mfa/setup`);
  }
  await context.clearCookies();
  const outsider = await createActor(false);
  const outsiderClient = await session(outsider, context);
  await page.goto(preview(baseline)); await expect(page).toHaveURL(`${appOrigin}/admin/login?error=forbidden`);
  const denied = await outsiderClient.rpc("cms_read_pilot_editor"); expect(denied.error?.code).toBe("42501");
  await context.clearCookies(); await session(admin, context);
  localSql(`update cms_admin_members set is_active=false where user_id='${admin.id}'`);
  await page.goto(editor); await expect(page).toHaveURL(`${appOrigin}/admin/login?error=forbidden`);
});

test("editor draft, exact preview, explicit publish and historical restore preserve static site and CRM", async ({ page, context, browser }) => {
  test.setTimeout(60_000);
  await session(admin, context);
  await page.goto("/admin/services");
  await expect(page.getByText("ניקוי מזגנים וניקוי חלונות — עדיין לא מנוהל במערכת")).toBeVisible();
  await page.getByRole("link", { name: "עריכת השירות" }).click();
  const publicContext = await browser.newContext();
  await publicContext.route("**/*", (route) => [appOrigin, publishedOrigin].includes(new URL(route.request().url()).origin) && !new URL(route.request().url()).pathname.startsWith("/api/") && route.request().method() === "GET" ? route.continue() : route.abort());
  try {
    const publicPage = await publicContext.newPage();
    const initialPublic = await publicSnapshot(publicPage, publishedOrigin);
    await page.getByLabel("שם השירות לתצוגה").fill("שם תצוגה מקומי");
    await page.getByLabel("כותרת ראשית").fill("טיוטה מקומית לבדיקה");
    await page.getByLabel("כותרת SEO").fill("SEO מקומי לבדיקה");
    await expect(page.getByRole("button", { name: "פרסום", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "שמירת טיוטה" }).click();
    await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 2");
    await expect(page.getByLabel("מצב פרסום")).toContainText("יש שינויים שלא פורסמו");
    const saved = state(); expect(saved.published_revision_id).toBe(baseline);
    expect(await publicSnapshot(publicPage, publishedOrigin)).toEqual(initialPublic);
    await page.goto(preview(saved.draft_revision_id)); await expect(page.getByRole("heading", { level: 1 })).toHaveText("טיוטה מקומית לבדיקה");
    await page.goto(preview(baseline)); await expect(page.getByRole("heading", { level: 1 })).toHaveText(initialPublic.h1!);
    await page.goto(editor);
    await page.getByRole("button", { name: "פרסום", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("יש לאשר במפורש");
    expect(state().published_revision_id).toBe(baseline);
    await page.getByLabel("אני מאשר/ת לפרסם את הגרסה השמורה").check();
    await page.getByRole("button", { name: "פרסום", exact: true }).click();
    await expect(page.getByLabel("מצב פרסום")).toContainText("פורסם: גרסה 2");
    const published = await publicSnapshot(publicPage, publishedOrigin);
    expect(published.h1).toBe("טיוטה מקומית לבדיקה"); expect(published.title).toBe("SEO מקומי לבדיקה");
    expect(published.formService).toBe("ניקוי ריפודים עדינים"); expect(published.canonical).toBe(initialPublic.canonical);
    expect(await publicSnapshot(publicPage, appOrigin)).toEqual(initialPublic);
    await page.locator(`[data-revision="${baseline}"]`).getByRole("button", { name: "שחזור כטיוטה חדשה" }).click();
    await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 3");
    expect(state().published_revision_id).toBe(saved.draft_revision_id);
    expect(state().draft_revision_id).not.toBe(baseline);
    await page.getByLabel("אני מאשר/ת לפרסם את הגרסה השמורה").check();
    await page.getByRole("button", { name: "פרסום", exact: true }).click();
    await expect(page.getByLabel("מצב פרסום")).toContainText("פורסם: גרסה 3");
    expect(await publicSnapshot(publicPage, publishedOrigin)).toEqual(initialPublic);
    expect(localSql("select count(*) from content_revisions")).toBe("3");
    expect(localSql("select count(*) from content_publication_events")).toBe("3");
  } finally { await publicContext.close(); }
});

test("two editor tabs reject a stale save and preserve the second editor's unsaved Hebrew input", async ({ page, context, browser }) => {
  await session(admin, context);
  const secondContext = await browser.newContext();
  await secondContext.route("**/*", (route) => new URL(route.request().url()).origin === appOrigin ? route.continue() : route.abort());
  try {
    const second = await createActor(true); await session(second, secondContext);
    const secondPage = await secondContext.newPage();
    await page.goto(editor); await secondPage.goto(editor);
    await page.getByLabel("כותרת ראשית").fill("העריכה הראשונה");
    await secondPage.getByLabel("כותרת ראשית").fill("השינויים שלי שטרם נשמרו");
    await page.getByRole("button", { name: "שמירת טיוטה" }).click();
    await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 2");
    await secondPage.getByRole("button", { name: "שמירת טיוטה" }).click();
    await expect(secondPage.locator("main").getByRole("alert")).toContainText("עורך אחר שינה את השירות");
    await expect(secondPage.getByLabel("כותרת ראשית")).toHaveValue("השינויים שלי שטרם נשמרו");
    expect(payload(state().draft_revision_id).h1).toBe("העריכה הראשונה");
    expect(localSql("select count(*) from content_revisions")).toBe("2");
  } finally { await secondContext.close(); }
});

test("concurrent independent AAL2 admins produce exactly one winner with no lost update", async () => {
  const first = await session(admin); const second = await session(await createActor(true));
  const original = state(); const draft = payload(baseline);
  const results = await Promise.all([first, second].map((client, i) => client.rpc("cms_save_service_draft", {
    expected_generation: original.generation, base_revision: original.draft_revision_id,
    payload: { ...draft, h1: `Concurrent editor ${i}` }, restore_revision: null,
  })));
  expect(results.filter((r) => !r.error)).toHaveLength(1);
  expect(results.filter((r) => r.error?.code === "PT409")).toHaveLength(1);
  expect(results.find((r) => r.error)?.status).toBe(409);
  expect(state().generation).toBe(original.generation + 1);
  expect(state().published_revision_id).toBe(baseline);
  expect(localSql("select count(*) from content_revisions")).toBe("2");
});

test("exact preview has no side effects, no canonical, noindex/no-store; invalid revision never falls back", async ({ page, context }) => {
  await session(admin, context);
  const requested: string[] = [];
  page.on("request", (request) => requested.push(new URL(request.url()).pathname));
  const response = await page.goto(preview(baseline));
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["cache-control"]).not.toMatch(/(?:^|,)\s*public/);
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex.*nofollow/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator('a[href^="tel:"],a[href*="wa.me"],a[href*="whatsapp"],a[href^="/api/"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "שליחת פנייה מושבתת בתצוגה" })).toBeDisabled();
  for (const name of ["שם מלא", "טלפון", "סוג השירות", "עיר", "הודעה"]) await expect(page.getByLabel(name)).toBeDisabled();
  expect(await page.evaluate(() => ["gtag", "fbq", "dataLayer"].some((name) => name in window))).toBe(false);
  const scripts = await page.locator("script").evaluateAll((nodes) => nodes.map((node) => node.outerHTML).join("\n"));
  expect(scripts).not.toMatch(/googletagmanager|connect\.facebook|google-consent-defaults|GoogleAdsTag|MarketingAttributionTracker|service_role|sb_secret_/);
  expect(requested.some((path) => path.startsWith("/api/"))).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const path of [`/admin/preview/services/${key}`, preview("latest"), preview("f0000000-0000-4000-8000-000000000001")]) {
    expect((await page.goto(path))?.status()).toBe(404);
  }
});

test("metadata and visible HTML share one published snapshot while publications change concurrently", async ({ request }) => {
  test.setTimeout(60_000);
  const client = await session(admin);
  let current = state();
  const original = payload(baseline);
  const publish = async (index: number) => {
    const draft = await client.rpc("cms_save_service_draft", { expected_generation: current.generation,
      base_revision: current.draft_revision_id, restore_revision: null,
      payload: { ...original, h1: `Snapshot ${index}`, seoTitle: `Snapshot ${index}` } });
    if (draft.error) throw new Error("Local snapshot fixture save failed");
    const result = await client.rpc("cms_publish_service_revision", { expected_generation: current.generation + 1, revision: draft.data });
    if (result.error) throw new Error("Local snapshot fixture publish failed");
    current = { generation: current.generation + 2, draft_revision_id: draft.data, published_revision_id: draft.data };
  };
  await publish(0);
  await Promise.all([
    (async () => { for (let i = 1; i <= 12; i++) await publish(i); })(),
    (async () => {
      for (let i = 0; i < 12; i++) {
        // HTML-limited crawler gets metadata in the head, still using the same
        // request memoization as the hydrated public browser rendering above.
        const response = await request.get(`${publishedOrigin}/${key}`, { headers: { "User-Agent": "Twitterbot" } });
        expect(response.status()).toBe(200);
        expect(response.headers()["cache-control"]).toContain("no-store");
        const html = await response.text();
        const title = html.match(/<title>(Snapshot \d+)<\/title>/)?.[1];
        const heading = html.match(/<h1[^>]*>(Snapshot \d+)<\/h1>/)?.[1];
        expect(title).toMatch(/^Snapshot \d+$/);
        expect(heading).toBe(title);
      }
    })(),
  ]);
});
