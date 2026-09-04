// OpenRouteService client — geocoding (address autocomplete) + routing (real
// road distance). Chosen per brief_dev_taxi_qiss.md §5.4: free tier, no card
// required, no self-hosted infra to maintain in V1. Swappable later — every
// call to a mapping provider is isolated in this file.
//
// This runs entirely in the browser (brief §1.1). The API key below is
// necessarily exposed in shipped code; it MUST be restricted by HTTP referrer
// and given a capped daily quota in the OpenRouteService dashboard before
// go-live (brief §5.4 warning 1). Addresses typed by visitors are sent to
// OpenRouteService's servers — this must be disclosed in the privacy policy
// (brief §5.4 warning 2).

const ORS_BASE_URL = 'https://api.openrouteservice.org';

export class MapServiceError extends Error {
  /** @param {string} message @param {'not_found'|'network'|'config'} kind */
  constructor(message, kind) {
    super(message);
    this.name = 'MapServiceError';
    this.kind = kind;
  }
}

function getApiKey() {
  const key = import.meta.env.PUBLIC_ORS_API_KEY;
  if (!key) {
    throw new MapServiceError(
      'PUBLIC_ORS_API_KEY is not configured — see .env.example',
      'config'
    );
  }
  return key;
}

// The key ships in the browser bundle by necessity (brief §1.1 forbids a
// server-side proxy), so the daily quota is the only thing standing between
// us and someone else's traffic. Every request we don't make is quota kept
// for real visitors — hence this per-session cache: typing, backspacing and
// retyping the same address costs one request, not one per keystroke.
const suggestionCache = new Map();
const MAX_CACHED_QUERIES = 50;

/**
 * Address autocomplete, biased to Belgium.
 * @param {string} query
 * @returns {Promise<Array<{ label: string, lon: number, lat: number }>>}
 */
export async function autocompleteAddress(query) {
  const text = (query ?? '').trim();
  if (text.length < 3) return [];

  const cacheKey = text.toLowerCase();
  if (suggestionCache.has(cacheKey)) return suggestionCache.get(cacheKey);

  const apiKey = getApiKey();
  const url = new URL(`${ORS_BASE_URL}/geocode/autocomplete`);
  url.searchParams.set('text', text);
  url.searchParams.set('boundary.country', 'BE');
  url.searchParams.set('size', '5');

  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: apiKey },
    });
  } catch {
    throw new MapServiceError('Network error while fetching address suggestions', 'network');
  }

  if (!response.ok) {
    throw new MapServiceError(`Geocoding service returned ${response.status}`, 'network');
  }

  const data = await response.json();
  const results = (data.features ?? []).map((feature) => ({
    label: feature.properties.label,
    lon: feature.geometry.coordinates[0],
    lat: feature.geometry.coordinates[1],
  }));

  // Only successful lookups are cached: a failure must be retryable.
  if (suggestionCache.size >= MAX_CACHED_QUERIES) {
    suggestionCache.delete(suggestionCache.keys().next().value);
  }
  suggestionCache.set(cacheKey, results);
  return results;
}

/**
 * Real road distance + duration between two points.
 * @param {{ lon: number, lat: number }} from
 * @param {{ lon: number, lat: number }} to
 * @returns {Promise<{ km: number, min: number }>}
 */
export async function routeDistance(from, to) {
  const apiKey = getApiKey();
  const url = `${ORS_BASE_URL}/v2/directions/driving-car`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [from.lon, from.lat],
          [to.lon, to.lat],
        ],
      }),
    });
  } catch {
    throw new MapServiceError('Network error while calculating the route', 'network');
  }

  if (response.status === 404) {
    throw new MapServiceError('No route found between these addresses', 'not_found');
  }
  if (!response.ok) {
    throw new MapServiceError(`Routing service returned ${response.status}`, 'network');
  }

  const data = await response.json();
  const summary = data.routes?.[0]?.summary;
  if (typeof summary?.distance !== 'number') {
    throw new MapServiceError('Routing service returned no usable route', 'not_found');
  }
  return { km: summary.distance / 1000, min: Math.round(summary.duration / 60) };
}
