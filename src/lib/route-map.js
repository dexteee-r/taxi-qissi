// Les deux cartes du site : l'itinéraire sur le reçu du simulateur, et la
// zone desservie sur la page Contact.
//
// Rien ici n'est chargé au démarrage — ni Leaflet, ni sa feuille de style,
// ni les tuiles. Tout arrive au moment où une carte doit vraiment
// s'afficher, pour ne pas ralentir l'ouverture des pages.
//
// Chaque fonction est protégée : si la carte échoue, elle disparaît, mais le
// prix et le bouton d'appel continuent de fonctionner.
//
// Les tuiles sont la seule requête vers un tiers que fait le site ; c'est
// déclaré dans la politique de confidentialité. Le fournisseur est la
// constante TILE_URL ci-dessous.

// Le `?url` empêche d'ajouter la feuille de style de Leaflet dans le <head>
// de toutes les pages : on la charge nous-mêmes, à la première carte.
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
    // On continue dans tous les cas : une feuille de style manquante enlaidit
    // la carte, elle ne doit pas empêcher de dessiner l'itinéraire.
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
 * Dessine un itinéraire, en créant la carte au premier appel.
 *
 * @param {HTMLElement} container l'élément qui accueille la carte
 * @param {Array<[number, number]>} points les points [lat, lon] du trajet
 * @param {string} label description lue par les lecteurs d'écran
 * @returns {Promise<boolean>} faux si la carte n'a pas pu s'afficher
 */
export async function showRoute(container, points, label) {
  if (!container || !Array.isArray(points) || points.length < 2) return false;

  try {
    const L = await loadLeaflet();

    if (!mapInstance) {
      mapInstance = L.map(container, {
        zoomControl: true,
        scrollWheelZoom: false, // ne jamais capturer le défilement de la page
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
    // Le conteneur n'a de taille qu'une fois visible : Leaflet doit
    // remesurer après l'affichage du reçu.
    mapInstance.invalidateSize();

    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', label);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dessine la zone desservie sur la page Contact : un cercle à l'échelle
 * autour de Tienen.
 *
 * Volontairement sans épingle d'adresse : la légende décrit une zone, et le
 * point mémorisé est la ville, pas la porte du bureau.
 *
 * @param {HTMLElement} container l'élément qui accueille la carte
 * @param {{ lat: number, lon: number }} centre centre du cercle
 * @param {number} radiusMeters rayon en mètres
 * @param {string} label description lue par les lecteurs d'écran
 * @returns {Promise<boolean>} faux si la carte n'a pas pu s'afficher
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
    // PIEGE : il faut définir une vue AVANT d'ajouter des couches. Tant que
    // la carte n'a pas de vue, Leaflet met les couches en attente, et un
    // cercle sans carte ne sait pas donner ses limites — le fitBounds() plus
    // bas lèverait alors une exception. Le zoom 9 n'est qu'un point de
    // départ, le cadrage définitif vient de fitBounds().
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

// Note : le tracé vient toujours de l'itinéraire qu'on vient de mesurer.
// Il n'y a plus de tracé pré-calculé côté site depuis que les deux champs
// d'adresse sont libres.
