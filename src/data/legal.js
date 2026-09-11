// Le texte des mentions légales et de la politique de confidentialité.
//
// A RELIRE dès que le simulateur change de comportement : ce texte décrit
// précisément ce qui est envoyé à OpenRouteService et à OpenStreetMap. Une
// promesse fausse ici est un problème juridique, pas une coquille.
//
// L'hébergeur (Vercel Inc., une société américaine) est donc hors UE : la
// politique de confidentialité devra probablement le dire explicitement,
// pas seulement le nommer dans les mentions légales — à faire valider par
// un juriste, comme le reste de cette page (voir README, "Points en
// attente côté client").
import { BUSINESS } from '../config/business.js';

const ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.postalCode} ${BUSINESS.address.city}`;
const EMAIL = BUSINESS.email;
// Adresse légale publiée par Vercel lui-même (vercel.com/legal/privacy-policy,
// vérifiée le 2026-09-06). À reconfirmer avant mise en ligne : ce genre
// d'adresse peut changer sans préavis particulier pour les tiers.
const HOST_ADDRESS = 'Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis';
const HOST_ADDRESS_NL = 'Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, Verenigde Staten';
const HOST_ADDRESS_EN = 'Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States';

// Coordonnées de l'autorité de surveillance, exigées par l'article
// XII.6, §1er, 5° du Code de droit économique dès qu'une activité est
// soumise à autorisation — c'est le cas ici (vergunning IBP). Vérifiées le
// 2026-09-06 sur la page officielle de la Ville de Tienen
// (tienen.be/integrale-veiligheid-en-vergunningen).
//
// Le nom du service et l'adresse postale restent en néerlandais dans les
// trois langues : ce sont des coordonnées à utiliser telles quelles pour
// contacter l'administration, pas un texte à traduire. Seules les
// étiquettes "téléphone"/"e-mail" suivent la langue de la page.
const AUTHORITY_CORE = 'Stad Tienen — Integrale veiligheid en vergunningen, Stadhuis, Grote Markt 27, 3300 Tienen, België';
const AUTHORITY_ADDRESS = `${AUTHORITY_CORE}. Tél. 016 24 73 50 — e-mail integraleveiligheid@tienen.be`;
const AUTHORITY_ADDRESS_NL = `${AUTHORITY_CORE}. Tel. 016 24 73 50 — e-mail integraleveiligheid@tienen.be`;
const AUTHORITY_ADDRESS_EN = `${AUTHORITY_CORE}. Phone 016 24 73 50 — email integraleveiligheid@tienen.be`;

export const LEGAL = {
  fr: {
    juridisch: {
      title: 'Mentions légales',
      h1: 'Éditeur du site',
      p1: `Taxi QISSI — ${ADDRESS}. Service de taxi agréé par la ville de Tienen.`,
      h2: 'Hébergement',
      p2: `Le site est hébergé par ${HOST_ADDRESS}.`,
      h3: 'Prix et responsabilité',
      p3: "Les montants affichés par l'outil d'estimation sont indicatifs et ne constituent pas une offre contractuelle. Le prix définitif est celui du compteur, conformément à la réglementation taxi en vigueur.",
      h4: 'Autorité de surveillance',
      p4: `Ce service de taxi est soumis à autorisation (vergunning individueel bezoldigd personenvervoer, décret flamand du 29 mars 2019). Autorité de surveillance compétente : ${AUTHORITY_ADDRESS}.`,
    },
    privacy: {
      title: 'Politique de confidentialité',
      h1: 'Données collectées',
      p1: "Le site ne conserve aucune donnée saisie dans l'outil d'estimation. Les adresses, la date et le nom que vous entrez restent dans votre navigateur et servent uniquement à composer le message WhatsApp que vous envoyez vous-même. Deux exceptions : les adresses que vous tapez dans les champs de départ et de destination sont envoyées à OpenRouteService (notre service de calcul d'itinéraire) pour proposer des suggestions, puis pour mesurer la distance réelle du trajet que vous demandez ; quand ce service ne trouve rien (certains noms de communes en français, par exemple), la même adresse est aussi soumise à Nominatim, le service de recherche d'OpenStreetMap, pour retenter la recherche ; l'adresse de départ pré-remplie ne déclenche aucun envoi tant que vous n'y touchez pas ; et les cartes du site (celle qui accompagne votre estimation, et celle de la zone desservie sur la page Contact) chargent leurs fonds de plan depuis OpenStreetMap, qui reçoit alors votre adresse IP et la zone consultée. Ces cartes ne se chargent qu'au moment où elles s'affichent réellement : sur les autres pages, et tant que vous ne demandez pas d'estimation, aucune donnée ne quitte votre navigateur.",
      h2: "Mesure d'audience",
      p2: "Aucun profilage publicitaire et aucun cookie de suivi. Deux outils de mesure tournent en parallèle. Umami, que nous hébergeons nous-mêmes, compterait les visites sans jamais transmettre de données à un tiers — mais son instance reste à installer, il ne collecte donc rien pour l'instant. En attendant, Vercel Web Analytics (notre hébergeur, voir « Hébergement » ci-dessus) mesure les pages vues et les clics sur les boutons d'appel et WhatsApp ; ces données sont traitées par Vercel Inc., une société américaine. Aucune donnée saisie dans le simulateur n'est jamais envoyée à l'un ou l'autre de ces outils.",
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
      p2: `De site wordt gehost door ${HOST_ADDRESS_NL}.`,
      h3: 'Prijs en aansprakelijkheid',
      p3: 'De bedragen van de prijsberekening zijn indicatief en vormen geen contractueel aanbod. De definitieve prijs is die van de meter, volgens de geldende taxireglementering.',
      h4: 'Toezichthoudende overheid',
      p4: `Deze taxidienst is onderworpen aan een vergunning (vergunning individueel bezoldigd personenvervoer, Vlaams decreet van 29 maart 2019). Bevoegde toezichthoudende overheid: ${AUTHORITY_ADDRESS_NL}.`,
    },
    privacy: {
      title: 'Privacybeleid',
      h1: 'Welke gegevens',
      p1: 'De site bewaart niets van wat u in de prijsberekening invult. Adressen, datum en naam blijven in uw browser en dienen enkel om het WhatsApp-bericht op te stellen dat u zelf verstuurt. Twee uitzonderingen: de adressen die u in het vertrek- en bestemmingsveld typt, gaan naar OpenRouteService (onze routedienst) om suggesties te tonen en daarna de werkelijke afstand te meten; vindt die dienst niets (bijvoorbeeld bij een Franse naam voor een Vlaamse gemeente), dan wordt hetzelfde adres ook aan Nominatim voorgelegd, de zoekdienst van OpenStreetMap, om het opnieuw te proberen; het vooraf ingevulde vertrekadres stuurt niets zolang u het niet wijzigt; en de kaarten op de site (die bij uw schatting, en die van de bediende zone op de contactpagina) laden hun achtergrond bij OpenStreetMap, dat daarbij uw IP-adres en het bekeken gebied ontvangt. Die kaarten laden pas wanneer ze echt in beeld komen: op de andere pagina’s, en zolang u geen schatting vraagt, verlaat er niets uw browser.',
      h2: 'Statistieken',
      p2: 'Geen advertentieprofilering en geen trackingcookies. Er lopen twee meetinstrumenten naast elkaar. Umami, dat we zelf hosten, zou bezoeken tellen zonder ooit gegevens door te geven aan derden — maar de instantie moet nog opgezet worden, dus die verzamelt voorlopig niets. Ondertussen meet Vercel Web Analytics (onze hostingpartij, zie "Hosting" hierboven) de paginaweergaves en de klikken op de bel- en WhatsApp-knoppen; die gegevens worden verwerkt door Vercel Inc., een Amerikaans bedrijf. Wat u in de prijssimulator invult, wordt nooit naar een van beide tools gestuurd.',
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
      p2: `The site is hosted by ${HOST_ADDRESS_EN}.`,
      h3: 'Price and liability',
      p3: "Amounts shown by the estimation tool are indicative and do not constitute a contractual offer. The final price is the one shown on the meter, in accordance with applicable taxi regulations.",
      h4: 'Supervisory authority',
      p4: `This taxi service is subject to a permit (vergunning individueel bezoldigd personenvervoer, Flemish decree of 29 March 2019). Competent supervisory authority: ${AUTHORITY_ADDRESS_EN}.`,
    },
    privacy: {
      title: 'Privacy policy',
      h1: 'Data collected',
      p1: 'The site does not retain any data entered into the estimation tool. The addresses, date and name you enter stay in your browser and are used only to compose the WhatsApp message you send yourself. Two exceptions: the addresses you type into the pickup and destination fields are sent to OpenRouteService (our routing provider) to suggest matches and then to measure the real distance of the trip you ask about; when that service finds nothing (a French name for a Flemish town, for example), the same address is also submitted to Nominatim, OpenStreetMap\'s search service, to try again; the pre-filled pickup address sends nothing until you change it; and the maps on the site (the one shown with your estimate, and the served-area one on the Contact page) load their background from OpenStreetMap, which then receives your IP address and the area being viewed. Those maps only load when they actually come into view: on every other page, and until you ask for an estimate, nothing leaves your browser.',
      h2: 'Analytics',
      p2: 'No advertising profiling and no tracking cookies. Two measurement tools run in parallel. Umami, which we host ourselves, would count visits without ever passing data to a third party — but its instance has not been set up yet, so it currently collects nothing. In the meantime, Vercel Web Analytics (our hosting provider, see "Hosting" above) measures page views and clicks on the call and WhatsApp buttons; this data is processed by Vercel Inc., a US company. Nothing you type into the price simulator is ever sent to either tool.',
      h3: 'Your rights',
      p3: `Access, correction, deletion: write to ${EMAIL}. We reply within the timeframe set by the GDPR.`,
    },
  },
};
