import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import {
  createSourceLoader,
  elementTree,
  plain,
  projectRoot,
  resolveSourceImport,
} from "./helpers/source-module.mjs";

const publicRoutes = [
  "/", "/services", "/gallery", "/about", "/contact", "/sofa-cleaning",
  "/mattress-cleaning", "/carpet-cleaning", "/car-upholstery-cleaning",
  "/armchair-chair-cleaning", "/delicate-upholstery-cleaning",
  "/air-conditioner-cleaning", "/window-cleaning", "/privacy-policy",
  "/accessibility-statement", "/data-deletion",
];
const appDirectory = resolve(projectRoot, "src/app");

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

function routeFor(file) {
  return `/${relative(appDirectory, file).split("/")
    .filter((segment) => !segment.startsWith("(") && !/^(?:page|route)\.tsx?$/.test(segment))
    .join("/")}`;
}

function sourceDependencies(filename, visited = new Set()) {
  const absolute = resolve(projectRoot, filename);
  if (visited.has(absolute) || absolute.endsWith(".css")) return visited;
  visited.add(absolute);
  for (const imported of ts.preProcessFile(readFileSync(absolute, "utf8")).importedFiles) {
    const dependency = resolveSourceImport(imported.fileName, absolute);
    if (dependency) sourceDependencies(dependency, visited);
  }
  return visited;
}

test("all 16 public page URLs are preserved inside the public route group", () => {
  const pages = filesIn(resolve(appDirectory, "(site)"))
    .filter((file) => file.endsWith("/page.tsx"));
  assert.deepEqual(pages.map(routeFor).sort(), [...publicRoutes, "/[slug]"].sort());
  const allPages = filesIn(appDirectory).filter((file) => file.endsWith("/page.tsx"));
  const allRoutes = allPages.map(routeFor);
  assert.equal(new Set(allRoutes).size, allRoutes.length, "route groups must not create URL collisions");
  assert.deepEqual(allRoutes.sort(), [...publicRoutes, "/[slug]", "/admin", "/admin/login", "/admin/mfa/setup", "/admin/mfa/challenge", "/admin/onboarding/password", "/admin/services", "/admin/services/[serviceKey]", "/admin/preview/services/[serviceKey]", "/admin/media", "/admin/media/[id]", "/admin/pages", "/admin/pages/new", "/admin/pages/[pageId]", "/admin/pages/[pageId]/promotion", "/admin/preview/pages/[pageId]"].sort());
});

test("business API URLs stay outside the UI route groups; preview has no endpoint", () => {
  const handlers = filesIn(appDirectory).filter((file) => file.endsWith("/route.ts"));
  assert.deepEqual(handlers.map(routeFor).sort(), ["/admin/auth/confirm", "/admin/media/file/[id]", "/admin/media/upload", "/api/contact-lead", "/api/whatsapp", "/cms-media/[id]"]);
  assert.equal(existsSync(resolve(appDirectory, "layout.tsx")), false);
  assert.deepEqual(
    filesIn(resolve(appDirectory, "(preview)")).map((file) => relative(appDirectory, file)),
    ["(preview)/layout.tsx"],
  );
});

test("public metadata, sitemap and robots preserve canonical routes and behavior", async () => {
  const load = createSourceLoader();
  const { businessConfig } = load("src/config/business.ts");
  for (const route of publicRoutes) {
    const routeModule = load(`src/app/(site)${route === "/" ? "" : route}/page.tsx`);
    const metadata = routeModule.metadata ?? await routeModule.generateMetadata();
    assert.equal(metadata.alternates.canonical, `${businessConfig.siteUrl}${route}`);
  }
  const sitemap = await load("src/app/sitemap.ts").default();
  assert.deepEqual(
    plain(sitemap).sort((a, b) => a.url.localeCompare(b.url)),
    publicRoutes.filter((route) => route !== "/data-deletion").map((route) => ({
      url: `${businessConfig.siteUrl}${route === "/" ? "" : route}`,
      changeFrequency: route === "/" ? "weekly" : "monthly",
      priority: route === "/" ? 1 : 0.8,
    })).sort((a, b) => a.url.localeCompare(b.url)),
  );
  assert.deepEqual(plain(load("src/app/robots.ts").default()), {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${businessConfig.siteUrl}/sitemap.xml`,
  });
});

test("the public root retains one of each tracking integration and the early consent bootstrap", () => {
  const load = createSourceLoader();
  const layout = load("src/app/(site)/layout.tsx").default({ children: null });
  assert.equal(layout.type, "html");
  assert.equal(layout.props.lang, "he");
  assert.equal(layout.props.dir, "rtl");
  const nodes = elementTree(layout);
  for (const name of ["GoogleAdsTag", "BusinessEventTracker", "MarketingAttributionTracker", "MetaPixel", "CookieConsent", "Navbar", "Footer", "WhatsAppButton", "AccessibilityControls"]) {
    assert.equal(nodes.filter((node) => node.type.name === name).length, 1, name);
  }
  const bootstrap = nodes.filter((node) => node.props.id === "google-consent-defaults");
  assert.equal(bootstrap.length, 1);
  assert.equal(bootstrap[0].props.strategy, "beforeInteractive");
  assert.equal(bootstrap[0].props.children, load("src/lib/consent.ts").getGoogleConsentBootstrapScript());
  assert.ok(nodes.indexOf(bootstrap[0]) < nodes.findIndex((node) => node.type.name === "GoogleAdsTag"));
  assert.equal(nodes.filter((node) => node.props.id === "cleanbrothers-local-business-jsonld").length, 1);
});

for (const group of ["admin", "preview"]) {
  test(`${group} root is isolated from public marketing, lead forms and public navigation`, () => {
    const entry = `src/app/(${group})/layout.tsx`;
    const dependencies = [...sourceDependencies(entry)];
    if (group === "admin") {
      for (const file of filesIn(resolve(appDirectory, "(admin)"))) {
        if (/\.[jt]sx?$/.test(file)) dependencies.push(...sourceDependencies(file));
      }
      dependencies.push(...sourceDependencies("src/proxy.ts"));
    }
    for (const file of dependencies) {
      const sourcePath = relative(projectRoot, file);
      // Typed page CTA targets reuse the existing WhatsApp URL builder. The
      // authenticated preview disables that target before rendering a link.
      if (sourcePath !== "src/lib/whatsapp.ts")
        assert.doesNotMatch(sourcePath, /src\/(?:sections\/|app\/\(site\)\/|components\/(?:Google|Meta|BusinessEvent|MarketingAttribution|Cookie|ContactForm|WhatsApp|SummerAc)|lib\/(?:google-|meta-pixel|marketing-attribution|consent|whatsapp|contact-lead))/);
      // Admin now legitimately fetches its dedicated Auth/database service.
      assert.doesNotMatch(readFileSync(file, "utf8"), sourcePath === "src/lib/whatsapp.ts"
        ? /googletagmanager\.com|connect\.facebook\.net|\b(?:gtag|fbq)\s*\(|cleanbrothers-crm|\/api\/contact-lead/
        : /googletagmanager\.com|connect\.facebook\.net|\b(?:gtag|fbq)\s*\(|cleanbrothers-crm|\/api\/contact-lead|\/api\/whatsapp/);
    }
    const load = createSourceLoader();
    const { default: Layout, metadata } = load(entry);
    assert.deepEqual(plain(metadata.robots), { index: false, follow: false });
    assert.equal(metadata.alternates, undefined, "no public canonical inherited");
    const layout = Layout({ children: null });
    assert.equal(layout.type, "html");
    assert.equal(layout.props.lang, "he");
    assert.equal(layout.props.dir, "rtl");
    assert.equal(elementTree(layout).filter((node) => node.type === "script").length, 0);
  });
}

test("admin root stays Hebrew RTL and contains no unauthenticated dashboard or marketing scripts", () => {
  for (const nodeEnv of ["development", "production"]) {
    const load = createSourceLoader({ nodeEnv });
    const AdminLayout = load("src/app/(admin)/layout.tsx").default;
    const html = renderToStaticMarkup(AdminLayout({ children: null }));
    assert.match(html, /lang="he" dir="rtl"/);
    assert.match(html, /CleanBrothers CMS/);
    assert.doesNotMatch(html, /<form|<input|<button|<script/);
    assert.equal(html.includes("אימות משתמשים טרם חובר"), false);
  }
});
