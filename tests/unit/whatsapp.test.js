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
  it('builds the NL message in the prototype’s sentence form', () => {
    const msg = buildWhatsAppMessage({
      locale: 'nl',
      form: baseForm,
      fare: { total: 64, isTbc: false },
    });
    expect(msg).toBe(
      'Hallo, ik wil graag een taxi bestellen op 12/09/2026 om 15:30. ' +
        'Grote Markt, Tienen → Leuven. 2 passagier(s), 1 stuk(s) bagage. ' +
        'Naam: Jan Peeters. Schatting op de site: 64.00 € (indicatief).'
    );
  });

  it('builds the FR and EN variants', () => {
    const fr = buildWhatsAppMessage({ locale: 'fr', form: baseForm, fare: { total: 64, isTbc: false } });
    expect(fr).toContain('Bonjour, je souhaite un taxi le 12/09/2026 à 15:30.');
    expect(fr).toContain('2 passager(s), 1 bagage(s).');
    expect(fr).toContain('Estimation vue sur le site : 64.00 € (indicatif).');

    const en = buildWhatsAppMessage({ locale: 'en', form: baseForm, fare: { total: 64, isTbc: false } });
    expect(en).toContain('Hello, I would like to book a taxi on 12/09/2026 at 15:30.');
    expect(en).toContain('Estimate from the website: €64.00 (indicative).');
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
