import { describe, it, expect } from 'vitest';
import { DESTINATIONS, FURTHEST_PRESET_KM, AIRPORT_IDS } from '../../src/data/destinations.js';
import { BUSINESS } from '../../src/config/business.js';
import { ROUTE_GEOMETRIES } from '../../src/data/route-geometries.js';
import { decodePolyline } from '../../src/lib/polyline.js';

const presets = DESTINATIONS.filter((d) => d.id !== 'other');

describe('preset destinations', () => {
  it('every preset carries the coordinate the live router needs', () => {
    // Without it, a visitor who changes the pickup address cannot be quoted:
    // the trip has to be re-measured, and that needs a destination point.
    for (const dest of presets) {
      expect(typeof dest.lat, dest.id).toBe('number');
      expect(typeof dest.lon, dest.id).toBe('number');
    }
  });

  it('places every destination in north-west Europe', () => {
    for (const dest of presets) {
      expect(dest.lat, dest.id).toBeGreaterThan(49.5);
      expect(dest.lat, dest.id).toBeLessThan(52.5);
      expect(dest.lon, dest.id).toBeGreaterThan(2.5);
      expect(dest.lon, dest.id).toBeLessThan(7.5);
    }
  });

  it('keeps each coordinate on the end of its own stored route', () => {
    // The two are generated together on purpose: a distance measured to one
    // point and a map drawn to another would quote a price for a trip the
    // route does not describe.
    for (const dest of presets) {
      const points = decodePolyline(ROUTE_GEOMETRIES[dest.id] ?? '');
      const [lat, lon] = points[points.length - 1];
      expect(lat, dest.id).toBeCloseTo(dest.lat, 5);
      expect(lon, dest.id).toBeCloseTo(dest.lon, 5);
    }
  });

  it('derives the long-distance threshold from the furthest destination offered', () => {
    expect(FURTHEST_PRESET_KM).toBe(Math.max(...presets.map((d) => d.km)));
    // Well beyond the local service radius: the dropdown deliberately offers
    // airports far outside it, so the radius cannot serve as the threshold.
    expect(FURTHEST_PRESET_KM * 1000).toBeGreaterThan(BUSINESS.serviceRadiusMeters);
  });

  it('still hides a price for every airport', () => {
    for (const id of AIRPORT_IDS) {
      expect(DESTINATIONS.find((d) => d.id === id)?.tbc, id).toBe(true);
    }
  });
});
