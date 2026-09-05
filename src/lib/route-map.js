// Maps: the route on the simulator's result card, and the service area on
// the contact page.
//
// Loaded on demand — brief §7 requires the map to be deferred and never to
// block the initial render, so nothing here (Leaflet, its CSS, the tiles) is
// fetched until a visitor computes an estimate or scrolls the contact map
// into view. Everything is wrapped so a failure
// degrades to "no map" instead of taking the price and the call button down
// with it (brief §5.3).
//
// Tiles are the only third-party request the site makes; they are disclosed
// in the privacy policy. The provider is configurable so it can be swapped
// for a paid/self-hosted one without touching this logic.
// `?url` keeps Vite from hoisting Leaflet's stylesheet into every page's
// <head> as a render-blocking link; we attach it ourselves, on first use.
import leafletCssUrl from 'leaflet/dist/leaflet.css?url';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const ACCENT = '#0369a1';

let leafletPromise;
let mapInstance;
let routeLayer;

function loadStylesheet(href) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[data-leaflet-css]`)) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.leafletCss = '';
    // Resolve either way: a missing stylesheet degrades the map's looks,
    // it should not stop the route from being drawn.
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', () => resolve());
    document.head.appendChild(link);
  });
}

async function loadLeaflet() {
  if (!leafletPromise) {
    leafletPromise = Promise.all([import('leaflet'), loadStylesheet(leafletCssUrl)]).then(
      ([mod]) => mod.default ?? mod
    );
  }
  return leafletPromise;
}

/**
 * Draws a route on the map, creating it on first use.
 *
 * @param {HTMLElement} container
 * @param {Array<[number, number]>} points [lat, lon] pairs
 * @param {string} label accessible description of the route
 * @returns {Promise<boolean>} false when the map could not be shown
 */
export async function showRoute(container, points, label) {
  if (!container || !Array.isArray(points) || points.length < 2) return false;

  try {
    const L = await loadLeaflet();

    if (!mapInstance) {
      mapInstance = L.map(container, {
        zoomControl: true,
        scrollWheelZoom: false, // never hijack the page scroll on mobile
        attributionControl: true,
      });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(mapInstance);
    }

    if (routeLayer) routeLayer.remove();
    routeLayer = L.layerGroup([
      L.polyline(points, { color: '#0369a1', weight: 5, opacity: 0.9 }),
      L.circleMarker(points[0], { radius: 7, color: '#0369a1', weight: 4, fillColor: '#fff', fillOpacity: 1 }),
      L.circleMarker(points[points.length - 1], { radius: 7, color: '#0369a1', weight: 4, fillColor: '#0369a1', fillOpacity: 1 }),
    ]).addTo(mapInstance);

    mapInstance.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
    // The container is only sized once it is visible, so Leaflet has to
    // re-measure after the result card is revealed.
    mapInstance.invalidateSize();

    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', label);
    return true;
  } catch {
    return false;
  }
}

/**
 * Draws the served area on the contact page: the radius the business covers,
 * centred on Tienen. Replaces the prototype's dashed-circle illustration
 * with the same shape drawn to scale on a real map.
 *
 * Deliberately no address pin: the caption describes a zone, and the stored
 * centre is the town, not the office door — a marker would claim a precision
 * we do not have.
 *
 * @param {HTMLElement} container
 * @param {{ lat: number, lon: number }} centre
 * @param {number} radiusMeters
 * @param {string} label accessible description
 * @returns {Promise<boolean>} false when the map could not be shown
 */
export async function showServiceArea(container, centre, radiusMeters, label) {
  if (!container || !centre) return false;

  try {
    const L = await loadLeaflet();
    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    // A view has to be set before layers are added: until then Leaflet holds
    // them back, and a circle with no map cannot report its bounds. The zoom
    // is a starting point only — fitBounds() below settles the framing.
    map.setView([centre.lat, centre.lon], 9);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(map);

    const area = L.circle([centre.lat, centre.lon], {
      radius: radiusMeters,
      color: ACCENT,
      weight: 2,
      dashArray: '5 5',
      fillColor: ACCENT,
      fillOpacity: 0.08,
    }).addTo(map);
    L.circleMarker([centre.lat, centre.lon], {
      radius: 8,
      color: ACCENT,
      weight: 2,
      fillColor: ACCENT,
      fillOpacity: 1,
    }).addTo(map);

    map.fitBounds(area.getBounds(), { padding: [12, 12] });
    map.invalidateSize();

    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', label);
    return true;
  } catch {
    return false;
  }
}

// A routePoints() helper used to live here, picking between the live route
// and a stored polyline for a dropdown destination. With both address fields
// free text (2026-09-05) every estimate is measured live and carries its own
// geometry, so there is nothing left to choose between. The stored
// geometries in src/data/route-geometries.js are no longer shipped to the
// browser; they remain as the provenance of each destination's coordinate
// and are regenerated by scripts/verify-distances.mjs.
