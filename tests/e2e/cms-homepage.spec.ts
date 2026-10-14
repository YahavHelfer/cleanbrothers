import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { appOrigin, localSql } from "../../scripts/cms-local.mjs";
import { cleanupActors, createActor, resetContent, session, type Actor } from "./helpers/content-fixtures";

const homeId = "d4000000-0000-4000-8000-000000000000";
const publishedOrigin = "http://127.0.0.1:56301";
let actor: Actor;
function state() { return JSON.parse(localSql(`select row_to_json(s) from content_publication_state s where document_id='${homeId}'`)) as {
  generation: number; draft_revision_id: string; published_revision_id: string;
}; }
function revisionCount() { return Number(localSql(`select count(*) from content_revisions where document_id='${homeId}'`)); }
function otherState() { return localSql(`select coalesce(jsonb_agg(jsonb_build_object('id',document_id,'generation',generation,
  'draft',draft_revision_id,'published',published_revision_id) order by document_id),'[]'::jsonb)
  from content_publication_state where document_id<>'${homeId}'`); }
test.beforeEach(async () => {
  resetContent();
  execFileSync(process.execPath, ["scripts/cms-import-shared-services.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/cms-import-special-services.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/cms-import-about.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/cms-import-home.mjs"], { stdio: "pipe" });
  actor = await createActor(true);
});
test.afterEach(async () => { await cleanupActors(); });

test("Google reviews autoplay and manual navigation scroll only the RTL track", async ({ page, context }) => {
  await session(actor, context);
  await page.goto("/admin/pages/home");
  await page.locator('[data-block-id="d4000000-0000-4000-8000-000000000012"]')
    .getByRole("button", { name: "הצג", exact: true }).click();
  await page.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(state().published_revision_id);
  await page.goto(`/admin/preview/pages/home?revision=${state().draft_revision_id}`);
  const carousel = page.locator("[data-active-review]");
  await expect(carousel).toHaveAttribute("data-active-review", "0");
  await page.evaluate(() => window.scrollTo(0, 0));
  const beforeAutoplay = await page.evaluate(() => window.scrollY);
  await expect(carousel).toHaveAttribute("data-active-review", "1", { timeout: 9000 });
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeAutoplay);
  const next = page.getByRole("button", { name: "ביקורת הבאה" });
  await next.scrollIntoViewIfNeeded();
  const beforeManual = await page.evaluate(() => window.scrollY);
  await next.click();
  await expect(carousel).toHaveAttribute("data-active-review", "2");
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeManual);
  await page.getByRole("button", { name: "ביקורת קודמת" }).click();
  await expect(carousel).toHaveAttribute("data-active-review", "1");
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeManual);
});

test("homepage UI keeps draft private, publishes exact revision and rolls back with AAL2", async ({ page, context, request }) => {
  await session(actor, context);
  const baseline = state(), other = otherState();
  expect(revisionCount()).toBe(1);
  await page.goto("/admin/pages");
  await expect(page.locator("main")).toContainText("דף הבית");
  await page.goto("/admin/pages/home");
  await expect(page.getByRole("heading", { name: "עריכת דף הבית" })).toBeVisible();
  await expect(page.getByRole("button", { name: "שמירת טיוטה" })).toBeEnabled();
  await expect(page.locator("[data-block-id]")).toHaveCount(12);
  await expect(page.locator("[data-block-id]").first()).toContainText("פתיח");

  // A temporary rich-text block, pinned promotion, service reordering, and a
  // safe visibility change exercise the actual hydrated editor controls.
  const type = page.getByRole("group", { name: "הוספת מקטע" }).getByRole("combobox");
  await type.selectOption("richText");
  await page.getByRole("group", { name: "הוספת מקטע" }).getByRole("button", { name: "הוספת מקטע" }).click();
  await expect(page.locator("[data-block-id]")).toHaveCount(13);
  await type.selectOption("promotionBanner");
  await page.getByRole("group", { name: "הוספת מקטע" }).getByRole("button", { name: "הוספת מקטע" }).click();
  await expect(page.locator("[data-block-id]")).toHaveCount(14);
  const trust = page.locator("[data-block-id]").nth(1);
  await trust.getByRole("button", { name: "הסתר" }).click();
  await page.locator("[data-block-id]").nth(2).getByRole("button", { name: "הזז למטה" }).click();
  const services = page.locator("[data-block-id]").filter({ hasText: "שירותים לפי סדר הופעה" });
  await services.getByRole("button", { name: "למטה" }).first().click();
  const reviewsBlock = page.locator('[data-block-id="d4000000-0000-4000-8000-000000000012"]');
  await expect(reviewsBlock).toContainText("מוסתר בגרסה זו");
  await reviewsBlock.getByRole("button", { name: "הצג", exact: true }).click();
  await reviewsBlock.getByRole("checkbox", { name: "הצגת דירוג Google הכללי" }).uncheck();
  await page.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(baseline.draft_revision_id);
  const changed = state();
  expect(changed.published_revision_id).toBe(baseline.published_revision_id);
  expect(otherState()).toBe(other);
  const staticHome = await request.get(`${appOrigin}/`);
  expect(staticHome.status()).toBe(200);
  const cmsHomeBefore = await request.get(`${publishedOrigin}/`);
  expect(cmsHomeBefore.status()).toBe(200);
  expect(await cmsHomeBefore.text()).not.toContain("הצעת היכרות");
  expect(await cmsHomeBefore.text()).not.toContain("Sample reviewer B");

  const preview = await page.goto(`/admin/preview/pages/home?revision=${changed.draft_revision_id}`);
  expect(preview?.status()).toBe(200);
  expect(preview?.headers()["cache-control"]).toContain("private, no-store");
  expect(preview?.headers()["x-robots-tag"]).toContain("noindex, nofollow");
  await expect(page.locator("main")).toContainText("הצעת היכרות");
  await expect(page.getByRole("region", { name: "ביקורות Google" })).toBeVisible();
  await expect(page.locator("[data-active-review]")).toHaveAttribute("data-active-review", "0");
  await page.getByRole("button", { name: "ביקורת הבאה" }).click();
  await expect(page.locator("[data-active-review]")).toHaveAttribute("data-active-review", "1");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
    expect(layout.page).toBeLessThanOrEqual(layout.viewport);
  }
  expect(await page.locator("main").innerHTML()).not.toMatch(/\/api\/whatsapp|GTM-|gtag\(|fbq\(/);

  await page.goto("/admin/pages/home");
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect.poll(() => state().published_revision_id).toBe(changed.draft_revision_id);
  const live = await request.get(`${publishedOrigin}/`);
  expect(live.status()).toBe(200);
  expect(await live.text()).toContain("הצעת היכרות");
  expect(await live.text()).toContain("Sample reviewer B");
  expect(otherState()).toBe(other);

  await page.goto("/admin/pages/home");
  await page.getByRole("article").filter({ hasText: "גרסה 1" }).getByRole("button", { name: "שחזור כטיוטה חדשה" }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(changed.draft_revision_id);
  expect(state().published_revision_id).toBe(changed.draft_revision_id);
  await page.goto("/admin/pages/home");
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect.poll(() => state().published_revision_id).toBe(state().draft_revision_id);
  expect(revisionCount()).toBe(3);
  const restored = await request.get(`${publishedOrigin}/`);
  expect(restored.status()).toBe(200);
  expect(await restored.text()).not.toContain("הצעת היכרות");
  expect(await restored.text()).not.toContain("Sample reviewer B");
  expect(otherState()).toBe(other);
});

test("stale homepage editor keeps its input; invalid Origin, AAL1 and nonmembers cannot mutate", async ({ page, context }) => {
  await session(actor, context);
  const second = await context.newPage();
  await page.goto("/admin/pages/home");
  await second.goto("/admin/pages/home");
  await expect(page.getByRole("button", { name: "שמירת טיוטה" })).toBeEnabled();
  await expect(second.getByRole("button", { name: "שמירת טיוטה" })).toBeEnabled();
  await page.getByRole("textbox", { name: "כותרת SEO" }).fill("כותרת ניסוי ראשונה");
  const [mutation] = await Promise.all([
    page.waitForRequest(req => req.method() === "POST" && req.url() === `${appOrigin}/admin/pages/home`),
    page.getByRole("button", { name: "שמירת טיוטה" }).click(),
  ]);
  await expect.poll(revisionCount).toBe(2);
  await second.getByRole("textbox", { name: "כותרת SEO" }).fill("קלט של עורך שני");
  await second.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect(second.locator("main").getByRole("alert")).toContainText("עורך אחר");
  await expect(second.getByRole("textbox", { name: "כותרת SEO" })).toHaveValue("קלט של עורך שני");
  expect(revisionCount()).toBe(2);
  for (const origin of ["null", "https://untrusted.invalid"]) {
    const response = await context.request.post(`${appOrigin}/admin/pages/home`, { headers: {
      origin, "next-action": (await mutation.headerValue("next-action"))!,
      "content-type": (await mutation.headerValue("content-type"))!,
    }, data: mutation.postDataBuffer()!, maxRedirects: 0 });
    expect(response.status()).toBe(500);
    expect(revisionCount()).toBe(2);
  }
  await second.close();
  await context.clearCookies();
  await session(actor, context, false);
  await page.goto(`/admin/preview/pages/home?revision=${state().draft_revision_id}`);
  await expect(page).toHaveURL(/\/admin\/mfa\/challenge/);
  const outsider = await createActor(false);
  await context.clearCookies();
  await session(outsider, context);
  await page.goto("/admin/pages/home");
  await expect(page).toHaveURL(/\/admin\/login\?error=forbidden/);
});

test("review block can be re-added; exact preview pauses for focus and reduced motion", async ({ page, context }) => {
  await session(actor, context);
  await page.goto("/admin/pages/home");
  const original = page.locator('[data-block-id="d4000000-0000-4000-8000-000000000012"]');
  await expect(original).toContainText("מוסתר בגרסה זו");
  await original.getByRole("button", { name: "הסרה מהטיוטה" }).click();
  await expect(page.locator("[data-block-id]")).toHaveCount(11);
  const add = page.getByRole("group", { name: "הוספת מקטע" });
  await add.getByRole("combobox").selectOption("homeGoogleReviews");
  await add.getByRole("button", { name: "הוספת מקטע" }).click();
  await expect(page.locator("[data-block-id]")).toHaveCount(12);
  await page.getByRole("button", { name: "שמירת טיוטה" }).click();
  await expect.poll(() => revisionCount()).toBe(2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/admin/preview/pages/home?revision=${state().draft_revision_id}`);
  const section = page.locator("[data-active-review]");
  await expect(section).toBeVisible();
  await expect(section).toHaveAttribute("data-active-review", "0");
  await page.waitForTimeout(5600);
  await expect(section).toHaveAttribute("data-active-review", "0");
  await page.getByRole("button", { name: "ביקורת הבאה" }).click();
  await expect(section).toHaveAttribute("data-active-review", "1");
  await page.getByRole("complementary", { name: "מצב תצוגה מקדימה" }).click();
  await expect(section).not.toHaveAttribute("data-attention-paused", "true");
  await page.getByRole("button", { name: "ביקורת הבאה" }).focus();
  await expect(section).toHaveAttribute("data-attention-paused", "true");
  await page.getByRole("complementary", { name: "מצב תצוגה מקדימה" }).click();
  await expect(section).not.toHaveAttribute("data-attention-paused", "true");
  await section.hover();
  await expect(section).toHaveAttribute("data-attention-paused", "true");
  await expect(section).toHaveAttribute("data-paused", "true");
});

test("shared service images persist, keep drafts private and publish across all three page types", async ({ page, context, request }) => {
  test.setTimeout(120_000);
  await session(actor, context);
  await page.goto("/admin/media");
  const upload = page.getByRole("form", { name: "העלאת תמונה", exact: true });
  await upload.getByLabel("בחירת תמונה").setInputFiles({ name: "homepage-card-fixture.png", mimeType: "image/png",
    buffer: await sharp({ create: { width: 96, height: 64, channels: 3, background: "#27a6a3" } }).png().toBuffer() });
  await upload.getByLabel("תיאור חלופי", { exact: true }).fill("תמונה שנוספה מספריית המדיה");
  await upload.getByRole("button", { name: "העלאה לספרייה", exact: true }).click();
  await expect(page.getByRole("heading", { name: "פרטי תמונה", exact: true })).toBeVisible();
  const asset = page.url().split("/").pop()!;
  if (!/^[a-f0-9-]{36}$/.test(asset)) throw new Error("Invalid local test asset");
  const uploadedVersion = localSql(`select current_version_id from media_assets where id='${asset}'`);
  await page.goto("/admin/pages/home");
  const cards = page.locator('[data-block-id="d4000000-0000-4000-8000-000000000003"]');
  const sofa = cards.locator('[data-home-service-card="sofa-cleaning"]');
  const gallery = sofa.getByRole("group", { name: "תמונות השירות", exact: true });
  await expect(gallery.locator("[data-home-service-image]")).toHaveCount(4);
  await gallery.getByRole("button", { name: "הוספת תמונת שירות", exact: true }).click();
  await gallery.getByRole("combobox", { name: "תמונת שירות 5", exact: true }).selectOption(uploadedVersion);
  await gallery.getByRole("combobox", { name: "תמונת שירות 1", exact: true }).selectOption("1733a278-1a4c-4230-860d-0db0e62cc57a");
  await gallery.getByLabel("תיאור חלופי לתמונת שירות 1", { exact: true }).fill("תמונת כרטיס שהוחלפה");
  await gallery.getByRole("button", { name: "הסרת תמונת שירות 2", exact: true }).click();
  await gallery.getByRole("button", { name: "העלאת תמונת שירות 2", exact: true }).click();
  const saved = await gallery.locator("[data-home-service-image]").evaluateAll(rows => rows.map(row => ({
    id: (row.querySelector("select") as HTMLSelectElement).value,
    src: row.querySelector("img")?.getAttribute("src"),
    alt: (row.querySelector("input") as HTMLInputElement).value,
  })));
  for (const image of saved) if (image.id === uploadedVersion) image.src = `/cms-media/${uploadedVersion}`;
  const before = state();
  await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(before.draft_revision_id);
  expect(state().published_revision_id).toBe(before.published_revision_id);
  expect((await request.get(`${publishedOrigin}/cms-media/${uploadedVersion}`)).status()).toBe(404);
  for (const path of ["/", "/services", "/sofa-cleaning"]) {
    const response = await request.get(`${publishedOrigin}${path}`);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain("תמונת כרטיס שהוחלפה");
    expect(await response.text()).not.toContain(`/cms-media/${uploadedVersion}`);
  }
  await page.goto(`/admin/preview/services/sofa-cleaning?revision=${localSql("select draft_revision_id from content_publication_state where document_id=(select id from content_documents where content_key='sofa-cleaning')")}`);
  // Read the document through its stable registry ID rather than display title.
  if (await page.locator("h1").count() === 0) throw new Error("Service draft preview unavailable");
  await page.goto("/admin/pages/home");
  await page.reload();
  await expect(gallery.locator("[data-home-service-image]")).toHaveCount(saved.length);
  for (const [index, image] of saved.entries()) {
    await expect(gallery.getByRole("combobox", { name: `תמונת שירות ${index + 1}`, exact: true })).toHaveValue(image.id);
    await expect(gallery.getByLabel(`תיאור חלופי לתמונת שירות ${index + 1}`, { exact: true })).toHaveValue(image.alt);
  }
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect.poll(() => state().published_revision_id).toBe(state().draft_revision_id);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${publishedOrigin}/`);
    const card = page.locator("#services article").filter({ has: page.getByRole("heading", { name: "ניקוי ספות", exact: true }) });
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await card.getByRole("button", { name: `הצגת תמונה 1 מתוך ${saved.length}`, exact: true }).click();
    for (const [index, image] of saved.entries()) {
      await card.getByRole("button", { name: `הצגת תמונה ${index + 1} מתוך ${saved.length}`, exact: true }).click();
      await expect(card.locator("img")).toHaveAttribute("alt", image.alt);
      await expect.poll(async () => {
        const src = new URL((await card.locator("img").getAttribute("src"))!, publishedOrigin);
        return src.searchParams.get("url") || src.pathname;
      }).toBe(image.src);
      await expect.poll(() => card.locator("img").evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
      await expect(card.locator("img")).toHaveCSS("opacity", "1");
    }
    await card.getByRole("button", { name: `הצגת תמונה 1 מתוך ${saved.length}`, exact: true }).click();
    await expect(card.locator("img")).toHaveCSS("opacity", "1");
    await card.screenshot({ path: `/tmp/cleanbrothers-home-service-card-${width}.png` });
    await card.getByRole("button", { name: "התמונה הבאה של ניקוי ספות", exact: true }).click();
    await expect(card.locator("img")).toHaveAttribute("alt", saved[1].alt);
    await card.getByRole("button", { name: "התמונה הקודמת של ניקוי ספות", exact: true }).click();
    await expect(card.locator("img")).toHaveAttribute("alt", saved[0].alt);
    const singleCard = page.locator("#services article").filter({ has: page.getByRole("heading", { name: "ניקוי מזרנים", exact: true }) });
    await expect(singleCard.locator("img")).toHaveCount(1);
    await expect(singleCard.getByRole("button")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/services", "/sofa-cleaning"]) {
      expect((await page.goto(`${publishedOrigin}${path}`))?.status()).toBe(200);
      const display = path === "/services" ? page.locator('[data-service-card="sofa-cleaning"]') : page.locator("main section").first();
      const carousel = display.getByRole("region", { name: /גלריית תמונות/ }).first();
      await carousel.scrollIntoViewIfNeeded();
      await carousel.hover();
      for (const [index, image] of saved.entries()) {
        await carousel.getByRole("button", { name: `הצגת תמונה ${index + 1} מתוך ${saved.length}`, exact: true }).click();
        await expect(carousel.locator("img")).toHaveAttribute("alt", image.alt);
        const src = new URL((await carousel.locator("img").getAttribute("src"))!, publishedOrigin);
        expect(src.searchParams.get("url") || src.pathname).toBe(image.src);
        await expect.poll(() => carousel.locator("img").evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
      }
      await carousel.getByRole("button", { name: `הצגת תמונה 1 מתוך ${saved.length}`, exact: true }).click();
      await expect.poll(() => carousel.locator("img").evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
      await expect(carousel.locator("img")).toHaveCSS("opacity", "1");
      await display.screenshot({ path: `/tmp/cleanbrothers-shared-${path.slice(1)}-${width}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (path === "/services") {
        const mattress = page.locator('[data-service-card="mattress-cleaning"]');
        await expect(mattress.locator("img")).toHaveCount(1);
        await expect(mattress.getByRole("button")).toHaveCount(0);
        await expect(mattress.locator("img")).toHaveAttribute("alt", "ניקוי מזרנים");
      }
    }
    await page.goto(`${publishedOrigin}/mattress-cleaning`);
    const primary = page.locator("main section").first();
    await expect(primary.locator("img")).toHaveCount(1);
    await expect(primary.getByRole("button", { name: /תמונה/ })).toHaveCount(0);
  }
  // Removing the last image remains saved as an empty list, rather than reseeding.
  await page.goto("/admin/pages/home");
  for (let count = saved.length; count > 0; count--)
    await gallery.getByRole("button", { name: "הסרת תמונת שירות 1", exact: true }).click();
  const prior = state().draft_revision_id;
  await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(prior);
  await page.reload();
  await expect(gallery.locator("[data-home-service-image]")).toHaveCount(0);
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect.poll(() => state().published_revision_id).toBe(state().draft_revision_id);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${publishedOrigin}/`);
    const emptyCard = page.locator("#services article").filter({ has: page.getByRole("heading", { name: "ניקוי ספות", exact: true }) });
    await expect(emptyCard.locator("img")).toHaveCount(0);
    await expect(emptyCard.getByRole("img", { name: "ניקוי ספות", exact: true })).toBeVisible();
    await expect(emptyCard.getByRole("button")).toHaveCount(0);
    await emptyCard.screenshot({ path: `/tmp/cleanbrothers-home-service-card-empty-${width}.png` });
  }
  expect((await request.get(`${publishedOrigin}/cms-media/${uploadedVersion}`)).status()).toBe(404);
  for (const path of ["/", "/services", "/sofa-cleaning"]) {
    const response = await request.get(`${publishedOrigin}${path}`);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain("תמונת כרטיס שהוחלפה");
    expect(await response.text()).not.toContain(`/cms-media/${uploadedVersion}`);
  }
  await page.goto(`/admin/preview/services/sofa-cleaning?revision=${localSql("select draft_revision_id from content_publication_state where document_id=(select id from content_documents where content_key='sofa-cleaning')")}`);
  // Read the document through its stable registry ID rather than display title.
  if (await page.locator("h1").count() === 0) throw new Error("Service draft preview unavailable");
  await page.goto("/admin/pages/home");
  for (const path of ["/services", "/sofa-cleaning"]) {
    expect((await page.goto(`${publishedOrigin}${path}`))?.status()).toBe(200);
    const empty = path === "/services" ? page.locator('[data-service-card="sofa-cleaning"]') : page.locator("main section").first();
    await expect(empty.locator("img")).toHaveCount(0);
    await expect(empty.getByRole("button", { name: /תמונה/ })).toHaveCount(0);
    await expect(empty.getByRole("img")).toBeVisible();
  }

});

test("shared special and unlisted service collections stay isolated, survive history restore and work without homepage cards", async ({ page, context, request }) => {
  test.setTimeout(180_000);
  await session(actor, context);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addLocatorHandler(page.getByRole("button", { name: "סגירת מבצע הקיץ", exact: true }), async button => { await button.click(); });
  await page.addLocatorHandler(page.getByRole("button", { name: "דחיית עוגיות לא הכרחיות", exact: true }), async button => { await button.click(); });
  const errors: string[] = [], failedImages: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    const url = new URL(response.url());
    if (url.origin === publishedOrigin && /^\/(?:_next\/image|cms-media\/)/.test(url.pathname) && response.status() >= 400) failedImages.push(`${url.pathname}: ${response.status()}`);
  });
  const original = state(), others = otherState();
  const originalGallery = localSql("select jsonb_agg(to_jsonb(m) order by m.position) from revision_media_refs m where usage_role='gallery'");
  await page.goto("/admin/pages/home");
  const group = (key: string) => page.locator(`[data-home-service-card="${key}"]`).getByRole("group", { name: "תמונות השירות", exact: true });
  const mattress = "1733a278-1a4c-4230-860d-0db0e62cc57a", carpet = "bfaa5d53-8085-4fd4-826a-69b9a18ace18";
  const ac = group("air-conditioner-cleaning");
  await ac.getByRole("button", { name: "הסרת תמונת שירות 3", exact: true }).click();
  await ac.getByRole("combobox", { name: "תמונת שירות 1", exact: true }).selectOption(mattress);
  await ac.getByLabel("תיאור חלופי לתמונת שירות 1", { exact: true }).fill("מזגן משותף ראשון");
  await ac.getByLabel("תיאור חלופי לתמונת שירות 2", { exact: true }).fill("מזגן משותף שני");
  await ac.getByRole("button", { name: "העלאת תמונת שירות 2", exact: true }).click();
  const window = group("window-cleaning");
  for (const [index,id] of [mattress,carpet].entries()) {
    await window.getByRole("button", { name: "הוספת תמונת שירות", exact: true }).click();
    await window.getByRole("combobox", { name: `תמונת שירות ${index + 1}`, exact: true }).selectOption(id);
    await window.getByLabel(`תיאור חלופי לתמונת שירות ${index + 1}`, { exact: true }).fill(`חלון משותף ${index + 1}`);
  }
  const delicate = group("delicate-upholstery-cleaning");
  await delicate.getByRole("combobox", { name: "תמונת שירות 1", exact: true }).selectOption(carpet);
  await delicate.getByLabel("תיאור חלופי לתמונת שירות 1", { exact: true }).fill("ריפוד עדין משותף");
  await group("carpet-cleaning").getByRole("button", { name: "הסרת תמונת שירות 1", exact: true }).click();
  await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(original.draft_revision_id);
  await page.reload();
  await expect(ac.getByLabel("תיאור חלופי לתמונת שירות 1", { exact: true })).toHaveValue("מזגן משותף שני");
  await expect(window.locator("[data-home-service-image]")).toHaveCount(2);
  await expect(delicate.getByLabel("תיאור חלופי לתמונת שירות 1", { exact: true })).toHaveValue("ריפוד עדין משותף");
  await expect(group("carpet-cleaning").locator("[data-home-service-image]")).toHaveCount(0);
  for (const route of ["/", "/services", "/air-conditioner-cleaning", "/window-cleaning", "/delicate-upholstery-cleaning"]) {
    const response = await request.get(publishedOrigin + route);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain("משותף");
  }
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect.poll(() => state().published_revision_id).toBe(state().draft_revision_id);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/services", "/air-conditioner-cleaning"]) {
      expect((await page.goto(publishedOrigin + route))?.status()).toBe(200);
      const section = route === "/air-conditioner-cleaning" ? page.locator("main section").first() : page.locator('[data-service-card="air-conditioner-cleaning"]');
      const carousel = section.getByRole("region", { name: /גלריית תמונות/ });
      await carousel.scrollIntoViewIfNeeded();
      await carousel.getByRole("button", { name: "הצגת תמונה 1 מתוך 2", exact: true }).click();
      await expect(carousel.locator("img")).toHaveAttribute("alt", "מזגן משותף שני");
      await carousel.getByRole("button", { name: "הצגת תמונה 2 מתוך 2", exact: true }).click();
      await expect(carousel.locator("img")).toHaveAttribute("alt", "מזגן משותף ראשון");
      await expect.poll(() => carousel.locator("img").evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
      if (route !== "/air-conditioner-cleaning") {
        await expect(page.locator('[data-service-card="carpet-cleaning"]').locator("img")).toHaveCount(0);
        await expect(page.locator('[data-service-card="carpet-cleaning"]').getByRole("button")).toHaveCount(0);
        const windowCarousel = page.locator('[data-service-card="window-cleaning"]').getByRole("region", { name: /גלריית תמונות/ });
        await windowCarousel.getByRole("button", { name: "הצגת תמונה 1 מתוך 2", exact: true }).click();
        await expect(windowCarousel.locator("img")).toHaveAttribute("alt", "חלון משותף 1");
        await windowCarousel.getByRole("button", { name: "הצגת תמונה 2 מתוך 2", exact: true }).click();
        await expect(windowCarousel.locator("img")).toHaveAttribute("alt", "חלון משותף 2");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    for (const [key,alt] of [["window-cleaning","חלון משותף 1"],["delicate-upholstery-cleaning","ריפוד עדין משותף"]]) {
      await page.goto(`${publishedOrigin}/${key}`);
      const primary = page.locator("main section").first();
      await expect(primary.locator("img")).toHaveAttribute("alt",alt);
      if (key === "delicate-upholstery-cleaning") {
        await expect(page.locator('main img[alt="ריפוד עדין משותף"]')).toHaveCount(3);
        for (const src of await page.locator("main img").evaluateAll(images => images.map(image => image.getAttribute("src")!))) {
          const url = new URL(src, publishedOrigin);
          expect(url.searchParams.get("url") || url.pathname).toBe("/images/services/carpet-cleaning.jpeg");
        }
      }
      await expect(primary.getByRole("button", { name: /תמונה/ })).toHaveCount(0);
    }
  }
  expect(otherState()).toBe(others);
  expect(localSql("select jsonb_agg(to_jsonb(m) order by m.position) from revision_media_refs m where usage_role='gallery'")).toBe(originalGallery);
  // Remove the homepage presentation block: the collection remains authoritative elsewhere.
  await page.goto("/admin/pages/home");
  await page.locator('[data-block-id="d4000000-0000-4000-8000-000000000003"]').getByRole("button", { name: "הסרה מהטיוטה", exact: true }).click();
  await expect(group("delicate-upholstery-cleaning").getByLabel("תיאור חלופי לתמונת שירות 1", { exact: true })).toHaveValue("ריפוד עדין משותף");
  const previousDraft=state().draft_revision_id;
  await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(previousDraft);
  await page.reload();
  await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect.poll(() => state().published_revision_id).toBe(state().draft_revision_id);
  await page.goto(publishedOrigin + "/services");
  await expect(page.locator('[data-service-card="delicate-upholstery-cleaning"]').locator("img")).toHaveAttribute("alt", "ריפוד עדין משותף");
  await expect(page.locator('[data-service-card="window-cleaning"]').locator("img")).toHaveAttribute("alt", "חלון משותף 1");
  await page.goto(publishedOrigin + "/delicate-upholstery-cleaning");
  await expect(page.locator("main section").first().locator("img")).toHaveAttribute("alt", "ריפוד עדין משותף");
  for (const remaining of [1, 0]) {
    await page.goto("/admin/pages/home");
    await ac.getByRole("button", { name: "הסרת תמונת שירות 1", exact: true }).click();
    const beforeSave = state().draft_revision_id;
    await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
    await expect.poll(() => state().draft_revision_id).not.toBe(beforeSave);
    await page.reload();
    await expect(ac.locator("[data-home-service-image]")).toHaveCount(remaining);
    await page.getByRole("checkbox", { name: /מאשר.*לפרסם/ }).check();
    await page.getByRole("button", { name: "פרסום", exact: true }).click();
    await expect.poll(() => state().published_revision_id).toBe(state().draft_revision_id);
    await page.goto(publishedOrigin + "/air-conditioner-cleaning");
    const primary = page.locator("main section").first();
    await expect(primary.locator("img")).toHaveCount(remaining);
    await expect(primary.getByRole("button", { name: /תמונה/ })).toHaveCount(0);
    if (!remaining) await expect(primary.getByRole("img")).toBeVisible();
    await expect(page.locator("main img")).toHaveCount(remaining + 3); // Independent work gallery is retained.
  }
  // Restoring homepage history restores the shared collection atomically without publishing it yet.
  await page.goto("/admin/pages/home");
  await page.getByRole("article").filter({ hasText: "גרסה 1" }).getByRole("button", { name: "שחזור כטיוטה חדשה" }).click();
  await expect.poll(() => state().draft_revision_id).not.toBe(state().published_revision_id);
  await page.reload();
  await expect(group("window-cleaning").locator("[data-home-service-image]")).toHaveCount(0);
  await expect(group("carpet-cleaning").locator("[data-home-service-image]")).toHaveCount(1);
  expect(errors).toEqual([]);expect(failedImages).toEqual([]);
});
