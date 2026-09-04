import { describe, it, expect } from 'vitest';
import { formatEuro, formatKm } from '../../src/lib/format.js';

// CDC §5 rule 7: localized formats. Belgium writes 64,00 € — showing
// "64.00 €" on the NL/FR pages reads as broken to a local visitor.
describe('formatEuro', () => {
  it('uses a comma and a trailing symbol in NL and FR', () => {
    expect(formatEuro(42.1, 'fr')).toBe('42,10 €');
    expect(formatEuro(42.1, 'nl')).toBe('42,10 €');
  });

  it('uses a point and a leading symbol in EN', () => {
    expect(formatEuro(42.1, 'en')).toBe('€42.10');
  });

  it('drops the cents on whole amounts, as the prototype does', () => {
    expect(formatEuro(64, 'fr')).toBe('64 €');
    expect(formatEuro(64, 'nl')).toBe('64 €');
    expect(formatEuro(64, 'en')).toBe('€64');
    expect(formatEuro(4, 'fr')).toBe('4 €');
  });

  it('keeps two decimals for real cent amounts', () => {
    expect(formatEuro(42.05, 'fr')).toBe('42,05 €');
    expect(formatEuro(139.5, 'nl')).toBe('139,50 €');
  });

  it('never shows a floating-point artefact', () => {
    // 4 + 12.7 * 3 = 42.099999999999994 before rounding
    expect(formatEuro(4 + 12.7 * 3, 'fr')).toBe('42,10 €');
  });
});

describe('formatKm', () => {
  it('localizes the decimal separator', () => {
    expect(formatKm(12.7, 'fr')).toBe('12,7 km');
    expect(formatKm(12.7, 'nl')).toBe('12,7 km');
    expect(formatKm(12.7, 'en')).toBe('12.7 km');
  });

  it('keeps whole distances whole', () => {
    expect(formatKm(20, 'fr')).toBe('20 km');
    expect(formatKm(20, 'en')).toBe('20 km');
  });

  it('rounds to one decimal', () => {
    expect(formatKm(20.4507, 'fr')).toBe('20,5 km');
  });
});
