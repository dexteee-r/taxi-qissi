// Les titres et descriptions affichés par Google (src/i18n/seo.js), et la FAQ
// de la page Tarifs (src/data/faqs.js). Textes validés le 2026-10-19.
import { describe, it, expect } from 'vitest';
import { seo } from '../../src/i18n/seo.js';
import { FAQS_RATES } from '../../src/data/faqs.js';
import { FARE } from '../../src/config/business.js';
import { formatEuro } from '../../src/lib/format.js';

const LOCALES = ['nl', 'fr', 'en'];
// Les pages commerciales : celles où un clic vers l'appel compte. Mentions
// légales et confidentialité gardent un titre sobre.
const COMMERCIALES = ['home', 'services', 'airport', 'rates', 'contact'];

describe('titres et descriptions', () => {
  it('tiennent dans les limites de Google (titre 60, description 155)', () => {
    for (const locale of LOCALES) {
      for (const [page, meta] of Object.entries(seo[locale])) {
        expect(meta.title.length, `${locale}.${page} title`).toBeLessThanOrEqual(60);
        expect(meta.description.length, `${locale}.${page} description`).toBeLessThanOrEqual(155);
      }
    }
  });

  it('mettent le mot-clé en tête et la marque à la fin sur les pages commerciales', () => {
    for (const locale of LOCALES) {
      for (const page of COMMERCIALES) {
        const { title } = seo[locale][page];
        expect(title, `${locale}.${page}`).toContain('Tienen');
        expect(title.startsWith('Taxi QISSI'), `${locale}.${page} commence par la marque`).toBe(false);
        expect(title.endsWith('— Taxi QISSI'), `${locale}.${page} finit par la marque`).toBe(true);
      }
    }
  });

  it('proposent un appel à l\'action sur les pages commerciales', () => {
    const appel = /Appelez|Bel |Call|WhatsApp/;
    for (const locale of LOCALES) {
      for (const page of COMMERCIALES) {
        expect(seo[locale][page].description, `${locale}.${page}`).toMatch(appel);
      }
    }
  });
});

describe('FAQ de la page Tarifs', () => {
  it('a 4 questions dans chaque langue, toutes répondues', () => {
    for (const locale of LOCALES) {
      expect(FAQS_RATES[locale], locale).toHaveLength(4);
      for (const { q, a } of FAQS_RATES[locale]) {
        expect(q.length).toBeGreaterThan(10);
        expect(a.length).toBeGreaterThan(10);
      }
    }
  });

  it('reprend les tarifs de la grille, pas des chiffres recopiés à la main', () => {
    for (const locale of LOCALES) {
      const [prix, attente] = FAQS_RATES[locale];
      for (const montant of [FARE.baseFare, FARE.perKmRate, FARE.nightSurcharge]) {
        expect(prix.a, `${locale} prix`).toContain(formatEuro(montant, locale));
      }
      expect(attente.a, `${locale} attente`).toContain(formatEuro(FARE.waitingRatePerHour, locale));
    }
  });

  it('nomme la gare de Tienen', () => {
    expect(FAQS_RATES.fr[3].q).toContain('gare de Tienen');
    expect(FAQS_RATES.nl[3].q).toContain('station van Tienen');
    expect(FAQS_RATES.en[3].q).toContain('Tienen station');
  });
});
