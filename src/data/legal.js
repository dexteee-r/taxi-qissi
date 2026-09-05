// Le texte des mentions légales et de la politique de confidentialité.
//
// A RELIRE dès que le simulateur change de comportement : ce texte décrit
// précisément ce qui est envoyé à OpenRouteService et à OpenStreetMap. Une
// promesse fausse ici est un problème juridique, pas une coquille.
//
// Reste à ajouter avant la mise en ligne : le nom de l'hébergeur.
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
      p1: "Le site ne conserve aucune donnée saisie dans l'outil d'estimation. Les adresses, la date et le nom que vous entrez restent dans votre navigateur et servent uniquement à composer le message WhatsApp que vous envoyez vous-même. Deux exceptions : les adresses que vous tapez dans les champs de départ et de destination sont envoyées à OpenRouteService (notre service de calcul d'itinéraire) pour proposer des suggestions, puis pour mesurer la distance réelle du trajet que vous demandez ; quand ce service ne trouve rien (certains noms de communes en français, par exemple), la même adresse est aussi soumise à Nominatim, le service de recherche d'OpenStreetMap, pour retenter la recherche ; l'adresse de départ pré-remplie ne déclenche aucun envoi tant que vous n'y touchez pas ; et les cartes du site (celle qui accompagne votre estimation, et celle de la zone desservie sur la page Contact) chargent leurs fonds de plan depuis OpenStreetMap, qui reçoit alors votre adresse IP et la zone consultée. Ces cartes ne se chargent qu'au moment où elles s'affichent réellement : sur les autres pages, et tant que vous ne demandez pas d'estimation, aucune donnée ne quitte votre navigateur.",
      h2: "Mesure d'audience",
      p2: "Aucun profilage publicitaire et aucun cookie de suivi. Nous utilisons Umami, un outil de statistiques hébergé sur notre propre serveur : il compte les visites de façon anonyme (pages vues, clics sur les boutons d'appel et WhatsApp) sans identifier les visiteurs et sans transmettre de données à un tiers. Aucune donnée saisie dans le simulateur n'y est envoyée.",
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
      p1: 'De site bewaart niets van wat u in de prijsberekening invult. Adressen, datum en naam blijven in uw browser en dienen enkel om het WhatsApp-bericht op te stellen dat u zelf verstuurt. Twee uitzonderingen: de adressen die u in het vertrek- en bestemmingsveld typt, gaan naar OpenRouteService (onze routedienst) om suggesties te tonen en daarna de werkelijke afstand te meten; vindt die dienst niets (bijvoorbeeld bij een Franse naam voor een Vlaamse gemeente), dan wordt hetzelfde adres ook aan Nominatim voorgelegd, de zoekdienst van OpenStreetMap, om het opnieuw te proberen; het vooraf ingevulde vertrekadres stuurt niets zolang u het niet wijzigt; en de kaarten op de site (die bij uw schatting, en die van de bediende zone op de contactpagina) laden hun achtergrond bij OpenStreetMap, dat daarbij uw IP-adres en het bekeken gebied ontvangt. Die kaarten laden pas wanneer ze echt in beeld komen: op de andere pagina’s, en zolang u geen schatting vraagt, verlaat er niets uw browser.',
      h2: 'Statistieken',
      p2: 'Geen advertentieprofilering en geen trackingcookies. We gebruiken Umami, een statistiektool op onze eigen server: die telt bezoeken anoniem (paginaweergaves, klikken op de bel- en WhatsApp-knoppen) zonder bezoekers te identificeren en zonder gegevens door te geven aan derden. Wat u in de prijssimulator invult, wordt er nooit naartoe gestuurd.',
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
      p1: 'The site does not retain any data entered into the estimation tool. The addresses, date and name you enter stay in your browser and are used only to compose the WhatsApp message you send yourself. Two exceptions: the addresses you type into the pickup and destination fields are sent to OpenRouteService (our routing provider) to suggest matches and then to measure the real distance of the trip you ask about; when that service finds nothing (a French name for a Flemish town, for example), the same address is also submitted to Nominatim, OpenStreetMap\'s search service, to try again; the pre-filled pickup address sends nothing until you change it; and the maps on the site (the one shown with your estimate, and the served-area one on the Contact page) load their background from OpenStreetMap, which then receives your IP address and the area being viewed. Those maps only load when they actually come into view: on every other page, and until you ask for an estimate, nothing leaves your browser.',
      h2: 'Analytics',
      p2: 'No advertising profiling and no tracking cookies. We use Umami, an analytics tool hosted on our own server: it counts visits anonymously (page views, clicks on the call and WhatsApp buttons) without identifying visitors and without passing data to any third party. Nothing you type into the price simulator is ever sent to it.',
      h3: 'Your rights',
      p3: `Access, correction, deletion: write to ${EMAIL}. We reply within the timeframe set by the GDPR.`,
    },
  },
};
