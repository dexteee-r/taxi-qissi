// Rassemble les trois fichiers de langue.
//
// Pour modifier un texte, ouvre le fichier de la langue concernée
// (fr.js, nl.js ou en.js) — pas celui-ci.
import { fr } from './fr.js';
import { nl } from './nl.js';
import { en } from './en.js';

export const dictionary = { fr, nl, en };

/**
 * Tous les textes d'une langue.
 * @param {'nl' | 'fr' | 'en'} locale
 */
export function t(locale) {
  return dictionary[locale];
}
