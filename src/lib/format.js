// Locale-aware number formatting (CDC §5 rule 7: "formats localisés").
//
// Belgium uses a comma as the decimal separator, so `toFixed(2)` produced
// "64.00 €" on the NL and FR pages, which reads as broken to a local
// visitor. The prototype showed whole amounts ("64 €"), so cents are only
// shown when there actually are any — which happens for the "other address"
// route, where the distance comes back fractional.

const LOCALE_TAGS = { nl: 'nl-BE', fr: 'fr-BE', en: 'en-GB' };

function tagFor(locale) {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS.nl;
}

/**
 * "64 €" / "42,10 €" in NL and FR, "€64" / "€42.10" in EN.
 * @param {number} amount
 * @param {'nl'|'fr'|'en'} locale
 */
export function formatEuro(amount, locale) {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  const number = new Intl.NumberFormat(tagFor(locale), {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  // English puts the symbol first; French and Dutch put it after the amount.
  return locale === 'en' ? `€${number}` : `${number} €`;
}

/**
 * "20 km" / "12,7 km" — same decimal-separator rule as above.
 * @param {number} km
 * @param {'nl'|'fr'|'en'} locale
 */
export function formatKm(km, locale) {
  const number = new Intl.NumberFormat(tagFor(locale), {
    maximumFractionDigits: 1,
  }).format(km);
  return `${number} km`;
}
