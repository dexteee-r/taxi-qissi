// Legal notice / privacy policy copy — NL/FR approved from the prototype
// (claude design template/*.dc.html, LEGAL constant); EN is our own
// translation (2026-09-04, not yet client-reviewed).
//
// One addition beyond the prototype: a note on the OpenRouteService address
// lookup used by the simulator's "other address" option, which the
// prototype's original (dropdown-only, no third-party calls) design didn't
// need to disclose. Marked inline below.
import { BUSINESS } from '../config/business.js';

const ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.postalCode} ${BUSINESS.address.city}`;
const EMAIL = BUSINESS.email;

export const LEGAL = {
  fr: {
    juridisch: {
      title: 'Mentions légales',
      h1: 'Éditeur du site',
      p1: `Taxi QISSI — ${ADDRESS}. Service de taxi agréé par la ville de Tienen.`,
      h2: 'Hébergement',
      p2: "Le site est hébergé chez un prestataire européen ; son nom et son adresse figurent ici avant la mise en ligne.",
      h3: 'Prix et responsabilité',
      p3: "Les montants affichés par l'outil d'estimation sont indicatifs et ne constituent pas une offre contractuelle. Le prix définitif est celui du compteur, conformément à la réglementation taxi en vigueur.",
    },
    privacy: {
      title: 'Politique de confidentialité',
      h1: 'Données collectées',
      p1: "Le site ne conserve aucune donnée saisie dans l'outil d'estimation. Les adresses, la date et le nom que vous entrez restent dans votre navigateur et servent uniquement à composer le message WhatsApp que vous envoyez vous-même. Exception : si vous choisissez « Autre adresse », le texte que vous tapez est envoyé à OpenRouteService (notre service de calcul d'itinéraire) pour retrouver l'adresse et calculer la distance réelle — les destinations de la liste déroulante n'entraînent aucun envoi à un tiers.",
      h2: "Mesure d'audience",
      p2: "Aucun profilage publicitaire. Si un outil de statistiques est installé, il est mentionné ici avec sa finalité et sa durée de conservation.",
      h3: 'Vos droits',
      p3: `Accès, rectification, effacement : écrivez à ${EMAIL}. Nous répondons dans le délai prévu par le RGPD.`,
    },
  },
  nl: {
    juridisch: {
      title: 'Juridische info',
      h1: 'Uitgever van de site',
      p1: `Taxi QISSI — ${ADDRESS}. Erkende taxidienst van de stad Tienen.`,
      h2: 'Hosting',
      p2: 'De site wordt gehost bij een Europese partij; naam en adres staan hier vóór de livegang.',
      h3: 'Prijs en aansprakelijkheid',
      p3: 'De bedragen van de prijsberekening zijn indicatief en vormen geen contractueel aanbod. De definitieve prijs is die van de meter, volgens de geldende taxireglementering.',
    },
    privacy: {
      title: 'Privacybeleid',
      h1: 'Welke gegevens',
      p1: 'De site bewaart niets van wat u in de prijsberekening invult. Adressen, datum en naam blijven in uw browser en dienen enkel om het WhatsApp-bericht op te stellen dat u zelf verstuurt. Uitzondering: kiest u "Ander adres", dan wordt de tekst die u typt naar OpenRouteService (onze routedienst) gestuurd om het adres te herkennen en de werkelijke afstand te berekenen — de bestemmingen uit de keuzelijst worden nooit naar een derde partij gestuurd.',
      h2: 'Statistieken',
      p2: 'Geen advertentieprofilering. Als er een statistiektool wordt geplaatst, staat die hier vermeld met doel en bewaartermijn.',
      h3: 'Uw rechten',
      p3: `Inzage, correctie, verwijdering: mail naar ${EMAIL}. We antwoorden binnen de termijn van de AVG.`,
    },
  },
  en: {
    juridisch: {
      title: 'Legal notice',
      h1: 'Website publisher',
      p1: `Taxi QISSI — ${ADDRESS}. Taxi service licensed by the city of Tienen.`,
      h2: 'Hosting',
      p2: 'The site is hosted with a European provider; its name and address will appear here before go-live.',
      h3: 'Price and liability',
      p3: "Amounts shown by the estimation tool are indicative and do not constitute a contractual offer. The final price is the one shown on the meter, in accordance with applicable taxi regulations.",
    },
    privacy: {
      title: 'Privacy policy',
      h1: 'Data collected',
      p1: 'The site does not retain any data entered into the estimation tool. The addresses, date and name you enter stay in your browser and are used only to compose the WhatsApp message you send yourself. Exception: if you choose "Other address", the text you type is sent to OpenRouteService (our routing provider) to look up the address and calculate the real distance — destinations picked from the dropdown list are never sent to a third party.',
      h2: 'Analytics',
      p2: 'No advertising profiling. If an analytics tool is installed, it will be listed here with its purpose and retention period.',
      h3: 'Your rights',
      p3: `Access, correction, deletion: write to ${EMAIL}. We reply within the timeframe set by the GDPR.`,
    },
  },
};
