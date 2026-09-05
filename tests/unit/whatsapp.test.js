// Vérifie le message WhatsApp pré-rempli (src/lib/whatsapp.js) : contenu,
// traduction et encodage du lien.
import { describe, it, expect } from 'vitest';
import { buildWhatsAppMessage, buildWhatsAppUrl, WHATSAPP_PLAIN_URL } from '../../src/lib/whatsapp.js';
import { BUSINESS } from '../../src/config/business.js';

const baseForm = {
  from: 'Grote Markt, Tienen',
  destLabel: 'Leuven',
  date: '2026-09-12',
  time: '15:30',
  pax: 2,
  bags: 1,
  name: 'Jan Peeters',
  note: '',
};

describe('buildWhatsAppMessage', () => {
  it('écrit une information par ligne, avec son étiquette', () => {
    const msg = buildWhatsAppMessage({
      locale: 'nl',
      form: baseForm,
      fare: { total: 64, isTbc: false },
    });
    expect(msg).toBe(
      [
        'Hallo, ik wil graag een taxi bestellen.',
        '',
        'Vertrek: Grote Markt, Tienen',
        'Bestemming: Leuven',
        'Wanneer: 12/09/2026 om 15:30',
        'Passagiers: 2',
        'Bagage: 1',
        'Naam: Jan Peeters',
        '',
        'Schatting op de site: 64 € (indicatief)',
      ].join('\n')
    );
  });

  it("n'écrit pas de ligne pour un champ laissé vide", () => {
    // Une ligne "Opmerking:" vide ferait croire à une information perdue.
    const msg = buildWhatsAppMessage({
      locale: 'fr',
      form: { ...baseForm, name: '', note: '' },
      fare: { total: 64, isTbc: false },
    });
    expect(msg).not.toContain('Nom');
    expect(msg).not.toContain('Remarque');
    expect(msg).toContain('Passagers : 2');
  });

  it('ajoute la remarque du client quand elle est remplie', () => {
    const msg = buildWhatsAppMessage({
      locale: 'fr',
      form: { ...baseForm, note: 'Vol SN2104' },
      fare: { total: 64, isTbc: false },
    });
    expect(msg).toContain('Remarque : Vol SN2104');
  });

  it('writes the amount the Belgian way, with a comma for cents', () => {
    const fare = { total: 42.1, isTbc: false };
    expect(buildWhatsAppMessage({ locale: 'nl', form: baseForm, fare })).toContain('42,10 €');
    expect(buildWhatsAppMessage({ locale: 'fr', form: baseForm, fare })).toContain('42,10 €');
    expect(buildWhatsAppMessage({ locale: 'en', form: baseForm, fare })).toContain('€42.10');
  });

  it('traduit les étiquettes en FR et en EN', () => {
    const fr = buildWhatsAppMessage({ locale: 'fr', form: baseForm, fare: { total: 64, isTbc: false } });
    expect(fr).toContain('Départ : Grote Markt, Tienen');
    expect(fr).toContain('Quand : le 12/09/2026 à 15:30');
    // Etiquette au pluriel et valeur chiffrée : plus de "passager(s)".
    expect(fr).toContain('Passagers : 2');
    expect(fr).toContain('Bagages : 1');
    expect(fr).not.toContain('(s)');
    expect(fr).toContain('Estimation vue sur le site : 64 € (indicatif)');

    const en = buildWhatsAppMessage({ locale: 'en', form: baseForm, fare: { total: 64, isTbc: false } });
    expect(en).toContain('Pickup: Grote Markt, Tienen');
    expect(en).toContain('When: 12/09/2026 at 15:30');
    expect(en).toContain('Estimate from the website: €64 (indicative)');
    expect(en).not.toContain('(s)');
  });

  it('always carries the "indicative" wording with a price (CDC §4 rule 2)', () => {
    for (const locale of /** @type {const} */ (['nl', 'fr', 'en'])) {
      const msg = buildWhatsAppMessage({ locale, form: baseForm, fare: { total: 42.5, isTbc: false } });
      expect(msg.toLowerCase()).toMatch(/indicatief|indicatif|indicative/);
    }
  });

  it('asks for confirmation instead of quoting a price for unconfirmed airport fares', () => {
    const nl = buildWhatsAppMessage({ locale: 'nl', form: baseForm, fare: { total: 139, isTbc: true } });
    expect(nl).toContain('Graag de prijs bevestigen.');
    expect(nl).not.toContain('139');

    const fr = buildWhatsAppMessage({ locale: 'fr', form: baseForm, fare: { total: 139, isTbc: true } });
    expect(fr).toContain('Merci de me confirmer le prix.');
    expect(fr).not.toContain('139');
  });

  it('falls back to "as soon as possible" when no date or time is given', () => {
    const form = { ...baseForm, date: '', time: '' };
    expect(buildWhatsAppMessage({ locale: 'nl', form, fare: { total: 34, isTbc: false } })).toContain('zo snel mogelijk');
    expect(buildWhatsAppMessage({ locale: 'fr', form, fare: { total: 34, isTbc: false } })).toContain('dès que possible');
    expect(buildWhatsAppMessage({ locale: 'en', form, fare: { total: 34, isTbc: false } })).toContain('as soon as possible');
  });

  it('says "today at HH:MM" when only a time is given', () => {
    const form = { ...baseForm, date: '' };
    expect(buildWhatsAppMessage({ locale: 'nl', form, fare: { total: 34, isTbc: false } })).toContain('vandaag om 15:30');
    expect(buildWhatsAppMessage({ locale: 'fr', form, fare: { total: 34, isTbc: false } })).toContain("aujourd'hui à 15:30");
  });

  it('omits optional fields that are empty', () => {
    const form = { ...baseForm, name: '', note: '' };
    const msg = buildWhatsAppMessage({ locale: 'nl', form, fare: { total: 34, isTbc: false } });
    expect(msg).not.toContain('Naam:');
    expect(msg).not.toContain('undefined');
  });

  it('includes a free-text note when present', () => {
    const form = { ...baseForm, note: 'Vlucht SN2104, kinderzitje' };
    const msg = buildWhatsAppMessage({ locale: 'nl', form, fare: { total: 34, isTbc: false } });
    expect(msg).toContain('Vlucht SN2104, kinderzitje');
  });
});

describe('buildWhatsAppUrl', () => {
  it('targets the configured business number', () => {
    expect(buildWhatsAppUrl('hoi')).toBe(`https://wa.me/${BUSINESS.whatsapp}?text=hoi`);
    expect(WHATSAPP_PLAIN_URL).toBe(`https://wa.me/${BUSINESS.whatsapp}`);
  });

  it('percent-encodes accents, arrows and line breaks (iOS/Android safe)', () => {
    const url = buildWhatsAppUrl('Où ? Tienen → Liège\nJa');
    expect(url).toContain('O%C3%B9'); // ù
    expect(url).toContain('%E2%86%92'); // →
    expect(url).toContain('%0A'); // newline
    expect(url).not.toMatch(/[\s→]/);
  });

  it('round-trips through decodeURIComponent unchanged', () => {
    const msg = buildWhatsAppMessage({
      locale: 'fr',
      form: { ...baseForm, note: 'Aéroport — siège enfant' },
      fare: { total: 64, isTbc: false },
    });
    const encoded = buildWhatsAppUrl(msg).split('?text=')[1];
    expect(decodeURIComponent(encoded)).toBe(msg);
  });
});
