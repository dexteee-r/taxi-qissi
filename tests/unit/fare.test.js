// Vérifie le calcul du prix (src/lib/fare.js) : prise en charge, prix au
// kilomètre, et les bornes exactes du supplément de nuit.
import { describe, it, expect } from 'vitest';
import { estimateFare } from '../../src/lib/fare.js';
import { FARE } from '../../src/config/business.js';

// The tariff grid is client-supplied (CDC §4) and publicly displayed, so
// these numbers are contractual: 4 € pickup + 3 €/km + a flat 3 € night
// surcharge applied once, between 22:00 and 04:00.
describe('estimateFare', () => {
  it('charges the pickup fee alone for a zero-distance ride by day', () => {
    const fare = estimateFare(0, 12);
    expect(fare.total).toBe(4);
    expect(fare.isNight).toBe(false);
  });

  it('adds 3 € per kilometer', () => {
    expect(estimateFare(10, 12).total).toBe(34); // 4 + 10*3
    expect(estimateFare(20, 12).total).toBe(64);
    expect(estimateFare(45, 12).total).toBe(139);
  });

  it('handles fractional distances without float drift', () => {
    const fare = estimateFare(12.7, 12);
    expect(fare.total).toBe(42.1); // 4 + 38.1
    expect(fare.breakdown.distance).toBe(38.1);
  });

  describe('night surcharge', () => {
    it('applies from 22:00 through 03:59', () => {
      for (const hour of [22, 23, 0, 1, 2, 3]) {
        const fare = estimateFare(10, hour);
        expect(fare.isNight, `hour ${hour}`).toBe(true);
        expect(fare.total, `hour ${hour}`).toBe(37); // 34 + 3
      }
    });

    it('does not apply from 04:00 through 21:59', () => {
      for (const hour of [4, 5, 9, 12, 17, 21]) {
        const fare = estimateFare(10, hour);
        expect(fare.isNight, `hour ${hour}`).toBe(false);
        expect(fare.total, `hour ${hour}`).toBe(34);
      }
    });

    it('is a flat amount applied once, independent of distance', () => {
      const short = estimateFare(1, 23);
      const long = estimateFare(100, 23);
      expect(short.breakdown.night).toBe(3);
      expect(long.breakdown.night).toBe(3);
      expect(long.total - long.breakdown.night).toBe(304); // 4 + 300
    });
  });

  it('breaks the total down into base + distance + night', () => {
    const fare = estimateFare(20, 23);
    expect(fare.breakdown).toEqual({ base: 4, distance: 60, night: 3 });
    expect(fare.breakdown.base + fare.breakdown.distance + fare.breakdown.night).toBe(fare.total);
  });

  it('never silently computes waiting time (display-only rate)', () => {
    // Waiting time is shown in the grid but must not enter the estimate.
    expect(FARE.waitingRatePerHour).toBe(36);
    expect(estimateFare(10, 12).total).toBe(34);
  });

  it('rejects invalid input rather than producing a wrong price', () => {
    expect(() => estimateFare(-1, 12)).toThrow(RangeError);
    expect(() => estimateFare(NaN, 12)).toThrow(RangeError);
    expect(() => estimateFare(10, 24)).toThrow(RangeError);
    expect(() => estimateFare(10, -1)).toThrow(RangeError);
    expect(() => estimateFare(10, 12.5)).toThrow(RangeError);
  });
});
