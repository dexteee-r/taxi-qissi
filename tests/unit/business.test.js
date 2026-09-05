// Vérifie les informations de l'entreprise (src/config/business.js).
// Surtout : qu'aucune valeur [TO_BE_CONFIRMED] n'a été remplacée par une
// donnée inventée, et que téléphone et WhatsApp restent cohérents.
import { describe, it, expect } from 'vitest';
import { BUSINESS, FARE } from '../../src/config/business.js';

// brief §1.2: unconfirmed values must stay visible as markers, never be
// replaced by a plausible-looking one. These tests guard both directions:
// confirmed data must be well-formed, pending data must stay a marker.
describe('business configuration', () => {
  it('keeps the legally fixed identity of the entity', () => {
    expect(BUSINESS.legalName).toBe('Q.I.S.S SRL');
    expect(BUSINESS.vatNumber).toBe('BE1025231305');
    expect(BUSINESS.address).toEqual({
      street: 'Sint-Truidensesteenweg 234',
      postalCode: '3300',
      city: 'Tienen',
      country: 'BE',
    });
  });

  it('stores the phone in international form, usable in a tel: link', () => {
    expect(BUSINESS.phone).toMatch(/^\+32\d{9}$/);
    expect(BUSINESS.phoneDisplay).toBeTruthy();
    // The pretty and raw forms must be the same number.
    expect(BUSINESS.phoneDisplay.replace(/\D/g, '')).toBe(BUSINESS.phone.replace(/^\+32/, '0').replace(/\D/g, ''));
  });

  it('stores the WhatsApp number as digits only, no leading +', () => {
    expect(BUSINESS.whatsapp).toMatch(/^\d{11,}$/);
    expect(BUSINESS.whatsapp).toBe(BUSINESS.phone.replace('+', ''));
  });

  it('has a valid contact e-mail matching the domain', () => {
    expect(BUSINESS.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/);
    expect(BUSINESS.email.split('@')[1]).toBe(BUSINESS.domain);
  });

  it('still flags the IBP licence number as unconfirmed', () => {
    // If this ever fails because the client supplied the number, replace the
    // assertion with a format check — do not delete the guard.
    expect(BUSINESS.licenseNumber).toBe('[TO_BE_CONFIRMED]');
  });

  it('describes the served area as the CDC does (20 km around Tienen)', () => {
    expect(BUSINESS.serviceRadiusMeters).toBe(20000);
    expect(BUSINESS.servedMunicipalities.length).toBeGreaterThan(0);
    expect(BUSINESS.servedMunicipalities).toContain('Tienen');
    expect(new Set(BUSINESS.servedMunicipalities).size).toBe(BUSINESS.servedMunicipalities.length);
  });

  it('places the geo midpoint inside Belgium', () => {
    expect(BUSINESS.geoMidpoint.latitude).toBeGreaterThan(49.4);
    expect(BUSINESS.geoMidpoint.latitude).toBeLessThan(51.6);
    expect(BUSINESS.geoMidpoint.longitude).toBeGreaterThan(2.5);
    expect(BUSINESS.geoMidpoint.longitude).toBeLessThan(6.5);
  });
});

describe('tariff grid (client-supplied, CDC §4)', () => {
  it('matches the amounts the client gave', () => {
    expect(FARE.baseFare).toBe(4);
    expect(FARE.perKmRate).toBe(3);
    expect(FARE.nightSurcharge).toBe(3);
    expect(FARE.waitingRatePerHour).toBe(36);
    expect(FARE.nightStartHour).toBe(22);
    expect(FARE.nightEndHour).toBe(4);
    expect(FARE.currency).toBe('EUR');
  });
});
