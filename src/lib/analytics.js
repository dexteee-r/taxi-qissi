// Statistiques de visite, sans cookie.
//
// Deux outils reçoivent les mêmes événements, en parallèle :
// - Vercel Web Analytics : actif dès la mise en ligne (voir BaseLayout.astro),
//   aucune configuration à faire. C'est lui qui compte aujourd'hui.
// - Umami, prévu pour tourner sur notre propre serveur : ne charge que si
//   PUBLIC_UMAMI_SRC et PUBLIC_UMAMI_WEBSITE_ID sont renseignées dans .env.
//   Tant que l'instance n'existe pas, ces deux variables restent vides et
//   cette moitié ne fait rien.
//
// Les deux sont "sans cookie" ; Umami reste néanmoins celui que le brief
// demandait explicitement (auto-hébergé, aucune donnée qui parte vers un
// tiers). Vercel Analytics comble le trou en attendant que l'instance Umami
// soit montée — les deux peuvent tourner ensemble sans se gêner.
//
// NE JAMAIS transmettre le contenu du formulaire (adresses, nom, remarque) :
// seuls les noms d'événements ci-dessous circulent.
import { track as trackVercel } from '@vercel/analytics';

/** @typedef {'call_click'|'whatsapp_click'|'simulator_open'|'estimate_success'|'whatsapp_send'|'google_review_click'} EventName */

/** @param {EventName} nomEvenement */
export function trackEvent(nomEvenement) {
  if (typeof window === 'undefined') return;
  try {
    const umami = window.umami;
    if (umami && typeof umami.track === 'function') umami.track(nomEvenement);
  } catch {
    // Les statistiques ne doivent jamais casser la page.
  }
  try {
    trackVercel(nomEvenement);
  } catch {
    // Idem : ne jamais casser la page pour une histoire de statistiques.
  }
}
