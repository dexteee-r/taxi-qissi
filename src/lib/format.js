// Affichage des nombres selon la langue.
//
// En Belgique la virgule sépare les décimales : écrire "64.00 €" sur les
// pages NL et FR fait amateur. Et les centimes ne s'affichent que s'il y en
// a vraiment — "64 €" plutôt que "64,00 €".

const LOCALE_TAGS = { nl: 'nl-BE', fr: 'fr-BE', en: 'en-GB' };

function tagFor(locale) {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS.nl;
}

/**
 * "64 €" / "42,10 €" en NL et FR, "€64" / "€42.10" en EN.
 * @param {number} amount
 * @param {'nl'|'fr'|'en'} locale
 */
export function formatEuro(amount, locale) {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  const number = new Intl.NumberFormat(tagFor(locale), {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  // L'anglais met le symbole devant, le français et le néerlandais derrière.
  return locale === 'en' ? `€${number}` : `${number} €`;
}

/**
 * "20 km" / "12,7 km" — même règle de virgule décimale.
 * @param {number} km
 * @param {'nl'|'fr'|'en'} locale
 */
export function formatKm(km, locale) {
  const number = new Intl.NumberFormat(tagFor(locale), {
    maximumFractionDigits: 1,
  }).format(km);
  return `${number} km`;
}
