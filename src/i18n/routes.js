// Single source of truth for the trilingual URL structure.
// brief_dev_taxi_qiss.md §4 / cdc_v1_taxi_qiss.md §5 — translated slugs,
// never an NL slug served under /fr/ or /en/.

export const LOCALES = /** @type {const} */ (['nl', 'fr', 'en']);
export const DEFAULT_LOCALE = 'nl';

export const LOCALE_NAMES = {
  nl: 'Nederlands',
  fr: 'Français',
  en: 'English',
};

/** @type {Record<string, Record<typeof LOCALES[number], string>>} */
export const ROUTES = {
  home: { nl: '', fr: '', en: '' },
  services: { nl: 'diensten', fr: 'services', en: 'services' },
  airport: { nl: 'luchthavenvervoer', fr: 'transport-aeroport', en: 'airport-transfer' },
  rates: { nl: 'tarieven', fr: 'tarifs', en: 'rates' },
  contact: { nl: 'contact', fr: 'contact', en: 'contact' },
  legal: { nl: 'juridische-info', fr: 'mentions-legales', en: 'legal-notice' },
  privacy: { nl: 'privacybeleid', fr: 'politique-confidentialite', en: 'privacy-policy' },
};

/**
 * @param {typeof LOCALES[number]} locale
 * @param {keyof typeof ROUTES} pageKey
 */
export function localePath(locale, pageKey) {
  const slug = ROUTES[pageKey][locale];
  return `/${locale}/${slug ? slug + '/' : ''}`;
}

/**
 * All locale variants of a page, for hreflang / language switcher.
 * @param {keyof typeof ROUTES} pageKey
 */
export function alternates(pageKey) {
  return LOCALES.map((locale) => ({ locale, href: localePath(locale, pageKey) }));
}
