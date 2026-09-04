// config/business.js — values pending client confirmation.
// Do NOT replace [TO_BE_CONFIRMED] markers with plausible-looking data.
// A fake phone number reaching production is treated as a client incident
// (brief_dev_taxi_qiss.md §1.2). If a value is missing, the render must show
// the marker, never an invented value.

export const BUSINESS = {
  legalName: 'Q.I.S.S SRL',
  commercialName: '[TO_BE_CONFIRMED]', // working name "Taxi QISSI" — CDC §1, not yet validated by client
  vatNumber: 'BE1025231305',
  address: {
    street: 'Sint-Truidensesteenweg 234',
    postalCode: '3300',
    city: 'Tienen',
    country: 'BE',
  },
  phone: '[TO_BE_CONFIRMED]', // international format, digits only when used in tel: links
  whatsapp: '[TO_BE_CONFIRMED]', // international format, digits only, no leading +
  licenseNumber: '[TO_BE_CONFIRMED]', // vergunning individueel bezoldigd personenvervoer (IBP)
  domain: '[TO_BE_CONFIRMED]',
  servedMunicipalities: [], // awaiting definitive client list (CDC §3 gives an unconfirmed working list)
  serviceRadiusMeters: 20000,
  // Approximate geographic center of Tienen for the GeoCircle areaServed schema.
  // Precision to be confirmed once the domain/business listing is finalized.
  geoMidpoint: {
    latitude: 50.8064,
    longitude: 4.9403,
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
