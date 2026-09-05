// Toutes les informations de l'entreprise, à un seul endroit.
// Changer le téléphone, l'adresse ou les tarifs se fait ici, et se répercute
// partout sur le site.
//
// REGLE : ne jamais remplacer un [TO_BE_CONFIRMED] par une valeur
// vraisemblable. Une fausse donnée en ligne est pire qu'un trou visible.

// Le point de départ par défaut du simulateur (la Grote Markt de Tienen).
// C'est aussi le point depuis lequel les distances de destinations.js ont
// été mesurées : les deux doivent rester d'accord.
const ROUTING_ORIGIN = { lat: 50.8075398, lon: 4.9371503 };

export const BUSINESS = {
  legalName: 'Q.I.S.S SRL',
  // Confirmé par le client.
  commercialName: 'Taxi QISSI',
  vatNumber: 'BE1025231305',
  address: {
    street: 'Sint-Truidensesteenweg 234',
    postalCode: '3300',
    city: 'Tienen',
    country: 'BE',
  },
  // Coordonnées réelles, confirmées par le client.
  phoneDisplay: '0469 23 00 17',
  phone: '+32469230017', // format international, pour les liens tel:
  whatsapp: '32469230017', // format international, chiffres seuls, sans +
  email: 'info@taxiqissi.be',
  // Déduit du domaine de l'e-mail, pas confirmé séparément.
  domain: 'taxiqissi.be',
  licenseNumber: '[TO_BE_CONFIRMED]', // licence taxi (IBP), toujours attendue du client
  // Les 22 communes affichées sur le site. C'est une liste d'affichage, pas
  // la définition exacte de la zone desservie.
  servedMunicipalities: [
    'Tienen', 'Leuven', 'Kessel-Lo', 'Sint-Truiden', 'Heverlee', 'Wilsele',
    'Scherpenheuvel', 'Landen', 'Grez-Doiceau', 'Jodoigne', 'Lubbeek', 'Tielt',
    'Linden', 'Hannut', 'Hoegaarden', 'Holsbeek', 'Boutersem', 'Bekkevoort',
    'Korbeek-Lo', 'Bierbeek', 'Geetbets', 'Oud-Heverlee',
  ],
  serviceRadiusMeters: 20000,
  // Centre approximatif de Tienen, pour les données structurées Google.
  // ATTENTION : les noms de propriétés sont écrits en entier (latitude,
  // longitude) parce que schema.org l'exige. Cet objet n'est donc PAS
  // interchangeable avec routingOrigin, qui utilise lat/lon.
  geoMidpoint: {
    latitude: 50.8064,
    longitude: 4.9403,
  },
  routingOrigin: ROUTING_ORIGIN,
  // L'adresse pré-remplie dans le champ "départ". Ses coordonnées étant
  // connues, la garder ne coûte aucune recherche d'adresse.
  defaultPickup: {
    label: 'Grote Markt, Tienen',
    ...ROUTING_ORIGIN,
  },
};

// La grille tarifaire. Modifier un chiffre ici change le prix affiché
// partout : simulateur, page Tarifs et message WhatsApp.
export const FARE = {
  baseFare: 4.0, // € de prise en charge
  perKmRate: 3.0, // € par kilomètre
  nightSurcharge: 3.0, // € de supplément de nuit, une seule fois par course
  nightStartHour: 22, // la nuit commence à 22h
  nightEndHour: 4, // et finit à 4h
  waitingRatePerHour: 36.0, // €/h d'attente — AFFICHE SEULEMENT, jamais calculé
  currency: 'EUR',
};
