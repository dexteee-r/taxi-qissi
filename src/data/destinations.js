// Preset destinations for the price simulator's dropdown, matching the
// validated Claude Design prototype (claude design template/TaxiDesktop.dc.html
// and TaxiScreen.dc.html).
//
// The distances the prototype shipped were design estimates and were wrong by
// -60% to +68% (Leuven was stored as 20 km and routes at 33.6 km). They are
// now measured with OpenRouteService — the same router the "other address"
// option queries at runtime, so both paths price a destination identically.
// Re-run `npm run verify:distances` after changing this list.
//
// Caveat worth raising with the driver: these are centre-to-centre routes,
// and a router optimises for time, not distance. Aiming at a town's central
// square rather than, say, its station adds several kilometres because of
// pedestrian zones (Leuven: 33.6 km to the Grote Markt vs 26 km to the
// station). Since the fare is per kilometre, the reference point moves the
// quoted price — the estimate stays explicitly indicative for that reason.
//
// Airports keep `tbc: true`: the CDC forbids showing an airport price until
// the client sets one, so their distance is measured but not displayed.
//
// `lat`/`lon` are where the router actually ends the trip (the last point of
// the stored route geometry, so they can never drift from the stored km).
// They exist because the departure address is no longer fixed: when a visitor
// picks their own pickup point, the distance has to be re-measured live, and
// that needs a destination coordinate even for a dropdown entry.
//
// "other" has no fixed km: the simulator falls back to a live address
// lookup via OpenRouteService for it (see src/lib/geocoding.js) rather than
// the prototype's original "always show error" behavior for that option —
// per the hybrid architecture the user asked for.

// Distances verified against OpenRouteService on 2026-09-05
// via scripts/verify-distances.mjs, measured from Grote Markt, Tienen, Belgium.
export const DESTINATIONS = [
  { id: 'zav', km: 42.8, min: 33, lat: 50.897070, lon: 4.479900, tbc: true, nl: 'Brussels Airport (Zaventem)', fr: 'Brussels Airport (Zaventem)', en: 'Brussels Airport (Zaventem)' },
  { id: 'cri', km: 83.3, min: 66, lat: 50.461200, lon: 4.467920, tbc: true, nl: 'Brussels South (Charleroi)', fr: 'Brussels South (Charleroi)', en: 'Brussels South (Charleroi)' },
  { id: 'lgg', km: 52.8, min: 38, lat: 50.642830, lon: 5.460430, tbc: true, nl: 'Luchthaven Luik', fr: 'Liège Airport', en: 'Liège Airport' },
  { id: 'maa', km: 95.5, min: 65, lat: 50.911210, lon: 5.774460, tbc: true, nl: 'Maastricht Aachen Airport', fr: 'Maastricht Aachen Airport', en: 'Maastricht Aachen Airport' },
  { id: 'ein', km: 104.3, min: 101, lat: 51.459850, lon: 5.395700, tbc: true, nl: 'Eindhoven Airport', fr: 'Eindhoven Airport', en: 'Eindhoven Airport' },
  { id: 'bru', km: 47.7, min: 44, lat: 50.846310, lon: 4.351460, nl: 'Brussel — centrum', fr: 'Bruxelles — centre', en: 'Brussels — city centre' },
  { id: 'leu', km: 33.6, min: 30, lat: 50.879640, lon: 4.700440, nl: 'Leuven', fr: 'Leuven', en: 'Leuven' },
  { id: 'has', km: 47, min: 50, lat: 50.929260, lon: 5.336430, nl: 'Hasselt', fr: 'Hasselt', en: 'Hasselt' },
  { id: 'stt', km: 21.2, min: 38, lat: 50.815260, lon: 5.185480, nl: 'Sint-Truiden', fr: 'Sint-Truiden', en: 'Sint-Truiden' },
  { id: 'jod', km: 12.4, min: 21, lat: 50.724110, lon: 4.868030, nl: 'Geldenaken', fr: 'Jodoigne', en: 'Jodoigne' },
  { id: 'aar', km: 22.8, min: 33, lat: 50.984140, lon: 4.836260, nl: 'Aarschot', fr: 'Aarschot', en: 'Aarschot' },
  { id: 'wav', km: 43.3, min: 44, lat: 50.716900, lon: 4.610270, nl: 'Waver', fr: 'Wavre', en: 'Wavre' },
  { id: 'nam', km: 47.8, min: 56, lat: 50.466530, lon: 4.865460, nl: 'Namen', fr: 'Namur', en: 'Namur' },
  { id: 'sta', km: 1.2, min: 5, lat: 50.807990, lon: 4.926540, nl: 'Station Tienen', fr: 'Gare de Tienen', en: 'Tienen train station' },
  { id: 'hos', km: 1.9, min: 7, lat: 50.810860, lon: 4.933900, nl: 'Regionaal Ziekenhuis, Tienen', fr: 'Hôpital régional, Tienen', en: 'Regional hospital, Tienen' },
  { id: 'other', km: null, min: null, nl: 'Ander adres…', fr: 'Autre adresse…', en: 'Other address…' },
];

export const AIRPORT_IDS = ['zav', 'cri', 'lgg', 'maa', 'ein'];

// The furthest destination the business actually advertises. Anything the
// live lookup finds beyond it is outside what the dropdown offers, so the
// simulator prices it but adds a "call us" notice rather than quoting a
// long-distance fare silently. Derived, not hard-coded, so extending the
// list moves the threshold on its own.
export const FURTHEST_PRESET_KM = Math.max(...DESTINATIONS.map((d) => d.km ?? 0));

// How close a destination has to be to an airport for the CDC's "no airport
// price until the client sets one" rule to apply. Airport grounds are large,
// so this covers the terminals, the car parks and the access roads without
// catching the neighbouring towns.
const AIRPORT_RADIUS_KM = 3;

/**
 * The airport a destination belongs to, if any.
 *
 * With free-text destinations there is no dropdown entry left to carry the
 * `tbc` flag, so it has to be recognised from the coordinate instead:
 * someone typing "Brussels Airport" must still be told to call, never quoted
 * a price the client has not approved (CDC §11.4).
 *
 * @param {{ lat: number, lon: number }} point
 * @returns {object|null} the matching airport entry
 */
export function airportAt(point) {
  if (!point || typeof point.lat !== 'number' || typeof point.lon !== 'number') return null;
  return (
    DESTINATIONS.filter((d) => AIRPORT_IDS.includes(d.id)).find(
      (airport) => haversineKm(point, airport) <= AIRPORT_RADIUS_KM
    ) ?? null
  );
}

// Straight-line distance, only ever used to answer "is this the airport?".
// Road distance always comes from the router.
function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
