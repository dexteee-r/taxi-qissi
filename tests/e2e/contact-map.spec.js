import { test, expect } from '@playwright/test';

// The contact page's served-area map. Unlike the simulator's, it is not
// behind a click, so what matters here is that it still loads late, that it
// degrades to the prototype's illustration, and that the page's two ways of
// reaching the driver survive a broken map (brief §5.3).
const CONTACT = { nl: '/nl/contact/', fr: '/fr/contact/', en: '/en/contact/' };

test.describe('service area map', () => {
  for (const [locale, path] of Object.entries(CONTACT)) {
    test(`${locale}: draws the served area to scale`, async ({ page }) => {
      await page.goto(path);

      const map = page.locator('#service-area-map');
      await expect(map).toBeVisible();
      // Leaflet marks the element it mounts into, rather than nesting one.
      await expect(map).toHaveClass(/leaflet-container/, { timeout: 15_000 });

      // The dashed circle is the service radius, drawn on the real map.
      await expect(map.locator('path[stroke="#0369a1"][stroke-dasharray]').first()).toBeAttached();
      // OpenStreetMap's licence requires visible attribution.
      await expect(map.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
      await expect(map).toHaveAttribute('aria-label', /20 km/);
      // A zone, not an address: no pin claiming a precision we do not have.
      await expect(map.locator('.leaflet-marker-icon')).toHaveCount(0);
    });
  }

  test('serves the illustration before scripts run, and asks for no tiles up front', async ({ page }) => {
    // With JavaScript disabled the prototype's drawing is what ships in the
    // HTML — the map is an enhancement, never the only content.
    const html = await (await page.request.get(CONTACT.nl)).text();
    expect(html).toContain('id="service-area-map"');
    expect(html).toContain('stroke-dasharray="5 5"');
    expect(html).not.toContain('tile.openstreetmap.org');
  });

  test('falls back to the illustration when Leaflet cannot load', async ({ page }) => {
    await page.route('**/leaflet-src*.js', (route) => route.abort());
    await page.goto(CONTACT.fr);

    const map = page.locator('#service-area-map');
    // The drawing is put back rather than leaving an empty box.
    await expect(map.locator('svg circle[stroke-dasharray]')).toBeAttached({ timeout: 15_000 });
    await expect(map).not.toHaveClass(/leaflet-container/);

    // Calling and WhatsApp still work — on mobile through the action bar,
    // on desktop through the buttons next to the details.
    await expect(page.locator('a[href^="tel:"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href*="wa.me"]:visible').first()).toBeVisible();
  });

  test('does not hijack the page scroll on mobile', async ({ page }) => {
    await page.goto(CONTACT.nl);
    await expect(page.locator('#service-area-map')).toHaveClass(/leaflet-container/, { timeout: 15_000 });
    const dragged = await page.evaluate(() => {
      const el = document.getElementById('service-area-map');
      return el?.classList.contains('leaflet-container') ?? false;
    });
    expect(dragged).toBe(true);
    // scrollWheelZoom is off, so wheeling over the map moves the page.
    const before = await page.evaluate(() => window.scrollY);
    await page.locator('#service-area-map').hover();
    await page.mouse.wheel(0, 400);
    await page.waitForFunction((y) => window.scrollY > y, before, { timeout: 5_000 });
  });
});
