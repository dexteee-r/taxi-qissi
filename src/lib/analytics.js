// Cookie-less analytics (brief §8 / CDC §10.2 — no tracking cookie, so no
// consent banner to translate three times).
//
// Provider: Umami (https://umami.is), self-hosted alongside the site on the
// homelab. Chosen because it is free, open-source, sets no cookies, stores
// no personal data and needs no consent banner under GDPR — and because
// self-hosting keeps visitor data on the same box as the site instead of
// sending it to a third party. Swapping it for Plausible CE or GoatCounter
// means changing the script tag in BaseLayout.astro and the one call below.
//
// Wiring: set PUBLIC_UMAMI_SRC and PUBLIC_UMAMI_WEBSITE_ID in .env. With
// them unset (dev, or before the analytics box is up) nothing loads and
// every call here is a no-op.
//
// NEVER pass form data (addresses, name, note) as an event property — the
// events below are anonymous names only.

/** @typedef {'call_click'|'whatsapp_click'|'simulator_open'|'estimate_success'|'whatsapp_send'} EventName */

/** @param {EventName} eventName */
export function trackEvent(eventName) {
  if (typeof window === 'undefined') return;
  try {
    const umami = /** @type {any} */ (window).umami;
    if (umami && typeof umami.track === 'function') {
      umami.track(eventName);
    }
  } catch {
    // Analytics must never break the page.
  }
}
