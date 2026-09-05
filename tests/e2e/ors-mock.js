// Shared OpenRouteService stand-in for the E2E suite.
//
// Both address fields are free text now, so every estimate goes through the
// API — there is no dropdown left that produces a price offline. Tests
// therefore mock it: they assert our behaviour, not the provider's, they
// stay deterministic, and the real key keeps its daily quota for visitors.
import { expect } from '@playwright/test';

// Where the default pickup address sits, and a destination far from any
// airport so the "to be confirmed" rule does not fire by accident.
export const TIENEN = { lat: 50.8075398, lon: 4.9371503 };
export const LEUVEN = { lat: 50.8798, lon: 4.7005 };

// A polyline with enough bends to be recognisably a road rather than the
// straight line the brief forbids.
function fakeRoad(from, to, steps = 24) {
  return Array.from({ length: steps }, (_, i) => {
    const ratio = i / (steps - 1);
    const wobble = Math.sin(ratio * Math.PI * 3) * 0.01;
    return [from.lat + (to.lat - from.lat) * ratio + wobble, from.lon + (to.lon - from.lon) * ratio];
  });
}

/**
 * Routes every OpenRouteService call to a local stub.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [options]
 * @param {number} [options.km] road distance the directions endpoint reports
 * @param {number} [options.min] duration in minutes
 * @param {(text: string) => {lat: number, lon: number}} [options.pointFor]
 *        coordinate to attach to a suggestion, from the typed text
 * @param {boolean} [options.noResults] make every address lookup come back empty
 * @returns {Promise<string[]>} the URLs requested so far, live
 */
export async function mockOrs(page, { km = 33.6, min = 30, pointFor, noResults = false } = {}) {
  const calls = [];
  const point = pointFor ?? (() => LEUVEN);

  await page.route('**://api.openrouteservice.org/**', (route) => {
    const url = new URL(route.request().url());
    calls.push(url.toString());

    if (url.pathname.includes('/geocode/')) {
      const text = url.searchParams.get('text') ?? '';
      const items = noResults ? [] : [suggestion(text, point(text)), suggestion(`${text} 2`, point(text))];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ features: items }),
      });
    }

    const [fromLon, fromLat] = (url.searchParams.get('start') ?? '0,0').split(',').map(Number);
    const [toLon, toLat] = (url.searchParams.get('end') ?? '0,0').split(',').map(Number);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            properties: { summary: { distance: km * 1000, duration: min * 60 } },
            geometry: {
              coordinates: fakeRoad({ lat: fromLat, lon: fromLon }, { lat: toLat, lon: toLon }).map(
                ([lat, lon]) => [lon, lat]
              ),
            },
          },
        ],
      }),
    });
  });

  return calls;
}

function suggestion(label, { lat, lon }) {
  return { properties: { label }, geometry: { coordinates: [lon, lat] } };
}

/**
 * Types into one of the two address fields and picks a suggestion — the only
 * way to give a field a usable value, by design.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'#from'|'#dest'} field
 * @param {string} text
 * @param {number} [index] which suggestion to take
 */
export async function chooseAddress(page, field, text, index = 0) {
  const listbox = field === '#from' ? '#from-listbox' : '#dest-listbox';
  await page.fill(field, text);
  const option = page.locator(`${listbox} li[role="option"]`).nth(index);
  await option.waitFor({ timeout: 5000 });
  await option.click();
  await expect(page.locator(field)).not.toHaveValue('');
}
