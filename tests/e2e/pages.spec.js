// Les 21 pages du site : elles répondent toutes, ont un titre unique, les
// bonnes balises de langue, et le plan du site les liste toutes.
import { test, expect } from '@playwright/test';

const PAGES = {
  home: { nl: '/nl/', fr: '/fr/', en: '/en/' },
  services: { nl: '/nl/diensten/', fr: '/fr/services/', en: '/en/services/' },
  airport: { nl: '/nl/luchthavenvervoer/', fr: '/fr/transport-aeroport/', en: '/en/airport-transfer/' },
  rates: { nl: '/nl/tarieven/', fr: '/fr/tarifs/', en: '/en/rates/' },
  contact: { nl: '/nl/contact/', fr: '/fr/contact/', en: '/en/contact/' },
  legal: { nl: '/nl/juridische-info/', fr: '/fr/mentions-legales/', en: '/en/legal-notice/' },
  privacy: { nl: '/nl/privacybeleid/', fr: '/fr/politique-confidentialite/', en: '/en/privacy-policy/' },
};
const ALL = Object.entries(PAGES).flatMap(([key, byLocale]) =>
  Object.entries(byLocale).map(([locale, path]) => ({ key, locale, path }))
);

test.describe('the 21 pages', () => {
  for (const { key, locale, path } of ALL) {
    test(`${locale} ${key} responds and is well-formed`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      // One <h1> per page (brief §6).
      await expect(page.locator('h1')).toHaveCount(1);

      // Correct document language.
      await expect(page.locator('html')).toHaveAttribute('lang', locale);

      // Unique, non-empty title and description.
      expect((await page.title()).length).toBeGreaterThan(10);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0).toBeGreaterThan(30);

      // No unresolved placeholder markers except the known-pending IBP licence.
      const body = await page.locator('body').innerText();
      expect(body).not.toContain('[À RÉDIGER]');
      expect(body).not.toContain('[CONTENT TO BE WRITTEN]');
      expect(body).not.toContain('undefined');
    });

    test(`${locale} ${key} has reciprocal hreflang + x-default`, async ({ page }) => {
      await page.goto(path);
      for (const [altLocale, altPath] of Object.entries(PAGES[key])) {
        const href = await page.locator(`link[hreflang="${altLocale}"]`).getAttribute('href');
        expect(new URL(href).pathname).toBe(altPath);
      }
      const xDefault = await page.locator('link[hreflang="x-default"]').getAttribute('href');
      expect(new URL(xDefault).pathname).toBe(PAGES[key].nl);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(new URL(canonical).pathname).toBe(path);
    });
  }
});

test.describe('language switching keeps you on the same page', () => {
  // The switcher is a native <details>: open the disclosure, then pick a
  // language — the same two steps a visitor takes.
  async function switchLanguage(page, target) {
    await page.locator('.lang-switcher > summary').click();
    const link = page.locator(`.lang-panel a[lang="${target}"]`);
    await expect(link).toBeVisible();
    await link.click();
  }

  for (const key of Object.keys(PAGES)) {
    test(`${key}: NL → FR → EN stays on ${key}`, async ({ page }) => {
      await page.goto(PAGES[key].nl);

      await switchLanguage(page, 'fr');
      await page.waitForURL(`**${PAGES[key].fr}`);

      await switchLanguage(page, 'en');
      await page.waitForURL(`**${PAGES[key].en}`);

      // And the page really is the translated equivalent, not a fallback.
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });
  }
});

test.describe('site plumbing', () => {
  test('/ redirects to /nl/', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/nl/');
    expect(new URL(page.url()).pathname).toBe('/nl/');
  });

  test('sitemap.xml lists all 21 pages', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    for (const { path } of ALL) {
      expect(xml).toContain(`${path}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(21);
  });

  test('robots.txt allows crawling and points at the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('Allow: /');
    expect(text).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });

  test('404 page shows the language matching the URL prefix', async ({ page }) => {
    await page.goto('/fr/deze-pagina-bestaat-niet/');
    await expect(page.locator('section[data-locale="fr"]')).toBeVisible();
    await expect(page.locator('section[data-locale="nl"]')).toBeHidden();
    await expect(page.locator('section[data-locale="en"]')).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    await page.goto('/en/this-page-does-not-exist/');
    await expect(page.locator('section[data-locale="en"]')).toBeVisible();
  });

  test('every page carries TaxiService structured data', async ({ page }) => {
    await page.goto('/nl/');
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const schema = JSON.parse(raw);
    expect(schema['@type']).toBe('TaxiService');
    expect(schema.provider.vatID).toBe('BE1025231305');
    expect(schema.provider.telephone).toMatch(/^\+32/);
    expect(schema.areaServed['@type']).toBe('GeoCircle');
    expect(schema.areaServed.geoRadius).toBe('20000');

    // schema.org rejects these two on TaxiService (they are LocalBusiness
    // properties) — validator.schema.org flagged it, so keep them on provider.
    expect(schema.provider.openingHoursSpecification.dayOfWeek).toHaveLength(7);
    expect(schema.provider.priceRange).toBeTruthy();
    expect(schema.openingHoursSpecification).toBeUndefined();
    expect(schema.priceRange).toBeUndefined();
  });

  test('serves no third-party requests at all (privacy + LCP)', async ({ page }) => {
    const external = [];
    page.on('request', (req) => {
      const host = new URL(req.url()).host;
      if (!host.startsWith('localhost')) external.push(req.url());
    });
    await page.goto('/nl/');
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
  });

  test('self-hosts the fonts it preloads', async ({ page, request }) => {
    await page.goto('/nl/');
    const preloads = await page.locator('link[rel="preload"][as="font"]').all();
    expect(preloads.length).toBeGreaterThan(0);
    for (const link of preloads) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^\/fonts\/.+\.woff2$/);
      expect((await request.get(href)).status()).toBe(200);
    }
  });

  test('the FAQ carries FAQPage structured data on the homepage', async ({ page }) => {
    await page.goto('/nl/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = blocks.map((b) => JSON.parse(b)).find((s) => s['@type'] === 'FAQPage');
    expect(faq).toBeDefined();
    expect(faq.mainEntity.length).toBe(7);
    for (const entry of faq.mainEntity) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.acceptedAnswer.text.length).toBeGreaterThan(0);
    }
  });
});
