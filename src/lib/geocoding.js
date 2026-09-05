// OpenRouteService client — geocoding (address autocomplete) + routing (real
// road distance). Chosen per brief_dev_taxi_qiss.md §5.4: free tier, no card
// required, no self-hosted infra to maintain in V1. Swappable later — every
// call to a mapping provider is isolated in this file.
//
// This runs entirely in the browser (brief §1.1). The API key below is
// necessarily exposed in shipped code; it MUST be given a capped daily quota
// in the OpenRouteService dashboard before go-live (brief §5.4 warning 1).
// Addresses typed by visitors are sent to OpenRouteService's servers — this
// is disclosed in the privacy policy (brief §5.4 warning 2).
//
// Both calls are plain GETs carrying the key as a query parameter, and that
// is not a stylistic choice: OpenRouteService's CORS preflight rejects the
// Authorization header ("Request header field authorization is not allowed
// by Access-Control-Allow-Headers"), so the header form — which their docs
// show for server-side use — can never work from a page. GET with api_key
// also avoids a preflight entirely. Verified: both endpoints answer 200 with
// Access-Control-Allow-Origin: *.

const ORS_BASE_URL = 'https://api.openrouteservice.org';

export class MapServiceError extends Error {
  /** @param {string} message @param {'not_found'|'network'|'config'} kind */
  constructor(message, kind) {
    super(message);
    this.name = 'MapServiceError';
    this.kind = kind;
  }
}

// __ORS_API_KEY__ is injected at build time from ORS_API_KEY (or the legacy
// PUBLIC_ORS_API_KEY) — see astro.config.mjs for why it is not read straight
// from import.meta.env. The typeof guard keeps the module loadable anywhere
// the define is absent; import.meta.env stays as the fallback.
function getApiKey() {
  const injected = typeof __ORS_API_KEY__ === 'string' ? __ORS_API_KEY__ : '';
  const key = injected || import.meta.env.PUBLIC_ORS_API_KEY;
  if (!key) {
    throw new MapServiceError(
      'No routing API key configured — set ORS_API_KEY (see .env.example)',
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

// Belgium plus its neighbours, rather than Belgium alone: the dropdown
// already offers Maastricht and Eindhoven, so a visitor who types a Dutch
// address must be able to find it too. `focus.point` keeps local results on
// top — a search for "Grote Markt" still ranks Tienen before Rotterdam.
const SEARCH_COUNTRIES = 'BE,NL,FR,DE,LU';

/**
 * Address autocomplete, biased to the area around Tienen.
 * @param {string} query
 * @param {{ lat: number, lon: number }} [focus] point to rank results around
 * @returns {Promise<Array<{ label: string, lon: number, lat: number }>>}
 */
export async function autocompleteAddress(query, focus) {
  const text = (query ?? '').trim();
  if (text.length < 3) return [];

  const cacheKey = text.toLowerCase();
  if (suggestionCache.has(cacheKey)) return suggestionCache.get(cacheKey);

  const url = new URL(`${ORS_BASE_URL}/geocode/autocomplete`);
  url.searchParams.set('api_key', getApiKey());
  url.searchParams.set('text', text);
  url.searchParams.set('boundary.country', SEARCH_COUNTRIES);
  if (focus) {
    url.searchParams.set('focus.point.lat', String(focus.lat));
    url.searchParams.set('focus.point.lon', String(focus.lon));
  }
  url.searchParams.set('size', '5');

  let response;
  try {
    response = await fetch(url);
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
 * Real road distance + duration between two points, plus the route shape.
 *
 * Uses the GET/GeoJSON form of the directions endpoint: the POST form needs
 * a JSON content type, which triggers a CORS preflight that this API does
 * not satisfy from a browser. The route shape comes back in the same
 * response, so the map costs no extra request.
 *
 * @param {{ lon: number, lat: number }} from
 * @param {{ lon: number, lat: number }} to
 * @returns {Promise<{ km: number, min: number, points: Array<[number, number]> }>}
 *          points are [lat, lon] pairs, ready for the map
 */
export async function routeDistance(from, to) {
  const url = new URL(`${ORS_BASE_URL}/v2/directions/driving-car`);
  url.searchParams.set('api_key', getApiKey());
  url.searchParams.set('start', `${from.lon},${from.lat}`);
  url.searchParams.set('end', `${to.lon},${to.lat}`);

  let response;
  try {
    response = await fetch(url);
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
  const feature = data.features?.[0];
  const summary = feature?.properties?.summary;
  if (typeof summary?.distance !== 'number') {
    throw new MapServiceError('Routing service returned no usable route', 'not_found');
  }

  // GeoJSON stores [lon, lat]; the map wants [lat, lon].
  const coordinates = Array.isArray(feature.geometry?.coordinates) ? feature.geometry.coordinates : [];
  return {
    km: summary.distance / 1000,
    min: Math.round(summary.duration / 60),
    points: coordinates.map(([lon, lat]) => [lat, lon]),
  };
}
