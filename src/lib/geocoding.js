// Tous les appels à OpenRouteService passent par ici : rechercher une
// adresse, et mesurer la distance réelle par la route. Pour changer de
// fournisseur de cartes, c'est le seul fichier à toucher.
//
// Deux pièges à connaître avant de modifier quoi que ce soit :
//
// 1. La clé passe en paramètre d'URL (`api_key`), jamais en en-tête
//    `Authorization`. Ce n'est pas un choix de style : OpenRouteService
//    refuse cet en-tête depuis un navigateur (erreur CORS). La forme
//    "en-tête" de leur documentation ne vaut que côté serveur.
//
// 2. La clé est forcément visible dans le code envoyé au navigateur : le
//    site n'a pas de serveur pour la cacher. La vraie protection est le
//    quota journalier, à plafonner sur le tableau de bord OpenRouteService.

const ORS_BASE_URL = 'https://api.openrouteservice.org';

export class MapServiceError extends Error {
  /** @param {string} message @param {'not_found'|'network'|'config'} kind */
  constructor(message, kind) {
    super(message);
    this.name = 'MapServiceError';
    this.kind = kind;
  }
}

// __ORS_API_KEY__ est remplacé par la vraie clé au moment du build (voir
// astro.config.mjs). Le `typeof` permet au fichier de rester utilisable là
// où ce remplacement n'a pas lieu, par exemple dans les tests.
function getApiKey() {
  const injected = typeof __ORS_API_KEY__ === 'string' ? __ORS_API_KEY__ : '';
  const key = injected || import.meta.env.PUBLIC_ORS_API_KEY;
  if (!key) {
    throw new MapServiceError(
      "Pas de clé OpenRouteService — définir ORS_API_KEY (voir .env.example)",
      'config'
    );
  }
  return key;
}

// Mémoire des recherches déjà faites pendant la visite : taper, effacer et
// retaper la même adresse coûte une requête, pas dix. Chaque requête évitée
// est du quota gardé pour les vrais visiteurs.
const suggestionCache = new Map();
const MAX_CACHED_QUERIES = 50;

// La Belgique et ses voisins : le site propose des transferts vers
// Maastricht et Eindhoven, il faut donc pouvoir taper une adresse
// néerlandaise. `focus.point` garde malgré tout les résultats proches de
// Tienen en tête de liste.
const SEARCH_COUNTRIES = 'BE,NL,FR,DE,LU';

/**
 * Cherche des adresses correspondant à un texte.
 *
 * @param {string} query texte tapé par le visiteur
 * @param {{ lat: number, lon: number }} [focus] point autour duquel classer
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

  // On ne mémorise que les recherches réussies : un échec doit pouvoir
  // être retenté.
  if (suggestionCache.size >= MAX_CACHED_QUERIES) {
    suggestionCache.delete(suggestionCache.keys().next().value);
  }
  suggestionCache.set(cacheKey, results);
  return results;
}

/**
 * Distance et durée réelles par la route entre deux points, plus le tracé.
 *
 * Le tracé arrive dans la même réponse : la carte ne coûte donc aucune
 * requête supplémentaire.
 *
 * @param {{ lon: number, lat: number }} from point de départ
 * @param {{ lon: number, lat: number }} to point d'arrivée
 * @returns {Promise<{ km: number, min: number, points: Array<[number, number]> }>}
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

  // Le format GeoJSON donne [lon, lat] ; la carte attend [lat, lon].
  const coordinates = Array.isArray(feature.geometry?.coordinates) ? feature.geometry.coordinates : [];
  return {
    km: summary.distance / 1000,
    min: Math.round(summary.duration / 60),
    points: coordinates.map(([lon, lat]) => [lat, lon]),
  };
}
