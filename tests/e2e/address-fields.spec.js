import { test, expect } from '@playwright/test';

// The two address fields of the estimate form. Each case below is one that
// used to behave wrongly: a pickup address that changed nothing, "address
// not found" for addresses that were found, and a few dead ends with no way
// out. OpenRouteService is mocked throughout — these assert our behaviour,
// not theirs, and the real key has a daily quota to protect.
const SUGGESTIONS = [
  { label: 'Kerkstraat 1, Diest, Belgie', lon: 5.0507, lat: 50.9853 },
  { label: 'Kerkstraat 5, Aarschot, Belgie', lon: 4.8362, lat: 50.9861 },
];

const geoBody = (items = SUGGESTIONS) => ({
  features: items.map((i) => ({ properties: { label: i.label }, geometry: { coordinates: [i.lon, i.lat] } })),
});
const routeBody = (km, min) => ({
  features: [
    {
      properties: { summary: { distance: km * 1000, duration: min * 60 } },
      geometry: { coordinates: [[4.937, 50.807], [5.0, 50.9], [5.0507, 50.9853]] },
    },
  ],
});

async function mockOrs(page, { km = 25, min = 25, suggestions = SUGGESTIONS } = {}) {
  const calls = [];
  await page.route('**://api.openrouteservice.org/**', (r) => {
    const url = r.request().url();
    calls.push(url);
    const body = url.includes('/geocode/') ? geoBody(suggestions) : routeBody(km, min);
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return calls;
}

async function pick(page, selector, text = 'Kerkstraat', index = 0) {
  if (selector === '#other-address') await page.selectOption('#dest', 'other');
  await page.fill(selector, text);
  const listbox = page.locator(`${selector === '#from' ? '#from-listbox' : '#other-address-listbox'} li[role="option"]`);
  await listbox.nth(index).waitFor({ timeout: 5000 });
  await listbox.nth(index).click();
}

test.describe('pickup address', () => {
  test('re-measures the trip when the visitor changes it', async ({ page }) => {
    // Used to quote the same price from anywhere: every distance was
    // measured from Tienen whatever the field said.
    const calls = await mockOrs(page, { km: 25, min: 25 });
    await page.goto('/fr/tarifs/');

    await page.selectOption('#dest', 'leu');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    const storedPrice = await page.locator('#price-label').innerText();
    expect(calls).toHaveLength(0); // the default pickup costs no request

    await page.click('#recompute-btn');
    await pick(page, '#from');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });

    expect(await page.locator('#price-label').innerText()).not.toBe(storedPrice);
    await expect(page.locator('#distance-label')).toContainText('25');
    await expect(page.locator('#route-label')).toContainText('Kerkstraat 1, Diest');
    expect(calls.some((u) => u.includes('/v2/directions/'))).toBe(true);
  });

  test('asks for a confirmed address instead of claiming it does not exist', async ({ page }) => {
    await mockOrs(page);
    await page.goto('/fr/tarifs/');
    await page.selectOption('#dest', 'leu');
    await page.fill('#from', 'Kerkstraat 1, Diest');
    await page.waitForTimeout(900);
    await page.click('#compute-btn');

    await expect(page.locator('#error-text')).toHaveText(/liste des suggestions/i);
    await expect(page.locator('#error-text')).not.toHaveText(/introuvable/i);
    // And the suggestions are opened on it rather than only complaining.
    await expect(page.locator('#from-listbox li[role="option"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('refuses an empty pickup address rather than messaging a driver without one', async ({ page }) => {
    await page.goto('/fr/tarifs/');
    await page.fill('#from', '');
    await page.selectOption('#dest', 'leu');
    await page.click('#compute-btn');

    await expect(page.locator('#error-text')).toHaveText(/adresse de départ/i);
    await expect(page.locator('#state-result')).toBeHidden();
  });

  test('caps what a crafted link can put in the field, and does not compute on it', async ({ page }) => {
    await mockOrs(page);
    const long = 'A'.repeat(300);
    await page.goto(`/fr/tarifs/?from=${encodeURIComponent(long)}&dest=leu`);

    expect((await page.locator('#from').inputValue()).length).toBe(120);
    // An unconfirmed pickup point must not silently produce a price.
    await expect(page.locator('#state-result')).toBeHidden();
    await expect(page.locator('#from')).toBeFocused();
  });

  test('still auto-computes when the link keeps the default pickup', async ({ page }) => {
    await page.goto('/fr/tarifs/?from=' + encodeURIComponent('Grote Markt, Tienen') + '&dest=leu');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#price-label')).toContainText('€');
  });
});

test.describe('destination address', () => {
  test('keeps the chosen address when the destination select is toggled', async ({ page }) => {
    // Coming back to "other address" used to leave the address on screen
    // while the form no longer considered it chosen — and then said it could
    // not be found.
    await mockOrs(page, { km: 25, min: 25 });
    await page.goto('/fr/tarifs/');
    await pick(page, '#other-address');
    const chosen = await page.locator('#other-address').inputValue();

    await page.selectOption('#dest', 'leu');
    await page.selectOption('#dest', 'other');
    expect(await page.locator('#other-address').inputValue()).toBe(chosen);

    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#route-label')).toContainText(chosen);
  });

  test('un-resolves the address once its text is edited', async ({ page }) => {
    await mockOrs(page);
    await page.goto('/fr/tarifs/');
    await pick(page, '#other-address');
    await page.fill('#other-address', 'Kerkstraat 1, Diest — modifié');
    await page.waitForTimeout(900);
    await page.click('#compute-btn');

    await expect(page.locator('#error-text')).toHaveText(/liste des suggestions/i);
    await expect(page.locator('#state-result')).toBeHidden();
  });

  test('Enter on an open list picks a suggestion instead of submitting', async ({ page }) => {
    await mockOrs(page, { km: 25, min: 25 });
    await page.goto('/fr/tarifs/');
    await page.selectOption('#dest', 'other');
    await page.fill('#other-address', 'Kerkstraat');
    await page.locator('#other-address-listbox li[role="option"]').first().waitFor({ timeout: 5000 });
    await page.locator('#other-address').press('Enter');

    expect(await page.locator('#other-address').inputValue()).toBe(SUGGESTIONS[0].label);
    await expect(page.locator('#state-error')).toBeHidden();
    await expect(page.locator('#other-address-listbox')).toBeHidden();
  });

  test('says it is searching while the lookup is in flight', async ({ page }) => {
    // Silence during the lookup reads as "nothing happened".
    await page.route('**://api.openrouteservice.org/geocode/**', async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(geoBody()) });
    });
    await page.goto('/fr/tarifs/');
    await page.selectOption('#dest', 'other');
    await page.fill('#other-address', 'Kerkstraat');

    await expect(page.locator('#other-address-listbox .suggestion-status')).toHaveText(/recherche/i, {
      timeout: 5000,
    });
    await expect(page.locator('#other-address-listbox li[role="option"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('says when a search returns nothing', async ({ page }) => {
    await mockOrs(page, { suggestions: [] });
    await page.goto('/fr/tarifs/');
    await page.selectOption('#dest', 'other');
    await page.fill('#other-address', 'zzzzzzzzzz');

    await expect(page.locator('#other-address-listbox .suggestion-status')).toHaveText(/aucune adresse/i, {
      timeout: 5000,
    });
    // A status row is not an option: it must never be selectable.
    await expect(page.locator('#other-address-listbox li[role="option"]')).toHaveCount(0);
    await expect(page.locator('#other-address')).toHaveAttribute('aria-expanded', 'false');
  });

  test('warns when the trip is longer than anything the dropdown offers', async ({ page }) => {
    await mockOrs(page, { km: 312.7, min: 190 });
    await page.goto('/fr/tarifs/');
    await pick(page, '#other-address');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('#long-distance-note')).toBeVisible();
    await expect(page.locator('#long-distance-note a[href^="tel:"]')).toBeVisible();
    // The price is still shown: the notice adds a way out, it does not hide
    // the estimate.
    await expect(page.locator('#price-label')).toContainText('€');
  });

  test('stays quiet for a normal trip', async ({ page }) => {
    await mockOrs(page, { km: 25, min: 25 });
    await page.goto('/fr/tarifs/');
    await pick(page, '#other-address');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#long-distance-note')).toBeHidden();
  });
});

test.describe('when OpenRouteService fails', () => {
  const cases = [
    { status: 404, body: '{"error":"no route"}', expected: /introuvable/i, name: 'no route found' },
    { status: 403, body: '{"error":"quota exceeded"}', expected: /indisponible/i, name: 'quota exhausted' },
    { status: 500, body: '{"error":"boom"}', expected: /indisponible/i, name: 'server error' },
  ];

  for (const { status, body, expected, name } of cases) {
    test(`${name} (${status}) gets its own message`, async ({ page }) => {
      // Telling a visitor their address does not exist because our quota ran
      // out sends them chasing a typo that is not there.
      await mockOrs(page);
      await page.goto('/fr/tarifs/');
      await pick(page, '#other-address');
      await page.unroute('**://api.openrouteservice.org/**');
      await page.route('**://api.openrouteservice.org/v2/directions/**', (r) =>
        r.fulfill({ status, contentType: 'application/json', body })
      );

      await page.click('#compute-btn');
      await expect(page.locator('#error-text')).toHaveText(expected, { timeout: 10_000 });
      await expect(page.locator('#state-error a[href^="tel:"]')).toBeVisible();
    });
  }
});
