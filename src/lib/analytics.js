// Statistiques de visite, sans cookie.
//
// Outil : Umami, hébergé sur notre propre serveur. Aucun cookie, aucune
// donnée personnelle, donc pas de bandeau de consentement à traduire trois
// fois. Pour en changer : le script dans BaseLayout.astro et l'appel ci-dessous.
//
// Branchement : PUBLIC_UMAMI_SRC et PUBLIC_UMAMI_WEBSITE_ID dans .env. Tant
// qu'elles sont vides, rien ne se charge et cette fonction ne fait rien.
//
// NE JAMAIS transmettre le contenu du formulaire (adresses, nom, remarque) :
// seuls les noms d'événements ci-dessous circulent.

/** @typedef {'call_click'|'whatsapp_click'|'simulator_open'|'estimate_success'|'whatsapp_send'} EventName */

/** @param {EventName} nomEvenement */
export function trackEvent(nomEvenement) {
  if (typeof window === 'undefined') return;
  try {
    const umami = window.umami;
    if (umami && typeof umami.track === 'function') umami.track(nomEvenement);
  } catch {
    // Les statistiques ne doivent jamais casser la page.
  }
}
