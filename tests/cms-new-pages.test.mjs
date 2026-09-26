import assert from "node:assert/strict";
import test from "node:test";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

const routes = createSourceLoader()("src/cms/pages/routes.ts");
const model = createSourceLoader()("src/cms/pages/model.ts");

test("new page slugs cannot shadow existing or system routes", () => {
  for (const slug of ["about", "admin", "api", "services", "sofa-cleaning", "window-cleaning",
    "robots", "sitemap", "cms-media", "_next", "UPPER", "two--hyphens", "../admin",
    "a", "a".repeat(65), "x?revision=1", "x%2fadmin", "x.html", "x_foo", " x-page"])
    assert.throws(() => routes.validateNewPageSlug(slug));
  assert.equal(routes.newPagePath("a-safe-page"), "/a-safe-page");
});

test("new page payload is typed and canonical path matches its slug", () => {
  const defaultHero = model.defaultBlock("hero",0);
  const hero = { ...defaultHero, payload: { ...defaultHero.payload, title: "עמוד חדש" } };
  const input = { schemaVersion: 8, publicTitle: "עמוד חדש", h1: "עמוד חדש",
    seoTitle: "עמוד חדש | CleanBrothers", seoDescription: "תיאור העמוד",
    canonical: "/a-safe-page", blocks: [hero] };
  assert.equal(model.validatePageDraft(input).canonical, "/a-safe-page");
  for (const canonical of ["/about", "/Admin", "/a-safe-page?draft=1", "https://example.com/x"])
    assert.throws(() => model.validatePageDraft({ ...input, canonical }));
  assert.throws(() => model.validatePageDraft({ ...input, arbitraryHtml: "<script>" }));
  assert.throws(() => model.validatePageDraft({ ...input, blocks: [{ ...hero, type: "iframe" }] }));
  assert.deepEqual(plain(model.validatePageDraft(input).blocks.map(block => block.type)), ["hero"]);
});

test("new public pages require local CMS, explicit published source and exact allowlist", () => {
  const local = { CMS_SUPABASE_URL: "http://127.0.0.1:56321",
    CMS_NEW_PAGE_SOURCE: "published", CMS_NEW_PAGE_ALLOWLIST: "a-safe-page,another-page" };
  const source = env => createSourceLoader({ env })("src/cms/pages/new-environment.ts");
  assert.equal(source(local).newPagePublicAllowed("a-safe-page"), true);
  assert.deepEqual(plain(source(local).allowedNewPageSlugs()), ["a-safe-page", "another-page"]);
  for (const env of [
    { ...local, CMS_NEW_PAGE_SOURCE: "draft" }, { ...local, CMS_NEW_PAGE_ALLOWLIST: "*" },
    { ...local, CMS_NEW_PAGE_ALLOWLIST: "a-safe-page,a-safe-page" },
    { ...local, CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co" },
    { ...local, VERCEL: "1", VERCEL_ENV: "preview" },
    { ...local, VERCEL: "1", VERCEL_ENV: "production" },
  ]) assert.equal(source(env).newPagePublicAllowed("a-safe-page"), false);
  assert.equal(source(local).newPagePublicAllowed("not-listed"), false);
  assert.equal(source({ ...local, CMS_CONTENT_ENABLED: "true", CMS_PAGE_SOURCE: "published",
    CMS_PAGE_ALLOWLIST: "about", CMS_NEW_PAGE_SOURCE: undefined }).newPagePublicAllowed("a-safe-page"), false);
});
