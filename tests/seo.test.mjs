import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server.js';
import { createSourceLoader, elementTree, plain } from './helpers/source-module.mjs';

test('unknown public slug returns 404 before streaming; known pages retain attribution query', async () => {
  const load = createSourceLoader();
  const { proxy } = load('src/proxy.ts');
  const missing = await proxy(new NextRequest('http://localhost/no-such-service?utm_source=organic'));
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('x-robots-tag'), /noindex/);
  for (const path of load('src/lib/public-routes.ts').publicPagePaths) {
    const request = new NextRequest(`http://localhost${path}?utm_source=organic&gclid=example`);
    assert.equal((await proxy(request)).status, 200);
    assert.equal(request.nextUrl.searchParams.get('utm_source'), 'organic');
    assert.equal(request.nextUrl.searchParams.get('gclid'), 'example');
  }
});

test('every shared service uses published visible text for schema and references one business entity', () => {
  const load = createSourceLoader();
  const { ServiceLandingPage } = load('src/components/ServiceLandingPage.tsx');
  const { staticServiceConfigs } = load('src/content/static-source.ts');
  const { businessEntityId, buildLocalBusinessJsonLd } = load('src/lib/structured-data.ts');
  assert.equal(buildLocalBusinessJsonLd()['@id'], businessEntityId);
  for (const config of Object.values(staticServiceConfigs)) {
    const nodes = elementTree(ServiceLandingPage({ config }));
    const service = nodes.find(n => n.props.id === `${config.path.slice(1)}-service-jsonld`).props.data;
    assert.equal(service.name, config.serviceName);
    assert.equal(service.description, config.intro);
    assert.deepEqual(plain(service.provider), { '@id': businessEntityId });
    const html = renderToStaticMarkup(ServiceLandingPage({ config }));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /aria-label="פירורי לחם"/);
    assert.doesNotMatch(html, /FAQPage|aggregateRating/);
  }
});

test('image HTML is visible before hydration, while retaining preload for the primary image', () => {
  const load = createSourceLoader();
  const { ImageWithFallback } = load('src/components/ImageWithFallback.tsx');
  const html = renderToStaticMarkup(createElement(ImageWithFallback, {
    src: '/images/services/sofa-cleaning.png', alt: 'ספת בד', className: 'aspect-square', preload: true,
  }));
  const image = html.match(/<img[^>]*>/)?.[0];
  assert.ok(image);
  assert.doesNotMatch(image, /opacity-0|loading="lazy"/);
  assert.match(image, /alt="ספת בד"/);
});

test('contact query accepts only a supported CRM service and canonical stays query-free', async () => {
  const load = createSourceLoader();
  const page = load('src/app/(site)/contact/page.tsx');
  const { serviceOptions } = load('src/data/site.ts');
  const rendered = await page.default({ searchParams: Promise.resolve({ service: serviceOptions[0], utm_source: 'organic' }) });
  const form = elementTree(rendered).find(n => n.type.name === 'ContactForm');
  assert.equal(form.props.initialService, serviceOptions[0]);
  assert.equal(page.metadata.alternates.canonical, 'https://www.cleanbrothers.co.il/contact');
});

test('JSON-LD is a native script in initial server HTML and safely escapes markup', () => {
  const load = createSourceLoader();
  const { JsonLd } = load('src/components/JsonLd.tsx');
  const input = { '@type': 'Service', name: '</script><script>alert(1)</script>' };
  const html = renderToStaticMarkup(createElement(JsonLd, { id: 'seo-native-schema', data: input }));
  assert.match(html, /<script id="seo-native-schema" type="application\/ld\+json">/);
  assert.equal((html.match(/<script\b/g) || []).length, 1);
  const data = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(data), input);
  assert.ok(!data.includes('<'));
});
