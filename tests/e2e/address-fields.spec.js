import { test, expect } from '@playwright/test';
import { DESTINATIONS } from '../../src/data/destinations.js';
import { mockOrs, chooseAddress, LEUVEN } from './ors-mock.js';

// The two address fields of the estimate form. Each case below is one that
// used to behave wrongly: a pickup address that changed nothing, "address
// not found" for addresses that were found, and a few dead ends with no way
// out. OpenRouteService is mocked throughout — these assert our behaviour,
// not theirs, and the real key has a daily quota to protect.

test.describe('pickup address', () => {
  test('re-measures the trip when the visitor changes it', async ({ page }) => {
    // Used to quote the same price from anywhere: every distance was
    // measured from Tienen whatever the field said.
    const calls = await mockOrs(page, { km: 25, min: 25 });
    await page.goto('/fr/tarifs/');

    await chooseAddress(page, '#dest', 'Leuven');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });

    const routes = calls.filter((u) => u.includes('/v2/directions/'));
    expect(routes).toHaveLength(1);
    // The default pickup point travels as the route's start, unchanged.
    expect(routes[0]).toContain('start=4.9371503%2C50.8075398');

    await page.click('#recompute-btn');
    await chooseAddress(page, '#from', 'Kerkstraat, Diest');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });

    const rerouted = calls.filter((u) => u.includes('/v2/directions/'));
    expect(rerouted).toHaveLength(2);
    expect(rerouted[1]).not.toContain('start=4.9371503%2C50.8075398');
    await expect(page.locator('#route-label')).toContainText('Kerkstraat, Diest');
  });

  test('asks for a confirmed address instead of claiming it does not exist', async ({ page }) => {
    await mockOrs(page);
    await page.goto('/fr/tarifs/');

    await chooseAddress(page, '#dest', 'Leuven');
    await page.fill('#from', 'Kerkstraat 1, Diest');
    await page.waitForTimeout(900);
    await page.click('#compute-btn');

    await expect(page.locator('#error-text')).toHaveText(/liste des suggestions/i);
    await expect(page.locator('#error-text')).not.toHaveText(/introuvable/i);
    // And the suggestions are opened on it rather than only complaining.
    await expect(page.locator('#from-listbox li[role="option"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('refuses an empty pickup address rather than messaging a driver without one', async ({ page }) => {
    await mockOrs(page);
    await page.goto('/fr/tarifs/');

    await chooseAddress(page, '#dest', 'Leuven');
    await page.fill('#from', '');
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
    await mockOrs(page);
    await page.goto('/fr/tarifs/?from=' + encodeURIComponent('Grote Markt, Tienen') + '&dest=leu');

    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#price-label')).toContainText('€');
    // The id from the teaser is resolved into the destination field.
    await expect(page.locator('#dest')).toHaveValue(DESTINATIONS.find((d) => d.id === 'leu').fr);
  });
});

test.describe('destination address', () => {
  test('accepts any address, not only the fifteen the dropdown used to list', async ({ page }) => {
    // The whole point of dropping the list: a visitor going somewhere else
    // no longer has to find an "other address" entry at the bottom of it.
    await mockOrs(page, { km: 18.4, min: 22 });
    await page.goto('/fr/tarifs/');

    await expect(page.locator('select#dest')).toHaveCount(0);
    await chooseAddress(page, '#dest', 'Rue de la Station 12, Hoegaarden');
    await page.click('#compute-btn');

    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#route-label')).toContainText('Hoegaarden');
    await expect(page.locator('#distance-label')).toContainText('18,4');
  });

  test('un-resolves the address once its text is edited', async ({ page }) => {
    await mockOrs(page);
    await page.goto('/fr/tarifs/');

    await chooseAddress(page, '#dest', 'Leuven');
    await page.fill('#dest', 'Leuven — modifié');
    await page.waitForTimeout(900);
    await page.click('#compute-btn');

    await expect(page.locator('#error-text')).toHaveText(/liste des suggestions/i);
    await expect(page.locator('#state-result')).toBeHidden();
  });

  test('Enter on an open list picks a suggestion instead of submitting', async ({ page }) => {
    await mockOrs(page);
    await page.goto('/fr/tarifs/');

    await page.fill('#dest', 'Leuven');
    await page.locator('#dest-listbox li[role="option"]').first().waitFor({ timeout: 5000 });
    await page.locator('#dest').press('Enter');

    expect(await page.locator('#dest').inputValue()).toBe('Leuven');
    await expect(page.locator('#state-error')).toBeHidden();
    await expect(page.locator('#dest-listbox')).toBeHidden();
  });

  test('says it is searching while the lookup is in flight', async ({ page }) => {
    // Silence during the lookup reads as "nothing happened".
    await page.route('**://api.openrouteservice.org/geocode/**', async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          features: [{ properties: { label: 'Leuven' }, geometry: { coordinates: [LEUVEN.lon, LEUVEN.lat] } }],
        }),
      });
    });
    await page.goto('/fr/tarifs/');
    await page.fill('#dest', 'Leuven');

    await expect(page.locator('#dest-listbox .suggestion-status')).toHaveText(/recherche/i, {
      timeout: 5000,
    });
    await expect(page.locator('#dest-listbox li[role="option"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('says when a search returns nothing', async ({ page }) => {
    await mockOrs(page, { noResults: true });
    await page.goto('/fr/tarifs/');
    await page.fill('#dest', 'zzzzzzzzzz');

    await expect(page.locator('#dest-listbox .suggestion-status')).toHaveText(/aucune adresse/i, {
      timeout: 5000,
    });
    // A status row is not an option: it must never be selectable.
    await expect(page.locator('#dest-listbox li[role="option"]')).toHaveCount(0);
    await expect(page.locator('#dest')).toHaveAttribute('aria-expanded', 'false');
  });

  test('says the lookup is unavailable rather than going quiet', async ({ page }) => {
    // A production build once shipped with no API key: every lookup threw,
    // the list closed, and the page looked like it had simply ignored the
    // typing. Silence and "no such address" must never look the same.
    await page.route('**://api.openrouteservice.org/geocode/**', (r) =>
      r.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"quota exceeded"}' })
    );
    await page.goto('/fr/tarifs/');
    await page.fill('#dest', 'Leuven');

    await expect(page.locator('#dest-listbox .suggestion-status')).toHaveText(/indisponible/i, {
      timeout: 5000,
    });

    // And computing then blames the service, not the visitor's address.
    await page.click('#compute-btn');
    await expect(page.locator('#error-text')).toHaveText(/indisponible/i);
    await expect(page.locator('#error-text')).not.toHaveText(/liste des suggestions/i);
    await expect(page.locator('#state-error a[href^="tel:"]')).toBeVisible();
  });

  test('warns when the trip is longer than anything the dropdown offers', async ({ page }) => {
    await mockOrs(page, { km: 312.7, min: 190 });
    await page.goto('/fr/tarifs/');

    await chooseAddress(page, '#dest', 'Quelque part très loin');
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

    await chooseAddress(page, '#dest', 'Leuven');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#long-distance-note')).toBeHidden();
  });

  test('refuses to price an airport however the visitor got there', async ({ page }) => {
    // No dropdown entry carries the `tbc` flag any more, so a typed airport
    // address has to be recognised from its coordinate (CDC §11.4).
    const liege = DESTINATIONS.find((d) => d.id === 'lgg');
    await mockOrs(page, {
      km: liege.km,
      min: liege.min,
      pointFor: () => ({ lat: liege.lat, lon: liege.lon }),
    });
    await page.goto('/fr/tarifs/');

    await chooseAddress(page, '#dest', 'Aéroport de Liège');
    await page.click('#compute-btn');
    await expect(page.locator('#state-result')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('#price-label')).toHaveText(/confirmer/i);
    await expect(page.locator('#tbc-note')).toBeVisible();
    await expect(page.locator('#breakdown')).toBeHidden();
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
      await chooseAddress(page, '#dest', 'Leuven');

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
