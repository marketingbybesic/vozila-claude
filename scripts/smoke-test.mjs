#!/usr/bin/env node
// Vozila.hr — production smoke test.
// Walks 12 critical user paths via Playwright headless against a deployed URL.
// Verifies HTTP status + key DOM landmarks. Exits non-zero on any failure.
//
// Usage:
//   node scripts/smoke-test.mjs https://testiranje.cloud
//
// Skips paths that require auth (messaging, dashboard, settings) — those are
// covered manually via the runbook section 10.

import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'https://testiranje.cloud';
const TIMEOUT_MS = 15_000;

// Minimal hand-rolled assert so we don't pull in another dep.
function assert(cond, msg) {
  if (!cond) {
    throw new Error(`FAIL: ${msg}`);
  }
}

const PATHS = [
  {
    name: 'Home',
    url: '/',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
      const title = await page.title();
      assert(title.length > 0, 'page has a <title>');
      assert(title.toLowerCase().includes('vozila'), 'title mentions Vozila');
    },
  },
  {
    name: 'Listing feed (default)',
    url: '/pretraga',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
      // Filter sidebar exists.
      const hasSidebar = await page.locator('text=/Cijena|Filteri|Marka/i').count();
      assert(hasSidebar > 0, 'feed renders filter sidebar');
    },
  },
  {
    name: 'Category — osobni-automobili',
    url: '/osobni-automobili',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
      // Either listings render or empty-state.
      const ok = await page.locator('text=/€|EUR|Nema oglasa/').first().count();
      assert(ok > 0, 'category page renders price tags or empty state');
    },
  },
  {
    name: 'Make landing — /marka/bmw',
    url: '/marka/bmw',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
      const heading = await page.locator('h1').first().textContent();
      assert(heading && /BMW/i.test(heading), 'heading mentions BMW');
    },
  },
  {
    name: 'Pricing — /za-partnere',
    url: '/za-partnere',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
      // Three tier names.
      for (const tier of ['Bronze', 'Silver', 'Gold']) {
        const visible = await page.locator(`text=${tier}`).first().isVisible();
        assert(visible, `tier ${tier} visible`);
      }
    },
  },
  {
    name: 'Saloni — dealer index',
    url: '/saloni',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
    },
  },
  {
    name: 'Auctions — /aukcija',
    url: '/aukcija',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
      const heading = await page.locator('h1').first().textContent();
      assert(heading && /aukcij/i.test(heading), 'auction page heading present');
    },
  },
  {
    name: 'About — /o-nama',
    url: '/o-nama',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
    },
  },
  {
    name: 'Privacy — /privatnost',
    url: '/privatnost',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
    },
  },
  {
    name: 'Terms — /uvjeti-koristenja',
    url: '/uvjeti-koristenja',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
    },
  },
  {
    name: 'Kontakt',
    url: '/kontakt',
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
    },
  },
  {
    name: '404 — unknown route',
    url: '/this-route-does-not-exist-' + Date.now(),
    check: async (page) => {
      await page.waitForSelector('main', { timeout: TIMEOUT_MS });
      const body = await page.locator('main').textContent();
      assert(body && /404|nije pronađen/i.test(body), '404 page shows not-found text');
    },
  },
];

// Resource probes that don't need a browser.
async function probe(name, url, expectStatus = 200, expectType = null) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    assert(res.status === expectStatus, `${name}: HTTP ${res.status} (expected ${expectStatus})`);
    if (expectType) {
      const ct = res.headers.get('content-type') ?? '';
      assert(ct.includes(expectType), `${name}: Content-Type "${ct}" doesn't include "${expectType}"`);
    }
    return { name, ok: true };
  } catch (e) {
    return { name, ok: false, error: e.message };
  }
}

async function main() {
  console.log(`\n→ Vozila.hr smoke test against ${BASE}\n`);

  const results = [];

  // Resource probes (no browser needed).
  console.log('— Resource probes —');
  for (const r of [
    await probe('robots.txt', `${BASE}/robots.txt`, 200, 'text'),
    await probe('manifest.webmanifest', `${BASE}/manifest.webmanifest`, 200, 'json'),
    await probe('favicon', `${BASE}/vozilahrfavicon.svg`, 200, 'svg'),
    // Sitemap may be a hosting rewrite OR live at /sitemap.xml — accept any 2xx.
    await probe('sitemap.xml', `${BASE}/sitemap.xml`, 200, 'xml'),
  ]) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.error}`}`);
    results.push(r);
  }
  console.log();

  // Browser probes.
  console.log('— Browser walks —');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Vozila-Smoke-Test)',
    locale: 'hr-HR',
  });
  const page = await ctx.newPage();

  // Capture page errors so we don't false-pass on a JS exception.
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  for (const path of PATHS) {
    pageErrors.length = 0;
    const url = `${BASE}${path.url}`;
    try {
      const t0 = Date.now();
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
      const status = res?.status() ?? 0;
      assert(status >= 200 && status < 400, `${path.name}: HTTP ${status}`);
      await path.check(page);
      const t = Date.now() - t0;
      assert(pageErrors.length === 0, `${path.name}: page JS errors: ${pageErrors.join(' | ')}`);
      console.log(`  ✓ ${path.name}  (${t}ms)`);
      results.push({ name: path.name, ok: true });
    } catch (e) {
      console.log(`  ✗ ${path.name} — ${e.message}`);
      results.push({ name: path.name, ok: false, error: e.message });
    }
  }
  console.log();

  await browser.close();

  // Summary.
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`= ${passed} passed, ${failed} failed of ${results.length} total`);

  if (failed > 0) {
    console.log('\nFAILURES:');
    for (const r of results.filter((r) => !r.ok)) console.log(`  - ${r.name}: ${r.error}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(2);
});
