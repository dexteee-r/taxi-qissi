// Vérifie le décodage des tracés d'itinéraire, utilisé uniquement par le
// script de maintenance scripts/verify-distances.mjs.
import { describe, it, expect } from 'vitest';
import { decodePolyline } from '../../scripts/polyline.js';

describe('decodePolyline', () => {
  it('decodes the reference example from the format specification', () => {
    // The canonical test vector for precision-5 encoded polylines.
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(points).toHaveLength(3);
    expect(points[0][0]).toBeCloseTo(38.5, 5);
    expect(points[0][1]).toBeCloseTo(-120.2, 5);
    expect(points[1][0]).toBeCloseTo(40.7, 5);
    expect(points[1][1]).toBeCloseTo(-120.95, 5);
    expect(points[2][0]).toBeCloseTo(43.252, 5);
    expect(points[2][1]).toBeCloseTo(-126.453, 5);
  });

  it('returns [lat, lon] pairs, the order Leaflet expects', () => {
    // A short route out of Tienen: latitudes near 50.8, longitudes near 4.9.
    const [first] = decodePolyline('clbuH_gc]Km@[NSJFZTvAL|@');
    expect(first[0]).toBeGreaterThan(50);
    expect(first[0]).toBeLessThan(51);
    expect(first[1]).toBeGreaterThan(4);
    expect(first[1]).toBeLessThan(6);
  });

  it('handles empty and malformed input without throwing', () => {
    expect(decodePolyline('')).toEqual([]);
    expect(decodePolyline(null)).toEqual([]);
    expect(decodePolyline(undefined)).toEqual([]);
    expect(decodePolyline(123)).toEqual([]);
    // A truncated string must terminate rather than loop forever.
    expect(() => decodePolyline('_p~iF~ps|U_ulL')).not.toThrow();
  });

  it('decodes negative deltas (a route heading south-west)', () => {
    const points = decodePolyline('_p~iF~ps|U~ulLnnqC');
    expect(points).toHaveLength(2);
    expect(points[1][0]).toBeLessThan(points[0][0]); // latitude decreased
  });
});
