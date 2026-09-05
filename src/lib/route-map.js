// Route map for the simulator's result card.
//
// Loaded on demand — brief §7 requires the map to be deferred and never to
// block the initial render, so nothing here (Leaflet, its CSS, the stored
// geometries, the tiles) is fetched until a visitor actually computes an
// estimate. Everything is wrapped so a failure degrades to "no map" instead
// of taking the price and the call button down with it (brief §5.3).
//
// Tiles are the only third-party request the site makes; they are disclosed
// in the privacy policy. The provider is configurable so it can be swapped
// for a paid/self-hosted one without touching this logic.
import { decodePolyline } from './polyline.js';
// `?url` keeps Vite from hoisting Leaflet's stylesheet into every page's
// <head> as a render-blocking link; we attach it ourselves, on first use.
import leafletCssUrl from 'leaflet/dist/leaflet.css?url';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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
 * Resolves the route shape for a chosen destination.
 *
 * The two sources differ by necessity: the live lookup returns GeoJSON
 * coordinates (already decoded), while the preset destinations ship as
 * encoded polylines, which are six times smaller to store.
 *
 * @param {string} destId
 * @param {Array<[number, number]>|null} livePoints from routeDistance(), if any
 * @returns {Promise<Array<[number, number]>>} [lat, lon] pairs
 */
export async function routePoints(destId, livePoints) {
  if (Array.isArray(livePoints) && livePoints.length >= 2) return livePoints;
  try {
    const { ROUTE_GEOMETRIES } = await import('../data/route-geometries.js');
    return decodePolyline(ROUTE_GEOMETRIES[destId] ?? '');
  } catch {
    return [];
  }
}
