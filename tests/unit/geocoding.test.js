// Vérifie les appels à OpenRouteService (src/lib/geocoding.js) : la forme
// des requêtes et le comportement en cas de panne. Les réponses sont
// simulées — aucun appel réel n'est fait ici.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORS_KEY = 'test-key';

let autocompleteAddress, routeDistance, MapServiceError;

beforeEach(async () => {
  vi.stubEnv('PUBLIC_ORS_API_KEY', ORS_KEY);
  vi.resetModules();
  ({ autocompleteAddress, routeDistance, MapServiceError } = await import('../../src/lib/geocoding.js'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockFetch(response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

describe('address autocomplete', () => {
  it('maps an ORS geocoding response to label + coordinates', async () => {
    mockFetch(
      okJson({
        features: [
          {
            properties: { label: 'Grote Markt, Tienen, België' },
            geometry: { type: 'Point', coordinates: [4.9403, 50.8064] },
          },
          {
            properties: { label: 'Grote Markt, Leuven, België' },
            geometry: { type: 'Point', coordinates: [4.7005, 50.8798] },
          },
        ],
      })
    );

    const results = await autocompleteAddress('Grote Markt');
    expect(results).toEqual([
      { label: 'Grote Markt, Tienen, België', lon: 4.9403, lat: 50.8064 },
      { label: 'Grote Markt, Leuven, België', lon: 4.7005, lat: 50.8798 },
    ]);
  });

  it('searches Belgium and its neighbours, and authenticates via the query string', async () => {
    const fetchMock = mockFetch(okJson({ features: [] }));
    await autocompleteAddress('Bondgenotenlaan');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url.toString()).toContain('/geocode/autocomplete');
    // Belgium alone would make the Dutch airports in the dropdown
    // unreachable by typing an address.
    expect(url.searchParams.get('boundary.country')).toBe('BE,NL,FR,DE,LU');
    expect(url.searchParams.get('text')).toBe('Bondgenotenlaan');
    // The key must travel as a parameter: ORS's CORS preflight rejects an
    // Authorization header, so the header form cannot work from a browser.
    expect(url.searchParams.get('api_key')).toBe(ORS_KEY);
    expect(init).toBeUndefined();
  });

  it('ranks results around the given focus point when one is passed', async () => {
    const fetchMock = mockFetch(okJson({ features: [] }));
    await autocompleteAddress('Grote Markt straat', { lat: 50.8075398, lon: 4.9371503 });

    const [url] = fetchMock.mock.calls[0];
    expect(url.searchParams.get('focus.point.lat')).toBe('50.8075398');
    expect(url.searchParams.get('focus.point.lon')).toBe('4.9371503');
  });

  it('omits the focus point when none is given', async () => {
    const fetchMock = mockFetch(okJson({ features: [] }));
    await autocompleteAddress('Bondgenotenlaan 1');

    const [url] = fetchMock.mock.calls[0];
    expect(url.searchParams.has('focus.point.lat')).toBe(false);
  });

  it('does not call the API for queries shorter than 3 characters', async () => {
    const fetchMock = mockFetch(okJson({ features: [] }));
    expect(await autocompleteAddress('')).toEqual([]);
    expect(await autocompleteAddress('Ti')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tolerates an empty result set', async () => {
    mockFetch(okJson({ features: [] }));
    expect(await autocompleteAddress('zzzzzz')).toEqual([]);
    mockFetch(okJson({}));
    expect(await autocompleteAddress('yyyyyy')).toEqual([]);
  });

  // The key is public by design, so the daily quota is the only guard rail:
  // spending it on repeated lookups would deny service to real visitors.
  it('serves a repeated query from cache instead of calling the API again', async () => {
    const fetchMock = mockFetch(
      okJson({
        features: [{ properties: { label: 'Grote Markt, Tienen' }, geometry: { coordinates: [4.94, 50.8] } }],
      })
    );

    const first = await autocompleteAddress('Grote Markt Tienen');
    const second = await autocompleteAddress('Grote Markt Tienen');
    const cased = await autocompleteAddress('  grote markt tienen  ');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(cased).toEqual(first);
  });

  it('does not cache failures, so a retry can still succeed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(autocompleteAddress('Bondgenotenlaan')).rejects.toBeInstanceOf(MapServiceError);

    const fetchMock = mockFetch(
      okJson({
        features: [{ properties: { label: 'Bondgenotenlaan, Leuven' }, geometry: { coordinates: [4.7, 50.88] } }],
      })
    );
    const results = await autocompleteAddress('Bondgenotenlaan');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results[0].label).toBe('Bondgenotenlaan, Leuven');
  });

  it('reports a network failure rather than returning a wrong address', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(autocompleteAddress('Tienen')).rejects.toBeInstanceOf(MapServiceError);
  });

  it('reports rate limiting (HTTP 429) as a service error', async () => {
    mockFetch({ ok: false, status: 429, json: async () => ({}) });
    await expect(autocompleteAddress('Tienen')).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('route distance', () => {
  const from = { lon: 4.9403, lat: 50.8064 };
  const to = { lon: 4.7005, lat: 50.8798 };

  const geoJsonRoute = (summary, coordinates = []) =>
    okJson({ features: [{ properties: { summary }, geometry: { type: 'LineString', coordinates } }] });

  it('converts an ORS directions summary to kilometres and minutes', async () => {
    mockFetch(geoJsonRoute({ distance: 20450.7, duration: 1512 }));
    const route = await routeDistance(from, to);
    expect(route.km).toBeCloseTo(20.4507, 4);
    expect(route.min).toBe(25);
  });

  // The route shape arrives in the response we already pay for, so the map
  // draws the real route without a second request.
  it('returns the route shape as [lat, lon] pairs for the map', async () => {
    mockFetch(
      geoJsonRoute({ distance: 1000, duration: 120 }, [
        [4.9371, 50.8075],
        [4.8, 50.85],
      ])
    );
    const route = await routeDistance(from, to);
    // GeoJSON is [lon, lat]; the map needs them the other way round.
    expect(route.points).toEqual([
      [50.8075, 4.9371],
      [50.85, 4.8],
    ]);
  });

  it('yields an empty shape rather than crashing when geometry is missing', async () => {
    mockFetch(okJson({ features: [{ properties: { summary: { distance: 1000, duration: 120 } } }] }));
    expect((await routeDistance(from, to)).points).toEqual([]);
  });

  it('requests the route as a plain GET, coordinates in lon,lat order', async () => {
    const fetchMock = mockFetch(geoJsonRoute({ distance: 1000, duration: 120 }));
    await routeDistance(from, to);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url.toString()).toContain('/v2/directions/driving-car');
    // A JSON POST would trigger a CORS preflight this API does not satisfy.
    expect(init).toBeUndefined();
    expect(url.searchParams.get('api_key')).toBe(ORS_KEY);
    expect(url.searchParams.get('start')).toBe('4.9403,50.8064');
    expect(url.searchParams.get('end')).toBe('4.7005,50.8798');
  });

  it('treats an unroutable pair as "not found", not as a zero-distance ride', async () => {
    mockFetch({ ok: false, status: 404, json: async () => ({}) });
    await expect(routeDistance(from, to)).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('rejects a response with no usable summary instead of pricing 0 km', async () => {
    mockFetch(okJson({ features: [] }));
    await expect(routeDistance(from, to)).rejects.toMatchObject({ kind: 'not_found' });

    mockFetch(okJson({ features: [{ properties: {} }] }));
    await expect(routeDistance(from, to)).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('fails loudly when no API key is configured', async () => {
    vi.stubEnv('PUBLIC_ORS_API_KEY', '');
    vi.resetModules();
    const mod = await import('../../src/lib/geocoding.js');
    vi.stubGlobal('fetch', vi.fn());
    await expect(mod.routeDistance(from, to)).rejects.toMatchObject({ kind: 'config' });
  });
});
