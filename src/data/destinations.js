// Les destinations connues de Taxi QISSI.
//
// Le simulateur ne s'en sert plus pour calculer un prix : les deux champs
// d'adresse sont libres et tout est mesuré en direct. Cette liste sert
// encore à trois choses :
//   1. les pages "transport aéroport" ;
//   2. le menu déroulant du bloc d'estimation de la page d'accueil ;
//   3. reconnaître un aéroport, pour ne jamais en afficher le prix.
//
// Les distances sont mesurées, pas estimées : `npm run verify:distances`.
// `lat`/`lon` sont le point où le routeur termine réellement le trajet.
import { BUSINESS } from '../config/business.js';

export const DESTINATIONS = [
  { id: 'zav', km: 42.8, min: 33, lat: 50.897070, lon: 4.479900, price: 130, nl: 'Brussels Airport (Zaventem)', fr: 'Brussels Airport (Zaventem)', en: 'Brussels Airport (Zaventem)' },
  { id: 'cri', km: 83.3, min: 66, lat: 50.461200, lon: 4.467920, price: 150, nl: 'Brussels South (Charleroi)', fr: 'Brussels South (Charleroi)', en: 'Brussels South (Charleroi)' },
  { id: 'lgg', km: 52.8, min: 38, lat: 50.642830, lon: 5.460430, price: 160, nl: 'Luchthaven Luik', fr: 'Liège Airport', en: 'Liège Airport' },
  { id: 'maa', km: 95.5, min: 65, lat: 50.911210, lon: 5.774460, price: 240, nl: 'Maastricht Aachen Airport', fr: 'Maastricht Aachen Airport', en: 'Maastricht Aachen Airport' },
  { id: 'ein', km: 104.3, min: 101, lat: 51.459850, lon: 5.395700, price: 320, nl: 'Eindhoven Airport', fr: 'Eindhoven Airport', en: 'Eindhoven Airport' },
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
];

// Un aéroport affiche son forfait fixe (`price`, en €, aller simple) dès que
// le client l'a communiqué. Sans ce champ, le cahier des charges interdit
// d'afficher un prix — calculé ou non — tant qu'il ne l'a pas fixé.
//
// Les cinq forfaits ci-dessus sont ceux d'une prise en charge à Tienen,
// confirmés par le client le 2026-09-15 ; il a précisé qu'ils peuvent varier
// pour un autre point de départ (voir `flatFareNote` dans les fichiers de
// langue, affiché à chaque fois qu'un de ces forfaits s'affiche).
export const AIRPORT_IDS = ['zav', 'cri', 'lgg', 'maa', 'ein'];

// La destination la plus lointaine que le client propose. Au-delà, le
// simulateur affiche le prix mais invite à appeler. Calculé depuis la liste,
// donc ajouter une destination déplace le seuil tout seul.
export const FURTHEST_PRESET_KM = Math.max(...DESTINATIONS.map((d) => d.km ?? 0));

// Les terrains d'aéroport sont vastes : 3 km couvrent les terminaux, les
// parkings et les routes d'accès sans attraper les villages voisins.
const RAYON_AEROPORT_KM = 3;

/**
 * L'aéroport auquel appartient une destination, ou null.
 *
 * Le champ de destination étant libre, c'est la coordonnée choisie — et non
 * une entrée de menu — qui doit déclencher le "prix à confirmer".
 *
 * @param {{ lat: number, lon: number }} point
 */
export function airportAt(point) {
  if (!point || typeof point.lat !== 'number' || typeof point.lon !== 'number') return null;
  const aeroports = DESTINATIONS.filter((d) => AIRPORT_IDS.includes(d.id));
  return aeroports.find((a) => distanceAVolDOiseauKm(point, a) <= RAYON_AEROPORT_KM) ?? null;
}

/**
 * Le départ est-il assez près de Tienen pour que le forfait aéroport affiché
 * s'applique ? Les forfaits sont ceux d'une prise en charge à Tienen ; le
 * client a précisé qu'ils peuvent varier ailleurs (BUSINESS.flatFareRadiusKm).
 *
 * @param {{ lat: number, lon: number }} point
 */
export function inFlatFareZone(point) {
  if (!point || typeof point.lat !== 'number' || typeof point.lon !== 'number') return false;
  return distanceAVolDOiseauKm(point, BUSINESS.routingOrigin) <= BUSINESS.flatFareRadiusKm;
}

// Distance à vol d'oiseau, uniquement pour répondre à "est-ce l'aéroport ?".
// La distance routière vient toujours du routeur.
function distanceAVolDOiseauKm(a, b) {
  const enRadians = (degres) => (degres * Math.PI) / 180;
  const RAYON_TERRE_KM = 6371;
  const dLat = enRadians(b.lat - a.lat);
  const dLon = enRadians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(enRadians(a.lat)) * Math.cos(enRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h));
}
