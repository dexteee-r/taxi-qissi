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
// "other" has no fixed km: the simulator falls back to a live address
// lookup via OpenRouteService for it (see src/lib/geocoding.js) rather than
// the prototype's original "always show error" behavior for that option —
// per the hybrid architecture the user asked for.

// Distances verified against OpenRouteService on 2026-09-04
// via scripts/verify-distances.mjs, measured from Grote Markt, Tienen, Belgium.
export const DESTINATIONS = [
  { id: 'zav', km: 42.8, min: 33, tbc: true, nl: 'Brussels Airport (Zaventem)', fr: 'Brussels Airport (Zaventem)', en: 'Brussels Airport (Zaventem)' },
  { id: 'cri', km: 83.3, min: 66, tbc: true, nl: 'Brussels South (Charleroi)', fr: 'Brussels South (Charleroi)', en: 'Brussels South (Charleroi)' },
  { id: 'lgg', km: 52.8, min: 38, tbc: true, nl: 'Luchthaven Luik', fr: 'Liège Airport', en: 'Liège Airport' },
  { id: 'maa', km: 95.5, min: 65, tbc: true, nl: 'Maastricht Aachen Airport', fr: 'Maastricht Aachen Airport', en: 'Maastricht Aachen Airport' },
  { id: 'ein', km: 104.3, min: 101, tbc: true, nl: 'Eindhoven Airport', fr: 'Eindhoven Airport', en: 'Eindhoven Airport' },
  { id: 'bru', km: 47.7, min: 44, nl: 'Brussel — centrum', fr: 'Bruxelles — centre', en: 'Brussels — city centre' },
  { id: 'leu', km: 33.6, min: 30, nl: 'Leuven', fr: 'Leuven', en: 'Leuven' },
  { id: 'has', km: 47, min: 50, nl: 'Hasselt', fr: 'Hasselt', en: 'Hasselt' },
  { id: 'stt', km: 22.3, min: 40, nl: 'Sint-Truiden', fr: 'Sint-Truiden', en: 'Sint-Truiden' },
  { id: 'jod', km: 12.4, min: 21, nl: 'Geldenaken', fr: 'Jodoigne', en: 'Jodoigne' },
  { id: 'aar', km: 22.8, min: 33, nl: 'Aarschot', fr: 'Aarschot', en: 'Aarschot' },
  { id: 'wav', km: 43.3, min: 44, nl: 'Waver', fr: 'Wavre', en: 'Wavre' },
  { id: 'nam', km: 47.8, min: 56, nl: 'Namen', fr: 'Namur', en: 'Namur' },
  { id: 'sta', km: 1.2, min: 5, nl: 'Station Tienen', fr: 'Gare de Tienen', en: 'Tienen train station' },
  { id: 'hos', km: 1.9, min: 7, nl: 'Regionaal Ziekenhuis, Tienen', fr: 'Hôpital régional, Tienen', en: 'Regional hospital, Tienen' },
  { id: 'other', km: null, min: null, nl: 'Ander adres…', fr: 'Autre adresse…', en: 'Other address…' },
];

export const AIRPORT_IDS = ['zav', 'cri', 'lgg', 'maa', 'ein'];
