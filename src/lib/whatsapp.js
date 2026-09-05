// Compose le message WhatsApp pré-rempli et le lien wa.me.
//
// Le message est construit dans le navigateur et rien n'est envoyé : c'est
// le visiteur qui appuie sur "envoyer" dans WhatsApp. Le site n'a donc
// jamais connaissance de la demande.
//
// Format : une information par ligne, avec son étiquette. Le chauffeur lit
// ça sur son téléphone, souvent en travaillant : il doit trouver l'adresse
// sans lire une phrase en entier.
import { BUSINESS } from '../config/business.js';
import { formatEuro } from './format.js';

// Les étiquettes sont au pluriel et la valeur est un simple nombre
// ("Passagers : 1") : ça évite les "passager(s)" disgracieux.
const LIBELLES = {
  fr: {
    separateur: ' : ',
    intro: 'Bonjour, je voudrais réserver un taxi.',
    depart: 'Départ',
    destination: 'Destination',
    quand: 'Quand',
    passagers: 'Passagers',
    bagages: 'Bagages',
    nom: 'Nom',
    remarque: 'Remarque',
    estimation: (prix) => `Estimation vue sur le site : ${prix} (indicatif)`,
    aConfirmer: 'Merci de me confirmer le prix.',
  },
  nl: {
    separateur: ': ',
    intro: 'Hallo, ik wil graag een taxi bestellen.',
    depart: 'Vertrek',
    destination: 'Bestemming',
    quand: 'Wanneer',
    passagers: 'Passagiers',
    bagages: 'Bagage',
    nom: 'Naam',
    remarque: 'Opmerking',
    estimation: (prix) => `Schatting op de site: ${prix} (indicatief)`,
    aConfirmer: 'Graag de prijs bevestigen.',
  },
  en: {
    separateur: ': ',
    intro: 'Hello, I would like to book a taxi.',
    depart: 'Pickup',
    destination: 'Destination',
    quand: 'When',
    passagers: 'Passengers',
    bagages: 'Luggage',
    nom: 'Name',
    remarque: 'Note',
    estimation: (prix) => `Estimate from the website: ${prix} (indicative)`,
    aConfirmer: 'Please confirm the price.',
  },
};

/** "2026-09-06" devient "06/09/2026". */
function enJourMoisAnnee(dateIso) {
  if (!dateIso) return '';
  const [annee, mois, jour] = dateIso.split('-');
  return `${jour}/${mois}/${annee}`;
}

/** Le moment de la course, en toutes lettres. */
function quandPhrase(locale, dateIso, heure) {
  const date = enJourMoisAnnee(dateIso);
  if (locale === 'fr') {
    if (dateIso) return `le ${date}` + (heure ? ` à ${heure}` : '');
    return heure ? `aujourd'hui à ${heure}` : 'dès que possible';
  }
  if (locale === 'nl') {
    if (dateIso) return date + (heure ? ` om ${heure}` : '');
    return heure ? `vandaag om ${heure}` : 'zo snel mogelijk';
  }
  if (dateIso) return date + (heure ? ` at ${heure}` : '');
  return heure ? `today at ${heure}` : 'as soon as possible';
}

/**
 * Le message pré-rempli, prêt à être envoyé par le visiteur.
 *
 * @param {object} params
 * @param {'nl'|'fr'|'en'} params.locale
 * @param {{ from: string, destLabel: string, date: string, time: string, pax: number|string, bags: number|string, name: string, note: string }} params.form
 * @param {{ total: number, isTbc: boolean }} params.fare
 */
export function buildWhatsAppMessage({ locale, form, fare }) {
  const mots = LIBELLES[locale] ?? LIBELLES.nl;
  const ligne = (etiquette, valeur) => `${etiquette}${mots.separateur}${valeur}`;

  const lignes = [
    ligne(mots.depart, form.from),
    ligne(mots.destination, form.destLabel),
    ligne(mots.quand, quandPhrase(locale, form.date, form.time)),
    ligne(mots.passagers, form.pax),
    ligne(mots.bagages, form.bags),
  ];
  // Nom et remarque ne s'affichent que s'ils ont été remplis : une ligne
  // "Remarque :" vide ferait croire à une information perdue.
  if (form.name) lignes.push(ligne(mots.nom, form.name));
  if (form.note) lignes.push(ligne(mots.remarque, form.note));

  const prix = fare.isTbc ? mots.aConfirmer : mots.estimation(formatEuro(fare.total, locale));

  // Lignes séparées par des retours à la ligne : WhatsApp les conserve.
  return `${mots.intro}\n\n${lignes.join('\n')}\n\n${prix}`;
}

/** @param {string} message texte brut, pas encore encodé */
export function buildWhatsAppUrl(message) {
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_PLAIN_URL = `https://wa.me/${BUSINESS.whatsapp}`;
