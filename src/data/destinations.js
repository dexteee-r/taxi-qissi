// Preset destinations for the price simulator's dropdown, matching the
// validated Claude Design prototype (claude design template/TaxiDesktop.dc.html
// and TaxiScreen.dc.html). Distances/durations are estimates baked into the
// prototype design, not client-confirmed data — airports are explicitly
// marked `tbc` (to be confirmed) there and kept that way here.
//
// "other" has no fixed km: the simulator falls back to a live address
// lookup via OpenRouteService for it (see src/lib/geocoding.js) rather than
// the prototype's original "always show error" behavior for that option —
// per the hybrid architecture the user asked for.

export const DESTINATIONS = [
  { id: 'zav', km: 45, min: 50, tbc: true, nl: 'Brussels Airport (Zaventem)', fr: 'Brussels Airport (Zaventem)', en: 'Brussels Airport (Zaventem)' },
  { id: 'cri', km: 78, min: 70, tbc: true, nl: 'Brussels South (Charleroi)', fr: 'Brussels South (Charleroi)', en: 'Brussels South (Charleroi)' },
  { id: 'lgg', km: 55, min: 45, tbc: true, nl: 'Luchthaven Luik', fr: 'Liège Airport', en: 'Liège Airport' },
  { id: 'maa', km: 75, min: 65, tbc: true, nl: 'Maastricht Aachen Airport', fr: 'Maastricht Aachen Airport', en: 'Maastricht Aachen Airport' },
  { id: 'ein', km: 95, min: 80, tbc: true, nl: 'Eindhoven Airport', fr: 'Eindhoven Airport', en: 'Eindhoven Airport' },
  { id: 'bru', km: 50, min: 55, nl: 'Brussel — centrum', fr: 'Bruxelles — centre', en: 'Brussels — city centre' },
  { id: 'leu', km: 20, min: 25, nl: 'Leuven', fr: 'Leuven', en: 'Leuven' },
  { id: 'has', km: 35, min: 35, nl: 'Hasselt', fr: 'Hasselt', en: 'Hasselt' },
  { id: 'stt', km: 18, min: 20, nl: 'Sint-Truiden', fr: 'Sint-Truiden', en: 'Sint-Truiden' },
  { id: 'jod', km: 15, min: 18, nl: 'Geldenaken', fr: 'Jodoigne', en: 'Jodoigne' },
  { id: 'aar', km: 28, min: 30, nl: 'Aarschot', fr: 'Aarschot', en: 'Aarschot' },
  { id: 'wav', km: 35, min: 35, nl: 'Waver', fr: 'Wavre', en: 'Wavre' },
  { id: 'nam', km: 60, min: 55, nl: 'Namen', fr: 'Namur', en: 'Namur' },
  { id: 'sta', km: 3, min: 8, nl: 'Station Tienen', fr: 'Gare de Tienen', en: 'Tienen train station' },
  { id: 'hos', km: 4, min: 9, nl: 'Regionaal Ziekenhuis, Tienen', fr: 'Hôpital régional, Tienen', en: 'Regional hospital, Tienen' },
  { id: 'other', km: null, min: null, nl: 'Ander adres…', fr: 'Autre adresse…', en: 'Other address…' },
];

export const AIRPORT_IDS = ['zav', 'cri', 'lgg', 'maa', 'ein'];
