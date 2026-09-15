// Le simulateur de prix : ce qui se passe quand on remplit le formulaire de
// la page Tarifs et qu'on clique sur "Calculer le prix".
//
// Le formulaire lui-même est dans src/components/PriceSimulator.astro ; ce
// fichier ne fait que le faire vivre. Il s'exécute dans le navigateur du
// visiteur, jamais sur un serveur (voir le README, "Contrainte d'architecture").
//
// Déroulé : on vérifie que les deux adresses ont bien été choisies, on
// demande la distance réelle à OpenRouteService, on calcule le prix, on
// remplit le reçu et le message WhatsApp, puis on affiche la carte.
import { routeDistance, MapServiceError } from './geocoding.js';
import { createAddressField } from './address-field.js';
import { estimateFare } from './fare.js';
import { buildWhatsAppMessage, buildWhatsAppUrl } from './whatsapp.js';
import { formatEuro, formatKm } from './format.js';
import { trackEvent } from './analytics.js';
import { t } from '../i18n/dictionary.js';
import { DESTINATIONS, FURTHEST_PRESET_KM, airportAt } from '../data/destinations.js';
import { BUSINESS, FARE } from '../config/business.js';

// Longueur maximale acceptée pour une adresse, y compris celle qu'un lien
// extérieur pourrait glisser dans l'URL.
const MAX_CARACTERES_ADRESSE = 120;

const el = (id) => document.getElementById(id);

export function startSimulator() {
  const section = document.querySelector('.simulator');
  if (!section) return;

  const locale = section.getAttribute('data-locale') ?? 'nl';
  const textes = t(locale);
  const form = el('sim-form');
  const fromInput = el('from');
  const destInput = el('dest');

  // Le formulaire n'affiche qu'un seul de ces blocs à la fois.
  function afficher(etat) {
    el('state-error').hidden = etat !== 'erreur';
    el('state-loading').hidden = etat !== 'chargement';
    el('state-result').hidden = etat !== 'resultat';
    document.querySelector('.compute-wrap').hidden = etat === 'chargement' || etat === 'resultat';
  }

  // --- compteurs passagers / bagages ---------------------------------
  function brancherCompteur(prefixe, min, max, valeurInitiale) {
    const affichage = el(`${prefixe}-value`);
    let valeur = valeurInitiale;
    const changer = (delta) => {
      valeur = Math.min(max, Math.max(min, valeur + delta));
      affichage.textContent = String(valeur);
    };
    el(`${prefixe}-down`).addEventListener('click', () => changer(-1));
    el(`${prefixe}-up`).addEventListener('click', () => changer(+1));
    return () => valeur;
  }
  const lirePassagers = brancherCompteur('pax', 1, 8, 2);
  const lireBagages = brancherCompteur('bags', 0, 8, 1);

  // --- les deux champs d'adresse --------------------------------------
  const champDepart = createAddressField({
    input: fromInput,
    listbox: el('from-listbox'),
    idPrefix: 'from',
    textes,
    autour: BUSINESS.routingOrigin,
    onChoix: () => afficher(null),
  });
  const champDestination = createAddressField({
    input: destInput,
    listbox: el('dest-listbox'),
    idPrefix: 'dest',
    textes,
    autour: BUSINESS.routingOrigin,
    onChoix: () => afficher(null),
  });

  // L'adresse de départ pré-remplie est déjà "choisie" : on connaît ses
  // coordonnées, donc la garder ne coûte aucune recherche.
  champDepart.set({ ...BUSINESS.defaultPickup });

  // --- calcul ----------------------------------------------------------
  function echouer(message, champ) {
    el('error-text').textContent = message;
    afficher('erreur');
    champ?.prompt();
  }

  // "Adresse introuvable" n'est vrai que pour un vrai not_found : un quota
  // épuisé ou une panne réseau n'ont rien à voir avec l'adresse saisie, et
  // envoyer le visiteur chercher une faute de frappe masquerait le problème.
  function messageDePanne(erreur) {
    const introuvable = erreur instanceof MapServiceError && erreur.kind === 'not_found';
    return introuvable ? textes.lookupError : textes.errService;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Un champ sans adresse choisie veut dire "prenez une suggestion" —
    // sauf si la recherche elle-même est en panne, auquel cas il n'y a
    // aucune suggestion à prendre.
    const pasChoisie = (champ) => (champ.unavailable ? textes.errService : textes.errPickAddress);

    if (!fromInput.value.trim()) return echouer(textes.errNoFrom, champDepart);
    if (!champDepart.value) return echouer(pasChoisie(champDepart), champDepart);
    if (!destInput.value.trim()) return echouer(textes.errBody, champDestination);
    if (!champDestination.value) return echouer(pasChoisie(champDestination), champDestination);

    const depart = champDepart.value;
    const arrivee = champDestination.value;

    // Distance réelle par la route. Les deux bouts sont des adresses
    // choisies par le visiteur : il n'y a aucune distance mémorisée sur
    // laquelle se rabattre.
    afficher('chargement');
    el('loading-text').textContent = textes.loading;
    let km, minutes, trace;
    try {
      const itineraire = await routeDistance(depart, arrivee);
      km = Math.round(itineraire.km * 10) / 10;
      minutes = itineraire.min;
      trace = itineraire.points;
    } catch (erreur) {
      echouer(messageDePanne(erreur));
      if (!(erreur instanceof MapServiceError)) console.error(erreur);
      return;
    }

    // Un aéroport affiche son forfait fixe si le client l'a communiqué ;
    // sinon aucun prix ne doit s'afficher (CDC §11.4), que le visiteur ait
    // tapé "Brussels Airport" ou une adresse dans l'enceinte de l'aéroport.
    const aeroport = airportAt(arrivee);
    const prixForfait = aeroport?.price ?? null;
    const prixAConfirmer = aeroport !== null && prixForfait === null;

    const heure = el('time').value;
    const heureDuTrajet = heure ? parseInt(heure.slice(0, 2), 10) : new Date().getHours();
    const tarif = estimateFare(km, ((heureDuTrajet % 24) + 24) % 24);

    remplirRecu({ depart, arrivee, km, minutes, tarif, prixForfait, prixAConfirmer });
    afficher('resultat');
    trackEvent('estimate_success');
    await afficherCarte(trace, `${depart.label} → ${arrivee.label}`);
  });

  function remplirRecu({ depart, arrivee, km, minutes, tarif, prixForfait, prixAConfirmer }) {
    el('route-label').textContent = `${depart.label} → ${arrivee.label}`;
    el('distance-label').textContent = prixAConfirmer
      ? textes.tbcDist
      : `${formatKm(km, locale)} · ~${minutes} min`;

    const total = prixForfait ?? tarif.total;
    const prix = el('price-label');
    prix.textContent = prixAConfirmer ? textes.tbcPrice : formatEuro(total, locale);
    prix.classList.toggle('is-tbc', prixAConfirmer);

    el('indicative-badge').textContent = prixForfait !== null ? textes.flatFare : textes.indicative;
    el('indicative-badge').hidden = prixAConfirmer;
    // La décomposition prise en charge + km ne vaut que pour le calcul au
    // compteur : un forfait aéroport n'a pas de détail à afficher.
    el('breakdown').hidden = prixAConfirmer || prixForfait !== null;
    el('tbc-note').hidden = !prixAConfirmer;
    el('line-pickup').textContent = formatEuro(tarif.breakdown.base, locale);
    el('line-km-label').textContent =
      `${formatKm(km, locale)} × ${formatEuro(FARE.perKmRate, locale)}`;
    el('line-km-cost').textContent = formatEuro(tarif.breakdown.distance, locale);
    el('line-night').hidden = !tarif.isNight;

    // Plus loin que la destination la plus lointaine que le client propose :
    // le prix reste affiché, mais une course pareille se convient au téléphone.
    // Un forfait aéroport a son propre prix fixe, quelle que soit la distance.
    el('long-distance-note').hidden = !(!prixAConfirmer && prixForfait === null && km > FURTHEST_PRESET_KM);

    const message = buildWhatsAppMessage({
      locale,
      form: {
        from: depart.label,
        destLabel: arrivee.label,
        date: el('date').value,
        time: el('time').value,
        pax: lirePassagers(),
        bags: lireBagages(),
        name: el('name').value,
        note: el('note').value,
      },
      fare: { total, isTbc: prixAConfirmer },
    });
    el('wa-message-preview').textContent = message;
    el('whatsapp-send').href = buildWhatsAppUrl(message);
  }

  // La carte est chargée seulement maintenant, et seulement si elle marche :
  // Leaflet, sa CSS et les tuiles arrivent après que le prix est à l'écran
  // (brief §7), et un échec laisse simplement la carte masquée — le prix et
  // le bouton d'appel doivent survivre (brief §5.3).
  async function afficherCarte(trace, legende) {
    const carte = el('route-map');
    const points = trace ?? [];
    if (points.length < 2) {
      carte.hidden = true;
      return;
    }
    try {
      const { showRoute } = await import('./route-map.js');
      // ATTENTION à l'ordre : il faut démasquer le conteneur AVANT de
      // dessiner. Un élément masqué mesure zéro pixel, et Leaflet cadre
      // alors l'itinéraire dans le vide.
      carte.hidden = false;
      carte.hidden = !(await showRoute(carte, points, legende));
    } catch {
      carte.hidden = true;
    }
  }

  el('recompute-btn').addEventListener('click', () => afficher(null));

  // --- arrivée depuis le bloc d'estimation de la page d'accueil --------
  // Ce bloc est un formulaire GET qui doit marcher sans JavaScript : il
  // envoie une adresse en texte libre et un identifiant de destination.
  const params = new URLSearchParams(window.location.search);
  const departDeLURL = params.get('from');
  const destinationDeLURL = params.get('dest');

  if (departDeLURL) {
    // Traité comme du texte tapé ici : tronqué, et non choisi tant qu'il ne
    // correspond pas à l'adresse par défaut. N'importe qui peut fabriquer
    // ce lien.
    const texte = departDeLURL.slice(0, MAX_CARACTERES_ADRESSE);
    fromInput.value = texte;
    if (texte !== BUSINESS.defaultPickup.label) champDepart.clear();
  }

  // L'identifiant est retrouvé dans notre liste de villes : c'est ce qui
  // permet au bloc d'accueil de continuer à fonctionner avec un champ libre.
  const villeConnue = destinationDeLURL
    ? DESTINATIONS.find((d) => d.id === destinationDeLURL && d.lat)
    : null;
  if (villeConnue) {
    champDestination.set({
      lat: villeConnue.lat,
      lon: villeConnue.lon,
      label: villeConnue[locale],
    });
    // On ne calcule tout de suite que si le point de départ est connu, pour
    // ne pas ouvrir la page sur une erreur que le visiteur n'a pas causée.
    if (champDepart.value) form.requestSubmit();
    else champDepart.prompt();
  }
}
