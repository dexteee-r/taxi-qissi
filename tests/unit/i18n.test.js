// Vérifie les trois langues : mêmes clés partout, adresses traduites, et
// aucune page qui manquerait dans une langue.
import { describe, it, expect } from 'vitest';
import { LOCALES, DEFAULT_LOCALE, ROUTES, localePath, alternates, LOCALE_NAMES } from '../../src/i18n/routes.js';
import { dictionary } from '../../src/i18n/dictionary.js';
import { seo } from '../../src/i18n/seo.js';
import { SERVICES } from '../../src/data/services.js';
import { FAQS } from '../../src/data/faqs.js';
import { LEGAL } from '../../src/data/legal.js';
import { DESTINATIONS, AIRPORT_IDS } from '../../src/data/destinations.js';

describe('trilingual routing (CDC §5)', () => {
  it('serves three locales with NL as the default', () => {
    expect([...LOCALES]).toEqual(['nl', 'fr', 'en']);
    expect(DEFAULT_LOCALE).toBe('nl');
  });

  it('covers the seven pages of the CDC arborescence', () => {
    expect(Object.keys(ROUTES).sort()).toEqual(
      ['airport', 'contact', 'home', 'legal', 'privacy', 'rates', 'services'].sort()
    );
  });

  it('builds 21 unique, locale-prefixed, trailing-slash URLs', () => {
    const urls = Object.keys(ROUTES).flatMap((key) => LOCALES.map((l) => localePath(l, key)));
    expect(urls).toHaveLength(21);
    expect(new Set(urls).size).toBe(21);
    for (const url of urls) {
      expect(url).toMatch(/^\/(nl|fr|en)\/([a-z-]+\/)?$/);
    }
  });

  it('never serves an NL slug under /fr/ or /en/ (CDC §5 rule 1)', () => {
    for (const [key, slugs] of Object.entries(ROUTES)) {
      if (key === 'home' || key === 'contact') continue; // intentionally identical
      expect(slugs.fr, key).not.toBe(slugs.nl);
      expect(slugs.en, key).not.toBe(slugs.nl);
    }
  });

  it('uses the exact slugs the CDC specifies', () => {
    expect(ROUTES.services).toEqual({ nl: 'diensten', fr: 'services', en: 'services' });
    expect(ROUTES.airport).toEqual({ nl: 'luchthavenvervoer', fr: 'transport-aeroport', en: 'airport-transfer' });
    expect(ROUTES.rates).toEqual({ nl: 'tarieven', fr: 'tarifs', en: 'rates' });
    expect(ROUTES.legal).toEqual({ nl: 'juridische-info', fr: 'mentions-legales', en: 'legal-notice' });
    expect(ROUTES.privacy).toEqual({ nl: 'privacybeleid', fr: 'politique-confidentialite', en: 'privacy-policy' });
  });

  it('produces reciprocal alternates for every page', () => {
    for (const key of Object.keys(ROUTES)) {
      const alts = alternates(key);
      expect(alts.map((a) => a.locale)).toEqual(['nl', 'fr', 'en']);
      for (const alt of alts) {
        expect(alt.href).toBe(localePath(alt.locale, key));
      }
    }
  });

  it('names languages in full, never by flag or code (CDC §5 rule 3)', () => {
    expect(LOCALE_NAMES).toEqual({ nl: 'Nederlands', fr: 'Français', en: 'English' });
  });
});

describe('translation completeness', () => {
  it('defines the same UI keys in all three locales', () => {
    const nlKeys = Object.keys(dictionary.nl).sort();
    expect(Object.keys(dictionary.fr).sort()).toEqual(nlKeys);
    expect(Object.keys(dictionary.en).sort()).toEqual(nlKeys);
  });

  it('leaves no UI string empty', () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(dictionary[locale])) {
        expect(typeof value, `${locale}.${key}`).toBe('string');
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('has title and description metadata for every page in every locale', () => {
    for (const locale of LOCALES) {
      for (const key of Object.keys(ROUTES)) {
        expect(seo[locale][key], `${locale}.${key}`).toBeDefined();
        expect(seo[locale][key].title.length).toBeGreaterThan(10);
        expect(seo[locale][key].description.length).toBeGreaterThan(30);
      }
    }
  });

  it('gives every page a unique title and description per locale (brief §6)', () => {
    for (const locale of LOCALES) {
      const titles = Object.values(seo[locale]).map((m) => m.title);
      const descriptions = Object.values(seo[locale]).map((m) => m.description);
      expect(new Set(titles).size).toBe(titles.length);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    }
  });

  it('translates the five services and seven FAQ entries into all locales', () => {
    for (const locale of LOCALES) {
      expect(SERVICES[locale]).toHaveLength(5);
      expect(FAQS[locale]).toHaveLength(8);
      for (const svc of SERVICES[locale]) {
        expect(svc.title.length).toBeGreaterThan(0);
        expect(svc.desc.length).toBeGreaterThan(0);
        expect(svc.long.length).toBeGreaterThan(0);
      }
      for (const faq of FAQS[locale]) {
        expect(faq.q.length).toBeGreaterThan(0);
        expect(faq.a.length).toBeGreaterThan(0);
      }
    }
  });

  it('has legal + privacy copy in all locales, with the mandatory disclosures', () => {
    for (const locale of LOCALES) {
      const { juridisch, privacy } = LEGAL[locale];
      for (const doc of [juridisch, privacy]) {
        for (const field of ['title', 'h1', 'p1', 'h2', 'p2', 'h3', 'p3']) {
          expect(doc[field], `${locale}.${field}`).toBeTruthy();
        }
      }
      // CDC §10.2: the mapping provider and the WhatsApp channel must be disclosed.
      expect(privacy.p1).toContain('OpenRouteService');
      expect(privacy.p2).toContain('Umami');
    }
  });

  it('names every destination in all three locales', () => {
    for (const dest of DESTINATIONS) {
      for (const locale of LOCALES) {
        expect(dest[locale], `${dest.id}.${locale}`).toBeTruthy();
      }
    }
  });
});

describe('destinations dataset', () => {
  it('keeps every airport fare traceable to a client confirmation, never invented (CDC §3)', () => {
    const confirmed = { zav: 130, cri: 150, lgg: 160, maa: 240, ein: 320 };
    for (const id of AIRPORT_IDS) {
      const airport = DESTINATIONS.find((d) => d.id === id);
      expect(airport, id).toBeDefined();
      expect(airport.price, id).toBe(confirmed[id]);
    }
  });

  it('gives every destination a positive distance and duration', () => {
    // Plus d'entree "Autre adresse" depuis que le champ est libre : une
    // destination sans distance n'aurait plus rien pour l'alimenter.
    for (const dest of DESTINATIONS) {
      expect(dest.km, dest.id).toBeGreaterThan(0);
      expect(dest.min, dest.id).toBeGreaterThan(0);
    }
  });

  it('uses unique ids', () => {
    const ids = DESTINATIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
