import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The "other address" branch of the simulator talks to OpenRouteService.
// No API key is configured yet, so these tests pin the request shape and the
// response parsing against realistic ORS payloads — that is what would break
// silently if the provider changed, or if we misread their schema.
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

  it('biases the search to Belgium and authenticates', async () => {
    const fetchMock = mockFetch(okJson({ features: [] }));
    await autocompleteAddress('Bondgenotenlaan');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url.toString()).toContain('/geocode/autocomplete');
    expect(url.searchParams.get('boundary.country')).toBe('BE');
    expect(url.searchParams.get('text')).toBe('Bondgenotenlaan');
    expect(init.headers.Authorization).toBe(ORS_KEY);
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
    expect(await autocompleteAddress('zzzzzz')).toEqual([]);
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

  it('converts an ORS directions summary to kilometres and minutes', async () => {
    mockFetch(okJson({ routes: [{ summary: { distance: 20450.7, duration: 1512 } }] }));
    expect(await routeDistance(from, to)).toEqual({ km: 20.4507, min: 25 });
  });

  it('posts the coordinates in ORS order (lon, lat)', async () => {
    const fetchMock = mockFetch(okJson({ routes: [{ summary: { distance: 1000, duration: 120 } }] }));
    await routeDistance(from, to);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/v2/directions/driving-car');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(ORS_KEY);
    expect(JSON.parse(init.body)).toEqual({
      coordinates: [
        [4.9403, 50.8064],
        [4.7005, 50.8798],
      ],
    });
  });

  it('treats an unroutable pair as "not found", not as a zero-distance ride', async () => {
    mockFetch({ ok: false, status: 404, json: async () => ({}) });
    await expect(routeDistance(from, to)).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('rejects a response with no usable summary instead of pricing 0 km', async () => {
    mockFetch(okJson({ routes: [] }));
    await expect(routeDistance(from, to)).rejects.toMatchObject({ kind: 'not_found' });

    mockFetch(okJson({ routes: [{ summary: {} }] }));
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
