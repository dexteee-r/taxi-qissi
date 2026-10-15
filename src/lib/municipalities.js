// Affichage et recherche des communes desservies, dans la langue de la page.
//
// Chaque commune a un nom néerlandais et un nom français (souvent identiques,
// voir src/config/business.js). La page affiche le nom de sa propre langue,
// puis l'autre entre parenthèses quand il diffère : les deux formes sont
// ainsi dans le texte, lisibles par un visiteur comme par un moteur de
// recherche (« taxi Tirlemont » et « taxi Tienen » mènent au même endroit).
// L'anglais suit le néerlandais, nom officiel local de la plupart des communes.

/** @typedef {{ nl: string, fr: string }} Commune */

/** @param {Commune} commune @param {'nl'|'fr'|'en'} locale */
export function primaryName(commune, locale) {
  return locale === 'fr' ? commune.fr : commune.nl;
}

/** Le nom dans l'autre langue, ou null s'il est identique. */
export function alternateName(commune, locale) {
  const autre = locale === 'fr' ? commune.nl : commune.fr;
  return autre !== primaryName(commune, locale) ? autre : null;
}

/** « Tirlemont (Tienen) » sur la page FR, « Tienen (Tirlemont) » ailleurs. */
export function communeLabel(commune, locale) {
  const alt = alternateName(commune, locale);
  return alt ? `${primaryName(commune, locale)} (${alt})` : primaryName(commune, locale);
}

// Minuscules, sans accents ni ponctuation : « Saint-Trond » et « saint trond »
// doivent se valoir.
export function normalize(texte) {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

/**
 * La commune que le visiteur est en train de taper, dans n'importe laquelle
 * de ses deux formes : un début de nom est préféré à un simple fragment.
 *
 * @param {Commune[]} communes
 * @param {string} saisie
 * @returns {Commune | null}
 */
export function findCommune(communes, saisie) {
  const q = normalize(saisie);
  if (!q) return null;
  const noms = (c) => [normalize(c.nl), normalize(c.fr)];
  return (
    communes.find((c) => noms(c).some((n) => n.indexOf(q) === 0)) ??
    communes.find((c) => noms(c).some((n) => n.indexOf(q) >= 0)) ??
    null
  );
}
