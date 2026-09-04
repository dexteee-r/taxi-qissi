// Builds the pre-filled WhatsApp message and wa.me URL — entirely
// client-side, nothing here ever reaches a server (brief §1.1 / CDC §7.2).
import { BUSINESS } from '../config/business.js';

const LOCALE_TAGS = { nl: 'nl-BE', fr: 'fr-BE', en: 'en-GB' };

/**
 * @param {'nl'|'fr'|'en'} locale
 * @param {string} isoDate e.g. "2026-09-12"
 */
export function formatDate(locale, isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale] ?? 'nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * @param {object} params
 * @param {'nl'|'fr'|'en'} params.locale
 * @param {import('../i18n/dictionary.js').dictionary['nl']['simulator']['whatsappMessage']} params.labels
 * @param {{ pickup: string, dropoff: string, date: string, time: string, passengers: string|number, luggage: string|number, name: string, note: string }} params.form
 * @param {number} params.estimateTotal
 * @param {string} params.indicativeLabel
 */
export function buildWhatsAppMessage({ locale, labels, form, estimateTotal, indicativeLabel }) {
  const lines = [
    labels.title,
    `${labels.from}: ${form.pickup}`,
    `${labels.to}: ${form.dropoff}`,
    `${labels.date}: ${formatDate(locale, form.date)} ${labels.on} ${form.time}`,
    `${labels.passengers}: ${form.passengers}${form.luggage ? ` — ${labels.luggage}: ${form.luggage}` : ''}`,
    `${labels.name}: ${form.name}`,
  ];
  if (form.note) {
    lines.push(`${labels.note}: ${form.note}`);
  }
  lines.push(`${labels.estimate}: € ${estimateTotal.toFixed(2)} (${indicativeLabel})`);
  return lines.join('\n');
}

/**
 * @param {string} message plain text, not yet encoded
 * @returns {string|null} wa.me URL, or null if BUSINESS.whatsapp is not yet configured
 */
export function buildWhatsAppUrl(message) {
  if (!BUSINESS.whatsapp || BUSINESS.whatsapp === '[TO_BE_CONFIRMED]') {
    return null;
  }
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
}
