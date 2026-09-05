import { test, expect } from '@playwright/test';
import { DESTINATIONS } from '../../src/data/destinations.js';
import { estimateFare } from '../../src/lib/fare.js';
import { formatEuro, formatKm } from '../../src/lib/format.js';

const PHONE = '+32469230017';
const WHATSAPP = '32469230017';

// Expectations are derived from the destination data rather than hard-coded,
// so re-running `npm run verify:distances` cannot silently break the suite —
// and the assertions keep checking the tariff rule, not a frozen number.
const dest = (id) => DESTINATIONS.find((d) => d.id === id);
const priceFor = (id, hour, locale = 'nl') => formatEuro(estimateFare(dest(id).km, hour).total, locale);

test.describe('price simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nl/tarieven/');
  });

  test('computes a known destination and offers a pre-filled WhatsApp message', async ({ page }) => {
    await page.selectOption('#dest', 'leu'); // Leuven, 20 km
    await page.fill('#time', '15:00');
    await page.fill('#name', 'Jan Peeters');
    await page.click('#compute-btn');

    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#price-label')).toHaveText(priceFor('leu', 15)); // 4 + km×3
    await expect(page.locator('#distance-label')).toContainText(formatKm(dest('leu').km, 'nl'));
    await expect(page.locator('#route-label')).toContainText('Leuven');

    // Breakdown adds up and the night line stays hidden by day.
    await expect(page.locator('#line-pickup')).toHaveText(formatEuro(4, 'nl'));
    await expect(page.locator('#line-km-cost')).toHaveText(formatEuro(dest('leu').km * 3, 'nl'));
    await expect(page.locator('#line-night')).toBeHidden();

    // "Indicative" is always shown with a price (CDC §4 rule 2).
    await expect(page.locator('#indicative-badge')).toBeVisible();

    const href = await page.locator('#whatsapp-send').getAttribute('href');
    expect(href).toContain(`https://wa.me/${WHATSAPP}?text=`);
    const message = decodeURIComponent(href.split('?text=')[1]);
    expect(message).toContain('Leuven');
    expect(message).toContain('Jan Peeters');
    expect(message).toContain(priceFor('leu', 15));
    expect(message).toContain('indicatief');
  });

  test('applies the night surcharge once, between 22:00 and 04:00', async ({ page }) => {
    await page.selectOption('#dest', 'leu');
    await page.fill('#time', '23:30');
    await page.click('#compute-btn');

    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#price-label')).toHaveText(priceFor('leu', 23)); // day price + 3
    await expect(page.locator('#line-night')).toBeVisible();
  });

  test('shows "to be confirmed" instead of a price for airport transfers', async ({ page }) => {
    await page.selectOption('#dest', 'zav');
    await page.click('#compute-btn');

    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#price-label')).toHaveText('te bevestigen');
    await expect(page.locator('#breakdown')).toBeHidden();
    await expect(page.locator('#indicative-badge')).toBeHidden();

    // The call CTA replaces the missing price.
    const tbc = page.locator('#tbc-note');
    await expect(tbc).toBeVisible();
    await expect(tbc.locator(`a[href="tel:${PHONE}"]`)).toBeVisible();

    const href = await page.locator('#whatsapp-send').getAttribute('href');
    const message = decodeURIComponent(href.split('?text=')[1]);
    expect(message).toContain('Graag de prijs bevestigen');
    expect(message).not.toMatch(/\d+\.\d\d €/);
  });

  test('errors gracefully with the call button reachable when no destination is chosen', async ({ page }) => {
    await page.click('#compute-btn');
    const error = page.locator('#state-error');
    await expect(error).toBeVisible();
    await expect(error.locator(`a[href="tel:${PHONE}"]`)).toBeVisible();
    await expect(page.locator('#state-result')).toBeHidden();
  });

  test('reveals the address lookup for "other address" and fails safe without a match', async ({ page }) => {
    await page.selectOption('#dest', 'other');
    await expect(page.locator('#other-address-wrap')).toBeVisible();

    await page.fill('#other-address', 'Ergens in Vlaanderen');
    await page.click('#compute-btn');

    // No resolved coordinates → explicit error + call button, never a wrong price.
    const error = page.locator('#state-error');
    await expect(error).toBeVisible();
    await expect(error.locator(`a[href="tel:${PHONE}"]`)).toBeVisible();
    await expect(page.locator('#state-result')).toBeHidden();
  });

  test('lets you change the ride and start over', async ({ page }) => {
    await page.selectOption('#dest', 'leu');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });

    await page.click('#recompute-btn');
    await expect(page.locator('#state-result')).toBeHidden();
    await expect(page.locator('#compute-btn')).toBeVisible();
  });

  test('passenger and luggage counters clamp to their bounds', async ({ page }) => {
    await expect(page.locator('#pax-value')).toHaveText('2');
    for (let i = 0; i < 12; i++) await page.click('#pax-up');
    await expect(page.locator('#pax-value')).toHaveText('8');
    for (let i = 0; i < 12; i++) await page.click('#pax-down');
    await expect(page.locator('#pax-value')).toHaveText('1'); // never 0 passengers

    for (let i = 0; i < 5; i++) await page.click('#bags-down');
    await expect(page.locator('#bags-value')).toHaveText('0'); // 0 bags is valid
  });

  test('never posts form data anywhere', async ({ page }) => {
    const outbound = [];
    page.on('request', (req) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method())) outbound.push(req.url());
    });

    await page.selectOption('#dest', 'leu');
    await page.fill('#name', 'Jan Peeters');
    await page.fill('#note', 'Vlucht SN2104');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });

    // brief §1.1: nothing typed into the form may leave the browser.
    expect(outbound).toEqual([]);
    expect(page.url()).not.toContain('Jan');
  });
});

test.describe('route map', () => {
  test('loads nothing third-party until an estimate is asked for (brief §7)', async ({ page }) => {
    const external = [];
    page.on('request', (req) => {
      const host = new URL(req.url()).host;
      if (!host.startsWith('localhost')) external.push(host);
    });

    await page.goto('/nl/tarieven/');
    await page.waitForLoadState('networkidle');

    // The map is deferred: no tiles, no Leaflet, nothing external on load.
    expect(external).toEqual([]);
    await expect(page.locator('#route-map')).toBeHidden();
  });

  test('draws the real route for a preset destination', async ({ page }) => {
    await page.goto('/nl/tarieven/');
    await page.selectOption('#dest', 'leu');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });

    const map = page.locator('#route-map');
    await expect(map).toBeVisible({ timeout: 15_000 });
    // Leaflet marks the element it mounts into, rather than nesting one.
    await expect(map).toHaveClass(/leaflet-container/, { timeout: 15_000 });

    // A real route, not the straight line the brief forbids: the polyline
    // has many segments because it follows the road.
    const segments = await map
      .locator('path[stroke="#0369a1"]')
      .first()
      .evaluate((el) => (el.getAttribute('d')?.match(/L/g) ?? []).length);
    expect(segments).toBeGreaterThan(5);

    // OpenStreetMap's licence requires visible attribution.
    await expect(map.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
    await expect(map).toHaveAttribute('aria-label', /→/);
  });

  test('keeps the price and the call button when the map fails (brief §5.3)', async ({ page }) => {
    // Simulate the tile provider being unreachable.
    await page.route('**://tile.openstreetmap.org/**', (route) => route.abort());
    await page.goto('/nl/tarieven/');
    await page.selectOption('#dest', 'leu');
    await page.click('#compute-btn');

    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#price-label')).not.toBeEmpty();
    await expect(page.locator('#whatsapp-send')).toBeVisible();
    await expect(page.locator('.mobile-action-bar a[href^="tel:"], .header-call a[href^="tel:"]').first()).toBeAttached();
  });
});

test.describe('receipt layout follows the prototype at each breakpoint', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nl/tarieven/');
    await page.selectOption('#dest', 'leu');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
  });

  test('mobile: full-width WhatsApp CTA, then the message, then "change my ride"', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile artboard only');

    const wa = await page.locator('#whatsapp-send').boundingBox();
    const message = await page.locator('.receipt-msg').boundingBox();
    const reset = await page.locator('#recompute-btn').boundingBox();

    expect(message.y).toBeGreaterThan(wa.y + wa.height); // message below the CTA
    expect(reset.y).toBeGreaterThan(message.y); // "change my ride" last

    // The CTA spans the card, as in TaxiScreen.
    const card = await page.locator('.sim-card').boundingBox();
    expect(wa.width).toBeGreaterThan(card.width * 0.8);
  });

  test('desktop: both buttons group together above the message', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop artboard only');

    // The actions become a real flex row (they are display:contents on
    // mobile so the message can slot between them). Whether the second
    // button wraps to a new line depends on the translated label length —
    // the prototype uses flex-wrap for exactly that reason, so assert the
    // grouping and the sizing, not a fixed one-line layout.
    await expect(page.locator('.receipt-actions')).toHaveCSS('display', 'flex');
    await expect(page.locator('.receipt-actions')).toHaveCSS('flex-wrap', 'wrap');

    const wa = await page.locator('#whatsapp-send').boundingBox();
    const reset = await page.locator('#recompute-btn').boundingBox();
    const message = await page.locator('.receipt-msg').boundingBox();
    const card = await page.locator('.sim-card').boundingBox();

    expect(reset.y).toBeGreaterThanOrEqual(wa.y); // reset after the CTA
    expect(message.y).toBeGreaterThan(reset.y); // message below both
    expect(wa.width).toBeLessThan(card.width * 0.8); // sized to content, not full width
  });

  test('scales the price and the route map per breakpoint', async ({ page, isMobile }) => {
    const price = await page
      .locator('.receipt-price')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const mapHeight = (await page.locator('.receipt-map').boundingBox()).height;

    if (isMobile) {
      expect(price).toBeCloseTo(44, 0);
      expect(mapHeight).toBeCloseTo(132, 0);
    } else {
      expect(price).toBeCloseTo(62, 0);
      expect(mapHeight).toBeCloseTo(190, 0);
    }
  });
});

test.describe('homepage estimator hand-off', () => {
  test('carries the chosen destination into the simulator and auto-computes', async ({ page }) => {
    await page.goto('/nl/');
    await page.selectOption('#home-dest', 'stt'); // Sint-Truiden, 18 km
    await page.click('.estimator button[type="submit"]');

    await page.waitForURL('**/nl/tarieven/**');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#route-label')).toContainText('Sint-Truiden');
    await expect(page.locator('#distance-label')).toContainText(formatKm(dest('stt').km, 'nl'));

    // No time was picked, so the simulator prices "now" — which means the
    // night surcharge applies if the suite happens to run between 22:00
    // and 04:00. Derive the expectation instead of hard-coding one.
    await expect(page.locator('#price-label')).toHaveText(priceFor('stt', new Date().getHours()));
  });
});

test.describe('simulator accessibility', () => {
  test('is operable with the keyboard alone', async ({ page }) => {
    await page.goto('/nl/tarieven/');
    await page.locator('#dest').focus();
    await page.keyboard.press('ArrowDown'); // pick the first real option
    await expect(page.locator('#dest')).not.toHaveValue('');

    // Tab to the submit button and activate it without a mouse.
    await page.locator('#compute-btn').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
  });

  test('labels every field', async ({ page }) => {
    await page.goto('/nl/tarieven/');
    for (const id of ['from', 'dest', 'date', 'time', 'name', 'note']) {
      const label = page.locator(`label[for="${id}"]`);
      await expect(label, id).toHaveCount(1);
      expect((await label.innerText()).trim().length).toBeGreaterThan(0);
    }
  });
});
