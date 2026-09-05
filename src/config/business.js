// config/business.js — values pending client confirmation.
// Do NOT replace [TO_BE_CONFIRMED] markers with plausible-looking data.
// A fake phone number reaching production is treated as a client incident
// (brief_dev_taxi_qiss.md §1.2). If a value is missing, the render must show
// the marker, never an invented value.

export const BUSINESS = {
  legalName: 'Q.I.S.S SRL',
  // Confirmed by the user (2026-09-04) from the validated Claude Design prototype.
  commercialName: 'Taxi QISSI',
  vatNumber: 'BE1025231305',
  address: {
    street: 'Sint-Truidensesteenweg 234',
    postalCode: '3300',
    city: 'Tienen',
    country: 'BE',
  },
  // Confirmed real contact info (source: prototype, validated by the user — not invented).
  phoneDisplay: '0469 23 00 17',
  phone: '+32469230017', // international format, used in tel: links
  whatsapp: '32469230017', // international format, digits only, no leading +
  email: 'info@taxiqissi.be',
  // Inferred from the confirmed email's domain — not explicitly confirmed on its own, flag if wrong.
  domain: 'taxiqissi.be',
  licenseNumber: '[TO_BE_CONFIRMED]', // vergunning individueel bezoldigd personenvervoer (IBP) — not present in the prototype either
  // "22 most-requested municipalities" subset shown in the prototype's zone section.
  // CDC §3 lists a much longer working list — this is display content, not the full service-area definition.
  servedMunicipalities: [
    'Tienen', 'Leuven', 'Kessel-Lo', 'Sint-Truiden', 'Heverlee', 'Wilsele',
    'Scherpenheuvel', 'Landen', 'Grez-Doiceau', 'Jodoigne', 'Lubbeek', 'Tielt',
    'Linden', 'Hannut', 'Hoegaarden', 'Holsbeek', 'Boutersem', 'Bekkevoort',
    'Korbeek-Lo', 'Bierbeek', 'Geetbets', 'Oud-Heverlee',
  ],
  serviceRadiusMeters: 20000,
  // Approximate geographic center of Tienen for the GeoCircle areaServed schema.
  // Precision to be confirmed once the domain/business listing is finalized.
  // Note the property names: schema.org spells them out, so this object is
  // NOT interchangeable with routingOrigin below.
  geoMidpoint: {
    latitude: 50.8064,
    longitude: 4.9403,
  },
  // Where the simulator measures from. Geocoded from "Grote Markt, Tienen"
  // — the pickup address the form pre-fills — and deliberately the same
  // point scripts/verify-distances.mjs uses for the preset destinations, so
  // the dropdown and the live "other address" lookup stay consistent.
  routingOrigin: {
    lat: 50.8075398,
    lon: 4.9371503,
  },
};

export const FARE = {
  baseFare: 4.0, // EUR, pickup
  perKmRate: 3.0, // EUR per km
  nightSurcharge: 3.0, // EUR, flat, once per ride
  nightStartHour: 22, // 22:00
  nightEndHour: 4, // 04:00
  waitingRatePerHour: 36.0, // EUR/hour — DISPLAY ONLY, never computed
  currency: 'EUR',
};
