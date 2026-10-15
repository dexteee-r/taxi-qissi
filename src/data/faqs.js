// Les questions/réponses de la FAQ, affichées sur la page d'accueil.
// Elles alimentent aussi les données structurées lues par Google.
import { FARE } from '../config/business.js';
import { formatEuro } from '../lib/format.js';

export const FAQS = {
  fr: [
    { q: 'Puis-je réserver en ligne ?', a: "Non. Tout se règle par téléphone ou WhatsApp, en direct avec nous. Le site sert à estimer le prix et à nous joindre." },
    { q: 'Le prix affiché est-il le prix final ?', a: 'Non, il est indicatif. Le trajet réel, le trafic et l’attente peuvent le faire varier. Nous confirmons le prix avant le départ.' },
    { q: 'Combien de temps avant faut-il réserver ?', a: 'Pour un aéroport, la veille est plus sûr. Pour une course locale, appelez : nous sommes souvent disponibles tout de suite.' },
    { q: 'Roulez-vous la nuit et les jours fériés ?', a: 'Oui, 24h/24 et 7j/7. Un supplément de nuit de 3 € s’applique entre 22h et 4h.' },
    { q: 'Attendez-vous si mon vol a du retard ?', a: 'Oui, si vous nous donnez votre numéro de vol. L’attente est facturée 36 €/h au-delà du délai convenu.' },
    { q: 'Emportez-vous les gros bagages ?', a: 'Oui. Indiquez le nombre de valises dans votre message WhatsApp pour que nous envoyions le bon véhicule.' },
    { q: 'Allez-vous en dehors de la zone des 20 km ?', a: 'Oui pour les aéroports et les longues distances. Demandez-nous une estimation par WhatsApp.' },
  ],
  nl: [
    { q: 'Kan ik online reserveren?', a: 'Nee. Alles regelen we telefonisch of via WhatsApp, rechtstreeks met ons. De site dient om de prijs te schatten en ons te bereiken.' },
    { q: 'Is de weergegeven prijs de eindprijs?', a: 'Nee, hij is indicatief. De werkelijke route, het verkeer en de wachttijd kunnen hem doen afwijken. We bevestigen de prijs voor vertrek.' },
    { q: 'Hoe lang vooraf moet ik reserveren?', a: 'Voor een luchthaven is de dag voordien veiliger. Voor een lokale rit: bel ons, vaak kunnen we meteen komen.' },
    { q: 'Rijdt u ’s nachts en op feestdagen?', a: 'Ja, 24/7. Tussen 22u en 4u geldt een nachttoeslag van 3 €.' },
    { q: 'Wacht u als mijn vlucht vertraging heeft?', a: 'Ja, als u ons uw vluchtnummer geeft. Wachttijd kost 36 €/u boven de afgesproken termijn.' },
    { q: 'Neemt u grote bagage mee?', a: 'Ja. Vermeld het aantal koffers in uw WhatsApp-bericht, dan sturen we de juiste wagen.' },
    { q: 'Rijdt u buiten de zone van 20 km?', a: 'Ja, voor luchthavens en lange afstanden. Vraag ons een schatting via WhatsApp.' },
  ],
  en: [
    { q: 'Can I book online?', a: 'No. Everything is arranged by phone or WhatsApp, directly with us. The site is here to estimate the price and to reach us.' },
    { q: 'Is the price shown the final price?', a: "No, it's indicative. The actual route, traffic and waiting time can change it. We confirm the price before departure." },
    { q: 'How far in advance should I book?', a: "For an airport, the day before is safer. For a local ride, call us: we're often available right away." },
    { q: 'Do you drive at night and on public holidays?', a: 'Yes, 24/7. A €3 night surcharge applies between 10pm and 4am.' },
    { q: 'Do you wait if my flight is delayed?', a: "Yes, if you give us your flight number. Waiting time is billed at €36/h beyond the agreed time." },
    { q: 'Do you take large luggage?', a: 'Yes. Mention the number of suitcases in your WhatsApp message so we send the right vehicle.' },
    { q: 'Do you go outside the 20 km zone?', a: 'Yes, for airports and long distances. Ask us for an estimate via WhatsApp.' },
  ],
};

// La FAQ de la page Tarifs (textes validés le 2026-10-19). Les montants
// viennent de la grille tarifaire (src/config/business.js) : changer un tarif
// là-bas change aussi cette FAQ, sans la réécrire à la main.
const prix = (montant, locale) => formatEuro(montant, locale);

export const FAQS_RATES = {
  fr: [
    {
      q: "Comment est calculé le prix d'une course ?",
      a: `${prix(FARE.baseFare, 'fr')} de prise en charge, plus ${prix(FARE.perKmRate, 'fr')} par kilomètre. Un supplément de nuit de ${prix(FARE.nightSurcharge, 'fr')} s'applique entre 22h et 4h. Le prix définitif est celui du compteur.`,
    },
    {
      q: "Comment l'attente est-elle facturée ?",
      a: `${prix(FARE.waitingRatePerHour, 'fr')} de l'heure, calculés au prorata, à la seconde près : 1 minute 14 d'attente se facture 1 minute 14, pas une heure entière.`,
    },
    { q: 'Puis-je payer par carte ?', a: 'Oui : carte ou cash, directement dans le taxi.' },
    {
      q: 'Desservez-vous la gare de Tienen ?',
      a: "Oui, de jour comme de nuit. Pour un train tôt le matin, réservez à l'avance par téléphone ou WhatsApp : nous notons l'heure et nous y sommes.",
    },
  ],
  nl: [
    {
      q: 'Hoe wordt de prijs van een rit berekend?',
      a: `${prix(FARE.baseFare, 'nl')} opstap, plus ${prix(FARE.perKmRate, 'nl')} per kilometer. Tussen 22u en 4u geldt een nachttoeslag van ${prix(FARE.nightSurcharge, 'nl')}. De definitieve prijs is die van de meter.`,
    },
    {
      q: 'Hoe wordt wachttijd aangerekend?',
      a: `${prix(FARE.waitingRatePerHour, 'nl')} per uur, berekend naar verstreken tijd, tot op de seconde: 1 minuut 14 wachten kost 1 minuut 14, geen volledig uur.`,
    },
    { q: 'Kan ik met kaart betalen?', a: 'Ja: kaart of cash, rechtstreeks in de taxi.' },
    {
      q: 'Rijdt u naar het station van Tienen?',
      a: 'Ja, dag en nacht. Voor een vroege trein reserveert u vooraf via telefoon of WhatsApp: wij noteren het uur en staan er.',
    },
  ],
  en: [
    {
      q: 'How is the price of a ride calculated?',
      a: `${prix(FARE.baseFare, 'en')} pickup fee, plus ${prix(FARE.perKmRate, 'en')} per kilometre. A ${prix(FARE.nightSurcharge, 'en')} night surcharge applies between 10pm and 4am. The final price is the one on the meter.`,
    },
    {
      q: 'How is waiting time billed?',
      a: `${prix(FARE.waitingRatePerHour, 'en')} per hour, billed pro rata down to the second: 1 minute 14 seconds of waiting is billed as 1 minute 14 seconds, not a full hour.`,
    },
    { q: 'Can I pay by card?', a: 'Yes: card or cash, directly in the taxi.' },
    {
      q: 'Do you serve Tienen station?',
      a: "Yes, day and night. For an early train, book ahead by phone or WhatsApp: we note the time and we're there.",
    },
  ],
};
