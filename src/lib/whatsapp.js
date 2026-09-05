// Compose le message WhatsApp pré-rempli et le lien wa.me.
//
// Le message est construit dans le navigateur et rien n'est envoyé : c'est
// le visiteur qui appuie sur "envoyer" dans WhatsApp. Le site n'a donc
// jamais connaissance de la demande.
import { BUSINESS } from '../config/business.js';
import { formatEuro } from './format.js';

function dmy(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function whenPhrase(locale, isoDate, time) {
  const date = dmy(isoDate);
  if (locale === 'fr') {
    if (isoDate) return `le ${date}` + (time ? ` à ${time}` : '');
    return time ? `aujourd'hui à ${time}` : 'dès que possible';
  }
  if (locale === 'nl') {
    if (isoDate) return `op ${date}` + (time ? ` om ${time}` : '');
    return time ? `vandaag om ${time}` : 'zo snel mogelijk';
  }
  if (isoDate) return `on ${date}` + (time ? ` at ${time}` : '');
  return time ? `today at ${time}` : 'as soon as possible';
}

/**
 * @param {object} params
 * @param {'nl'|'fr'|'en'} params.locale
 * @param {{ from: string, destLabel: string, date: string, time: string, pax: number|string, bags: number|string, name: string, note: string }} params.form
 * @param {{ total: number, isTbc: boolean }} params.fare
 */
export function buildWhatsAppMessage({ locale, form, fare }) {
  const when = whenPhrase(locale, form.date, form.time);
  const priceLine = fare.isTbc
    ? { fr: 'Merci de me confirmer le prix.', nl: 'Graag de prijs bevestigen.', en: 'Please confirm the price.' }[locale]
    : {
        fr: `Estimation vue sur le site : ${formatEuro(fare.total, 'fr')} (indicatif).`,
        nl: `Schatting op de site: ${formatEuro(fare.total, 'nl')} (indicatief).`,
        en: `Estimate from the website: ${formatEuro(fare.total, 'en')} (indicative).`,
      }[locale];

  if (locale === 'fr') {
    return (
      `Bonjour, je souhaite un taxi ${when}. ${form.from} → ${form.destLabel}. ` +
      `${form.pax} passager(s), ${form.bags} bagage(s).` +
      (form.name ? ` Nom : ${form.name}.` : '') +
      (form.note ? ` ${form.note}` : '') +
      ` ${priceLine}`
    );
  }
  if (locale === 'nl') {
    return (
      `Hallo, ik wil graag een taxi bestellen ${when}. ${form.from} → ${form.destLabel}. ` +
      `${form.pax} passagier(s), ${form.bags} stuk(s) bagage.` +
      (form.name ? ` Naam: ${form.name}.` : '') +
      (form.note ? ` ${form.note}` : '') +
      ` ${priceLine}`
    );
  }
  return (
    `Hello, I would like to book a taxi ${when}. ${form.from} → ${form.destLabel}. ` +
    `${form.pax} passenger(s), ${form.bags} bag(s).` +
    (form.name ? ` Name: ${form.name}.` : '') +
    (form.note ? ` ${form.note}` : '') +
    ` ${priceLine}`
  );
}

/** @param {string} message plain text, not yet encoded */
export function buildWhatsAppUrl(message) {
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_PLAIN_URL = `https://wa.me/${BUSINESS.whatsapp}`;
