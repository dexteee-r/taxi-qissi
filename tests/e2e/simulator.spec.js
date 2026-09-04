import { test, expect } from '@playwright/test';

const PHONE = '+32469230017';
const WHATSAPP = '32469230017';

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
    await expect(page.locator('#price-label')).toHaveText('64.00 €'); // 4 + 20×3
    await expect(page.locator('#distance-label')).toContainText('20 km');
    await expect(page.locator('#route-label')).toContainText('Leuven');

    // Breakdown adds up and the night line stays hidden by day.
    await expect(page.locator('#line-pickup')).toHaveText('4.00 €');
    await expect(page.locator('#line-km-cost')).toHaveText('60.00 €');
    await expect(page.locator('#line-night')).toBeHidden();

    // "Indicative" is always shown with a price (CDC §4 rule 2).
    await expect(page.locator('#indicative-badge')).toBeVisible();

    const href = await page.locator('#whatsapp-send').getAttribute('href');
    expect(href).toContain(`https://wa.me/${WHATSAPP}?text=`);
    const message = decodeURIComponent(href.split('?text=')[1]);
    expect(message).toContain('Leuven');
    expect(message).toContain('Jan Peeters');
    expect(message).toContain('64.00 €');
    expect(message).toContain('indicatief');
  });

  test('applies the night surcharge once, between 22:00 and 04:00', async ({ page }) => {
    await page.selectOption('#dest', 'leu');
    await page.fill('#time', '23:30');
    await page.click('#compute-btn');

    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#price-label')).toHaveText('67.00 €'); // 64 + 3
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
    await expect(page.locator('#distance-label')).toContainText('18 km');

    // No time was picked, so the simulator prices "now" — which means the
    // night surcharge applies if the suite happens to run between 22:00
    // and 04:00. Derive the expectation instead of hard-coding one.
    const hour = new Date().getHours();
    const expected = hour >= 22 || hour < 4 ? '61.00 €' : '58.00 €'; // 4 + 18×3 (+3)
    await expect(page.locator('#price-label')).toHaveText(expected);
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
