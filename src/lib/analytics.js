// Cookie-less analytics abstraction (brief §8 / CDC §10.2 — no tracking
// cookie, so no consent banner to translate three times). No-ops until a
// provider is wired up in index.html/BaseLayout. Never pass form data
// (addresses, name, note) as an event property — anonymous event names only.
//
// Swap the provider by loading it in BaseLayout.astro and, if it doesn't use
// `window.plausible`, adjusting the call below. Suggested self-hosted option
// consistent with the homelab: Plausible or Umami.

/** @param {'call_click'|'whatsapp_click'|'simulator_open'|'estimate_success'|'whatsapp_send'} eventName */
export function trackEvent(eventName) {
  if (typeof window === 'undefined') return;
  try {
    // @ts-ignore — injected by the analytics script tag, if configured
    if (typeof window.plausible === 'function') {
      // @ts-ignore
      window.plausible(eventName);
    }
  } catch {
    // Analytics must never break the page.
  }
}
