// Verifies the fixed distances in src/data/destinations.js against real road
// routing, and prints a comparison table.
//
// The values shipped with the prototype were design estimates, but the brief
// (§5.1) requires real road distance — so they need checking, and re-checking
// whenever the destination list changes.
//
//   node scripts/verify-distances.mjs                  # OSRM public demo, no key
//   node scripts/verify-distances.mjs --ors            # OpenRouteService (needs a key)
//   node scripts/verify-distances.mjs --ors --write    # ...and update destinations.js
//   node scripts/verify-distances.mjs --json           # machine-readable output
//
// With --ors it reads PUBLIC_ORS_API_KEY from the environment or .env, so the
// numbers come from the very provider the site queries at runtime. That
// matters: the dropdown's fixed distances and the live "other address"
// lookup must agree, or the same destination gets two different prices.
// --write is therefore only allowed together with --ors.
//
// Geocoding uses Nominatim, rate-limited to one request per second per their
// usage policy. Be a good citizen: this is a one-off maintenance script, not
// something to run in CI.
import { readFileSync, writeFileSync } from 'node:fs';
import { DESTINATIONS } from '../src/data/destinations.js';

const USE_ORS = process.argv.includes('--ors');
const AS_JSON = process.argv.includes('--json');
const WRITE = process.argv.includes('--write');

if (WRITE && !USE_ORS) {
  console.error(
    '--write requires --ors: the stored distances must come from the same\n' +
      'router the site queries at runtime, otherwise the dropdown and the\n' +
      '"other address" lookup would disagree on the same destination.'
  );
  process.exit(1);
}
const UA = 'taxi-qissi-maintenance/1.0 (distance verification)';

// The reference pickup point: what the simulator pre-fills as the departure
// address, and therefore what the fixed distances should be measured from.
const ORIGIN_QUERY = 'Grote Markt, Tienen, Belgium';

// Explicit geocoding queries — the display labels are too ambiguous for a
// geocoder ("Station Tienen", "Ander adres…").
const QUERIES = {
  zav: 'Brussels Airport, Zaventem, Belgium',
  cri: 'Brussels South Charleroi Airport, Belgium',
  // Airport centroids land on a runway, where ORS finds no routable road —
  // aim at the terminal / access road instead.
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
  // The hospital's name yields no Nominatim hit; its street address does.
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
  const summary = data.routes?.[0]?.summary;
  if (!summary) throw new Error('ORS returned no route');
  return { km: summary.distance / 1000, min: summary.duration / 60 };
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
  if (dest.id === 'other') continue;
  await sleep(1100); // Nominatim: max 1 request/second
  try {
    const target = await geocode(QUERIES[dest.id]);
    const route = USE_ORS ? await routeOrs(origin, target, key) : await routeOsrm(origin, target);
    const km = Math.round(route.km * 10) / 10;
    const min = Math.round(route.min);
    const delta = Math.round((km - dest.km) * 10) / 10;
    rows.push({ id: dest.id, name: dest.nl, currentKm: dest.km, currentMin: dest.min, km, min, delta });
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
    const pattern = new RegExp(`(\\{ id: '${row.id}', km: )[\\d.]+(, min: )\\d+`);
    if (!pattern.test(source)) {
      console.error(`Refusing to write: could not locate the entry for "${row.id}".`);
      process.exit(1);
    }
    source = source.replace(pattern, `$1${row.km}$2${row.min}`);
  }

  const stamp = `// Distances verified against OpenRouteService on ${new Date().toISOString().slice(0, 10)}\n// via scripts/verify-distances.mjs, measured from ${ORIGIN_QUERY}.\n`;
  source = source.replace(/^\/\/ Distances verified[^\n]*\n\/\/[^\n]*\n/m, '');
  source = source.replace(/^export const DESTINATIONS/m, `${stamp}export const DESTINATIONS`);

  writeFileSync(path, source);
  console.log(`\nUpdated src/data/destinations.js with ${rows.length} measured distances.`);
  console.log('Review the diff, then re-run the tests: the fare tests assert specific totals.');
}
