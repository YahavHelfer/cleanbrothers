import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader, plain } from './helpers/source-module.mjs';
test('only Vercel Preview deployments receive global noindex headers', () => {
  for (const env of ['preview', 'production', 'development', undefined]) {
    const config = createSourceLoader({ env: env ? { VERCEL_ENV: env } : {} })('next.config.ts').default;
    const rules = plain(config.headers());
    assert.deepEqual(rules, env === 'preview' ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }] : []);
  }
});
