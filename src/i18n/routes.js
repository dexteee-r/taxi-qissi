// La structure des adresses du site, dans les trois langues.
//
// C'est le seul endroit qui décide des URL : le menu, le sélecteur de
// langue, le plan du site et les balises hreflang lisent tous ce fichier.
// Chaque langue a ses propres mots dans l'adresse — jamais un mot
// néerlandais sous /fr/.

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
 * L'adresse d'une page dans une langue. Exemple : ('fr', 'rates') donne
 * "/fr/tarifs/".
 * @param {typeof LOCALES[number]} locale
 * @param {keyof typeof ROUTES} pageKey
 */
export function localePath(locale, pageKey) {
  const slug = ROUTES[pageKey][locale];
  return `/${locale}/${slug ? slug + '/' : ''}`;
}

/**
 * La même page dans les trois langues, pour le sélecteur de langue et les
 * balises hreflang.
 * @param {keyof typeof ROUTES} pageKey
 */
export function alternates(pageKey) {
  return LOCALES.map((locale) => ({ locale, href: localePath(locale, pageKey) }));
}
