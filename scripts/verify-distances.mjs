// Mesure les distances réelles des destinations de src/data/destinations.js.
//
// A relancer si on ajoute ou modifie une destination. Le site ne s'en sert
// plus pour calculer un prix (les deux champs d'adresse sont libres), mais
// ces données alimentent les pages aéroport, la liste de la page d'accueil
// et la reconnaissance des aéroports.
//
//   node scripts/verify-distances.mjs                  # compare seulement
//   node scripts/verify-distances.mjs --ors --write    # met à jour le fichier
//   node scripts/verify-distances.mjs --json           # sortie machine
//
// --write exige --ors : les distances stockées doivent venir du même routeur
// que celui interrogé par le site.
//
// La recherche d'adresses passe par Nominatim, limité à une requête par
// seconde. C'est un script de maintenance, pas quelque chose à lancer en
// boucle.
import { readFileSync, writeFileSync } from 'node:fs';
import { DESTINATIONS } from '../src/data/destinations.js';

import { decodePolyline } from './polyline.js';

// Le dernier point d'un itinéraire = là où le routeur a posé la destination.
function endOf(encoded) {
  const points = encoded ? decodePolyline(encoded) : [];
  if (points.length === 0) return null;
  const [lat, lon] = points[points.length - 1];
  return { lat, lon };
}

const USE_ORS = process.argv.includes('--ors');
const AS_JSON = process.argv.includes('--json');
const WRITE = process.argv.includes('--write');

if (WRITE && !USE_ORS) {
  console.error(
    '--write exige --ors : les distances stockées doivent venir du même\n' +
      'routeur que celui interrogé par le site.'
  );
  process.exit(1);
}
const UA = 'taxi-qissi-maintenance/1.0 (distance verification)';

// Le point de référence : l'adresse de départ pré-remplie du simulateur.
const ORIGIN_QUERY = 'Grote Markt, Tienen, Belgium';

// Les requêtes envoyées au géocodeur : les libellés affichés sur le site
// sont trop ambigus pour lui.
const QUERIES = {
  zav: 'Brussels Airport, Zaventem, Belgium',
  cri: 'Brussels South Charleroi Airport, Belgium',
  // Le centre d'un aéroport tombe sur une piste, où aucune route n'existe :
  // on vise le terminal ou la route d'accès.
  lgg: 'Liege Airport terminal, Belgium',
  maa: 'Maastricht Aachen Airport, Netherlands',
  ein: 'Luchthavenweg, Eindhoven, Netherlands',
  bru: 'Grote Markt, Brussels, Belgium',
  leu: 'Grote Markt, Leuven, Belgium',
  has: 'Grote Markt, Hasselt, Belgium',
  stt: 'Grote Markt, Sint-Truiden, Belgium',
  jod: 'Jodoigne, Belgium',
  aar: 'Grote Markt, Aarschot, Belgium',
  wav: 'Wavre, Belgium',
  nam: 'Namur, Belgium',
  sta: 'Station Tienen, Tienen, Belgium',
  // Le nom de l'hôpital ne donne aucun résultat ; son adresse si.
  hos: 'Kliniekstraat 45, Tienen, Belgium',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function orsKey() {
  // PUBLIC_ORS_API_KEY is the legacy name, still accepted — see astro.config.mjs.
  if (process.env.ORS_API_KEY) return process.env.ORS_API_KEY;
  if (process.env.PUBLIC_ORS_API_KEY) return process.env.PUBLIC_ORS_API_KEY;
  try {
    const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    return (
      env.match(/^ORS_API_KEY=(.+)$/m)?.[1]?.trim() ||
      env.match(/^PUBLIC_ORS_API_KEY=(.+)$/m)?.[1]?.trim() ||
      ''
    );
  } catch {
    return '';
  }
}

async function geocode(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for "${query}"`);
  const [hit] = await res.json();
  if (!hit) throw new Error(`No geocoding result for "${query}"`);
  return { lat: Number(hit.lat), lon: Number(hit.lon), label: hit.display_name };
}

async function routeOsrm(from, to) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('OSRM returned no route');
  return { km: route.distance / 1000, min: route.duration / 60 };
}

async function routeOrs(from, to, key) {
  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: [
        [from.lon, from.lat],
        [to.lon, to.lat],
      ],
    }),
  });
  if (!res.ok) throw new Error(`ORS ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route?.summary) throw new Error('ORS returned no route');
  // `geometry` is an encoded polyline that comes with the response we already
  // pay for; storing it lets the map draw the real route with no runtime call.
  return { km: route.summary.distance / 1000, min: route.summary.duration / 60, geometry: route.geometry ?? '' };
}

const key = USE_ORS ? orsKey() : '';
if (USE_ORS && !key) {
  console.error('--ors needs PUBLIC_ORS_API_KEY in the environment or in .env');
  process.exit(1);
}

const origin = await geocode(ORIGIN_QUERY);
if (!AS_JSON) {
  console.log(`Origin : ${ORIGIN_QUERY}  ->  ${origin.lat.toFixed(5)}, ${origin.lon.toFixed(5)}`);
  console.log(`Router : ${USE_ORS ? 'OpenRouteService' : 'OSRM public demo'}\n`);
  console.log('id   destination                      current   measured   delta');
  console.log('---- -------------------------------- --------- ---------- ---------');
}

const rows = [];
for (const dest of DESTINATIONS) {
  await sleep(1100); // Nominatim : une requête par seconde maximum
  try {
    const target = await geocode(QUERIES[dest.id]);
    const route = USE_ORS ? await routeOrs(origin, target, key) : await routeOsrm(origin, target);
    const km = Math.round(route.km * 10) / 10;
    const min = Math.round(route.min);
    const delta = Math.round((km - dest.km) * 10) / 10;
    rows.push({
      id: dest.id, name: dest.nl, currentKm: dest.km, currentMin: dest.min,
      km, min, delta, geometry: route.geometry ?? '', target: { lat: target.lat, lon: target.lon },
    });
    if (!AS_JSON) {
      const pct = dest.km ? Math.round((delta / dest.km) * 100) : 0;
      console.log(
        `${dest.id.padEnd(4)} ${dest.nl.slice(0, 32).padEnd(32)} ` +
          `${String(dest.km).padStart(6)} km ${String(km).padStart(7)} km ` +
          `${(delta > 0 ? '+' : '') + delta} km (${pct > 0 ? '+' : ''}${pct}%)`
      );
    }
  } catch (err) {
    rows.push({ id: dest.id, error: String(err.message) });
    if (!AS_JSON) console.log(`${dest.id.padEnd(4)} ${dest.nl.padEnd(32)} ERROR: ${err.message}`);
  }
}

if (AS_JSON) console.log(JSON.stringify(rows, null, 2));

if (WRITE) {
  const failed = rows.filter((r) => r.error);
  if (failed.length) {
    console.error(`\nRefusing to write: ${failed.length} destination(s) could not be measured.`);
    process.exit(1);
  }

  const path = new URL('../src/data/destinations.js', import.meta.url);
  let source = readFileSync(path, 'utf8');

  for (const row of rows) {
    const pattern = new RegExp(
      String.raw`(\{ id: '${row.id}', km: )[\d.]+(, min: )\d+(, lat: [-\d.]+, lon: [-\d.]+)?`
    );
    if (!pattern.test(source)) {
      console.error(`Refusing to write: could not locate the entry for "${row.id}".`);
      process.exit(1);
    }
    // The stored coordinate is the route's own end point rather than the
    // geocoded address: it is already snapped to the road network, and taking
    // it from the geometry we just measured means the two cannot drift apart.
    const end = endOf(row.geometry) ?? row.target;
    const coords = `, lat: ${end.lat.toFixed(6)}, lon: ${end.lon.toFixed(6)}`;
    source = source.replace(pattern, `$1${row.km}$2${row.min}${coords}`);
  }

  const stamp = `// Distances verified against OpenRouteService on ${new Date().toISOString().slice(0, 10)}\n// via scripts/verify-distances.mjs, measured from ${ORIGIN_QUERY}.\n`;
  source = source.replace(/^\/\/ Distances verified[^\n]*\n\/\/[^\n]*\n/m, '');
  source = source.replace(/^export const DESTINATIONS/m, `${stamp}export const DESTINATIONS`);

  writeFileSync(path, source);
  console.log(`\nUpdated src/data/destinations.js with ${rows.length} measured distances.`);

  // The route geometry rides along in the response we already pay for, so
  // storing it lets the map draw the real route for a preset destination
  // without spending a request per estimate.
  const withGeometry = rows.filter((row) => row.geometry);
  const entries = withGeometry
    .map((row) => `  ${row.id}: ${JSON.stringify(row.geometry)},`)
    .join('\n');
  const generated = [
    `// Generated by scripts/verify-distances.mjs on ${new Date().toISOString().slice(0, 10)} — do not edit by hand.`,
    '//',
    '// Encoded polylines (precision 5) for each preset destination, measured',
    `// from ${ORIGIN_QUERY} with OpenRouteService. They ship with the rates page`,
    '// so the map can draw the real route with no runtime API call; the "other',
    '// address" option gets its geometry from the live lookup instead.',
    '// Decode with scripts/polyline.js.',
    '',
    `export const ORIGIN = { lat: ${origin.lat}, lon: ${origin.lon} };`,
    '',
    'export const ROUTE_GEOMETRIES = {',
    entries,
    '};',
    '',
  ].join('\n');

  const geometryPath = new URL('../scripts/route-geometries.js', import.meta.url);
  writeFileSync(geometryPath, generated);
  console.log(
    `Wrote scripts/route-geometries.js (${withGeometry.length} routes, ` +
      `${Math.round(generated.length / 1024)} KB).`
  );
  console.log('Review the diff, then re-run the tests: the fare tests assert specific totals.');
}
