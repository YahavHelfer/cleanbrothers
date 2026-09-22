import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import {
  createActor,
  cleanupActors,
  resetContent,
  session,
  state,
  type Actor,
} from "./helpers/content-fixtures";
import { localSql, appOrigin } from "../../scripts/cms-local.mjs";
const editor = "/admin/services/delicate-upholstery-cleaning";
const preview = (id: string) =>
  `/admin/preview/services/delicate-upholstery-cleaning?revision=${id}`;
const published = "http://127.0.0.1:56301";
const staticAsset = "d0000000-0000-4000-8000-000000000001";
let admin: Actor, baseline: string;
test.beforeEach(async ({ context }) => {
  baseline = resetContent();
  admin = await createActor(true);
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      ![appOrigin, published].includes(url.origin) ||
      url.pathname.startsWith("/api/")
    )
      return route.abort();
    return route.continue();
  });
});
test.afterEach(async () => {
  await cleanupActors();
});
async function image(color = "red", format: "png" | "jpeg" | "webp" = "png") {
  return {
    name: `fixture-${color}.${format}`,
    mimeType: `image/${format}`,
    buffer: await sharp({
      create: { width: 24, height: 16, channels: 3, background: color },
    })
      [format]()
      .toBuffer(),
  };
}
async function upload(page: Page, color = "red", replace = false) {
  const form = page.getByRole("form", {
    name: replace ? "החלפת תמונה" : "העלאת תמונה",
    exact: true,
  });
  await form.getByLabel("בחירת תמונה").setInputFiles(await image(color));
  await form.getByLabel("תיאור חלופי", { exact: true }).fill(`תיאור ${color}`);
  await form
    .getByRole("button", {
      name: replace ? "שמירת גרסה חדשה" : "העלאה לספרייה",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "פרטי תמונה", exact: true }),
  ).toBeVisible();
  if (replace)
    await expect(
      page.getByRole("heading", { name: "גרסת תמונה 2 · נוכחית" }),
    ).toBeVisible();
  return page.url().split("/").pop()!;
}
function currentVersion(asset: string) {
  if (!/^[a-f0-9-]{36}$/.test(asset)) throw Error("Invalid test asset");
  return localSql(
    `select current_version_id from media_assets where id='${asset}'`,
  );
}
async function saveSelection(page: Page, id: string, number: number) {
  await page.goto(editor);
  await page
    .getByRole("combobox", { name: "תמונת השירות 1", exact: true })
    .selectOption(id);
  await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
  await expect(page.getByLabel("מצב פרסום")).toContainText(
    `טיוטה: גרסה ${number}`,
  );
}
async function publish(page: Page, number: number) {
  await page.getByLabel("אני מאשר/ת לפרסם את הגרסה השמורה").check();
  await page.getByRole("button", { name: "פרסום", exact: true }).click();
  await expect(page.getByLabel("מצב פרסום")).toContainText(
    `פורסם: גרסה ${number}`,
  );
}
test("media routes and upload independently deny anonymous, AAL1, nonmember and revoked sessions", async ({
  page,
  context,
  request,
}) => {
  const path = `/admin/media/${staticAsset}`;
  for (const url of ["/admin/media", path]) {
    await page.goto(url);
    await expect(page).toHaveURL(`${appOrigin}/admin/login`);
  }
  const denied = await request.post("/admin/media/upload", {
    headers: { origin: appOrigin },
    multipart: { file: await image(), altText: "Alt" },
  });
  expect(denied.ok()).toBe(false);
  await session(admin, context, false);
  for (const url of ["/admin/media", path]) {
    await page.goto(url);
    await expect(page).toHaveURL(`${appOrigin}/admin/mfa/setup`);
  }
  await context.clearCookies();
  await session(await createActor(false), context);
  await page.goto("/admin/media");
  await expect(page).toHaveURL(`${appOrigin}/admin/login?error=forbidden`);
  await context.clearCookies();
  await session(admin, context);
  localSql(
    `update cms_admin_members set is_active=false where user_id='${admin.id}'`,
  );
  await page.goto(path);
  await expect(page).toHaveURL(`${appOrigin}/admin/login?error=forbidden`);
});

test("upload, exact draft preview, publish, replacement and rollback preserve immutable media and public static site", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(90_000);
  await session(admin, context);
  await page.goto("/admin/media");
  const asset = await upload(page),
    v1 = currentVersion(asset);
  const privateResponse = await context.request.get(`/admin/media/file/${v1}`);
  expect(privateResponse.status()).toBe(200);
  expect(privateResponse.headers()["cache-control"]).toContain("no-store");
  expect(privateResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect((await request.get(`${published}/cms-media/${v1}`)).status()).toBe(
    404,
  );
  expect(
    (
      await request.get(`/admin/media/file/${v1}`, { maxRedirects: 0 })
    ).status(),
  ).not.toBe(200);
  expect(
    (
      await request.get(
        `/_next/image?url=${encodeURIComponent(`/admin/media/file/${v1}`)}&w=640&q=75`,
      )
    ).status(),
  ).not.toBe(200);
  expect(
    (
      await request.get(
        `${published}/_next/image?url=${encodeURIComponent(`/cms-media/${v1}`)}&w=640&q=75`,
      )
    ).status(),
  ).not.toBe(200);
  await saveSelection(page, v1, 2);
  const revision = state().draft_revision_id;
  expect(state().published_revision_id).toBe(baseline);
  expect((await request.get(`${published}/cms-media/${v1}`)).status()).toBe(
    404,
  );
  const response = await page.goto(preview(revision));
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page.locator(`img[src$="/admin/media/file/${v1}"]`)).toHaveCount(
    3,
  );
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      ["gtag", "fbq", "dataLayer"].some((k) => k in window),
    ),
  ).toBe(false);
  await page.goto(editor);
  await publish(page, 2);
  expect((await request.get(`${published}/cms-media/${v1}`)).status()).toBe(
    200,
  );
  const html = await (
    await request.get(`${published}/delicate-upholstery-cleaning`)
  ).text();
  expect(html).toContain(`/cms-media/${v1}`);
  expect(html).toContain("ניקוי ריפודים עדינים");
  const staticHtml = await (
    await request.get("/delicate-upholstery-cleaning")
  ).text();
  expect(staticHtml).not.toContain("/cms-media/");
  await page.goto(`/admin/media/${asset}`);
  await upload(page, "blue", true);
  const v2 = currentVersion(asset);
  expect(v2).not.toBe(v1);
  expect((await request.get(`${published}/cms-media/${v2}`)).status()).toBe(
    404,
  );
  expect(
    await (
      await request.get(`${published}/delicate-upholstery-cleaning`)
    ).text(),
  ).toContain(`/cms-media/${v1}`);
  await page.goto(preview(revision));
  await expect(page.locator(`img[src$="/admin/media/file/${v1}"]`)).toHaveCount(
    3,
  );
  await saveSelection(page, v2, 3);
  await publish(page, 3);
  expect(
    await (
      await request.get(`${published}/delicate-upholstery-cleaning`)
    ).text(),
  ).toContain(`/cms-media/${v2}`);
  await page
    .locator(`[data-revision="${baseline}"]`)
    .getByRole("button", { name: "שחזור כטיוטה חדשה" })
    .click();
  await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 4");
  await publish(page, 4);
  expect(
    await (
      await request.get(`${published}/delicate-upholstery-cleaning`)
    ).text(),
  ).not.toContain("/cms-media/");
  expect((await request.get(`${published}/cms-media/${v1}`)).status()).toBe(
    200,
  ); // Published disclosure is permanent, not draft secrecy.
  await page.goto(preview(revision));
  await expect(page.locator(`img[src$="/admin/media/file/${v1}"]`)).toHaveCount(
    3,
  );
  expect(
    localSql(`select count(*) from media_versions where asset_id='${asset}'`),
  ).toBe("2");
});

test("metadata conflict and replacement conflict retain second editor input without overwrite", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await session(admin, context);
  await page.goto("/admin/media");
  const asset = await upload(page);
  const second = await context.newPage();
  await second.goto(`/admin/media/${asset}`);
  const replacement = await context.newPage();
  await replacement.goto(`/admin/media/${asset}`);
  await page.getByLabel("תיאור חלופי בספרייה").fill("עריכה ראשונה");
  await second.getByLabel("תיאור חלופי בספרייה").fill("הקלט שלי נשאר");
  await page.getByRole("button", { name: "שמירת פרטים", exact: true }).click();
  await expect(page.getByText("מצב עריכה 2", { exact: false })).toBeVisible();
  await second
    .getByRole("button", { name: "שמירת פרטים", exact: true })
    .click();
  await expect(
    second.getByRole("form", { name: "פרטי מדיה" }).getByRole("alert"),
  ).toContainText("מנהל אחר שינה את המדיה");
  await expect(second.getByLabel("תיאור חלופי בספרייה")).toHaveValue(
    "הקלט שלי נשאר",
  );
  const form = replacement.getByRole("form", {
    name: "החלפת תמונה",
    exact: true,
  });
  await form.getByLabel("בחירת תמונה").setInputFiles(await image("blue"));
  await form.getByLabel("תיאור חלופי", { exact: true }).fill("החלפה ישנה");
  await form
    .getByRole("button", { name: "שמירת גרסה חדשה", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("מנהל אחר שינה את המדיה");
  await expect(form.getByLabel("תיאור חלופי", { exact: true })).toHaveValue(
    "החלפה ישנה",
  );
  expect(
    localSql(`select count(*) from media_versions where asset_id='${asset}'`),
  ).toBe("1");
  expect(
    localSql(`select alt_text from media_assets where id='${asset}'`),
  ).toBe("עריכה ראשונה");
  await second.close();
  await replacement.close();
});

test("archive hides new selection, retains usages and versions, and restore makes selection available", async ({
  page,
  context,
}) => {
  await session(admin, context);
  await page.goto(`/admin/media/${staticAsset}`);
  await expect(
    page.getByRole("region", { name: "שימושים בתוכן" }).getByRole("link"),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "העברה לארכיון", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "החזרה לבחירה", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/media");
  await expect(page.getByText("לא נמצאו תמונות מתאימות.")).toBeVisible();
  await page.getByLabel("הצגת נכסים בארכיון").check();
  await expect(
    page.getByRole("link", { name: "פרטי התמונה", exact: true }),
  ).toHaveCount(1);
  await page.goto(editor);
  await expect(page.getByLabel("תמונת השירות 1")).toContainText("(בארכיון)");
  await page.goto(preview(baseline));
  await expect(page.locator("main img")).toHaveCount(3);
  await page.goto(`/admin/media/${staticAsset}`);
  await page.getByRole("button", { name: "החזרה לבחירה", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "העברה לארכיון", exact: true }),
  ).toBeVisible();
  expect(localSql("select count(*) from media_versions")).toBe("1");
  expect(localSql("select count(*) from revision_media_refs")).toBe("3");
});

test("forged multipart image, wrong origin and duplicate file fields cannot create media", async ({
  context,
}) => {
  await session(admin, context);
  const upload = async (
    origin: string,
    file = {
      name: "fake.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("<svg><script>bad</script></svg>"),
    },
  ) =>
    context.request.post("/admin/media/upload", {
      headers: { origin },
      multipart: { file, altText: "Alt" },
    });
  expect((await upload(appOrigin)).status()).toBe(400);
  expect(
    (await upload("https://attacker.invalid", await image())).status(),
  ).toBe(403);
  const response = await context.request.post("/admin/media/upload", {
    headers: {
      origin: appOrigin,
      "content-type": "multipart/form-data; boundary=bad",
    },
    data: Buffer.alloc(9 * 1024 * 1024),
  });
  expect(response.status()).toBe(413);
  const part =
    '--duplicate\r\nContent-Disposition: form-data; name="file"; filename="x.png"\r\nContent-Type: image/png\r\n\r\nx\r\n';
  const duplicate = await context.request.post("/admin/media/upload", {
    headers: {
      origin: appOrigin,
      "content-type": "multipart/form-data; boundary=duplicate",
    },
    data: part + part + "--duplicate--\r\n",
  });
  expect(duplicate.status()).toBe(400);
  expect(localSql("select count(*) from media_assets")).toBe("1");
});

test("library search, file preview, RTL mobile layout and security headers work without marketing or credentials", async ({
  page,
  context,
}) => {
  await session(admin, context);
  const response = await page.goto("/admin/media");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await page.getByLabel("חיפוש בספרייה").fill("לא קיים");
  await expect(page.getByText("לא נמצאו תמונות מתאימות.")).toBeVisible();
  await page.getByLabel("חיפוש בספרייה").fill("ריפוד");
  await expect(
    page.getByRole("link", { name: "פרטי התמונה", exact: true }),
  ).toHaveCount(1);
  await page.getByLabel("בחירת תמונה").setInputFiles(await image());
  await expect(
    page.getByAltText("תצוגת התמונה שנבחרה לפני העלאה"),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      ["gtag", "fbq", "dataLayer"].some((k) => k in window),
    ),
  ).toBe(false);
  const scripts = await page
    .locator("script")
    .evaluateAll((nodes) => nodes.map((n) => n.outerHTML).join(""));
  expect(scripts).not.toMatch(
    /sb_secret_|service_role|googletagmanager|connect\.facebook/,
  );
});

test("drag/drop upload and ordered library selection persist exact version order", async ({
  page,
  context,
}) => {
  await session(admin, context);
  await page.goto("/admin/media");
  const file = await image("green");
  const transfer = await page.evaluateHandle(
    ({ bytes, name, type }) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], name, { type }));
      return transfer;
    },
    { bytes: Array.from(file.buffer), name: file.name, type: file.mimeType },
  );
  const form = page.getByRole("form", { name: "העלאת תמונה", exact: true });
  await form
    .locator(".border-dashed")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await form.getByLabel("תיאור חלופי", { exact: true }).fill("תמונה שנגררה");
  await form
    .getByRole("button", { name: "העלאה לספרייה", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "פרטי תמונה", exact: true }),
  ).toBeVisible();
  const version = currentVersion(page.url().split("/").pop()!);
  await page.goto(editor);
  await page.getByRole("button", { name: "הוספת תמונה", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "תמונת השירות 2", exact: true }),
  ).toHaveValue(version);
  await page
    .getByRole("button", { name: "העלאת תמונה 2", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "תמונת השירות 1", exact: true }),
  ).toHaveValue(version);
  await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
  await expect(page.getByLabel("מצב פרסום")).toContainText("טיוטה: גרסה 2");
  const refs = JSON.parse(
    localSql(
      `select json_agg(media_version_id order by position) from revision_media_refs where revision_id='${state().draft_revision_id}' and usage_role='hero'`,
    ),
  );
  expect(refs).toEqual([version, "d1000000-0000-4000-8000-000000000001"]);
  expect(localSql("select count(*) from revision_media_refs")).toBe("8");
  expect(state().published_revision_id).toBe(baseline);
});
