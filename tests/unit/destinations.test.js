// Vérifie la liste des destinations et la reconnaissance des aéroports
// (src/data/destinations.js).
import { describe, it, expect } from 'vitest';
import { DESTINATIONS, FURTHEST_PRESET_KM, AIRPORT_IDS, airportAt } from '../../src/data/destinations.js';
import { BUSINESS } from '../../src/config/business.js';
import { ROUTE_GEOMETRIES } from '../../scripts/route-geometries.js';
import { decodePolyline } from '../../scripts/polyline.js';

const presets = DESTINATIONS;

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

describe('airportAt', () => {
  it('recognises each airport from its own coordinate', () => {
    // The dropdown that used to carry the `tbc` flag is gone, so this is now
    // the only thing keeping an unapproved airport price off the screen.
    for (const id of AIRPORT_IDS) {
      const airport = DESTINATIONS.find((d) => d.id === id);
      expect(airportAt({ lat: airport.lat, lon: airport.lon })?.id, id).toBe(id);
    }
  });

  it('covers the terminals and car parks around an airport', () => {
    const zaventem = DESTINATIONS.find((d) => d.id === 'zav');
    // ~1.5 km north: still airport grounds.
    expect(airportAt({ lat: zaventem.lat + 0.0135, lon: zaventem.lon })?.id).toBe('zav');
  });

  it('does not catch the towns next door', () => {
    const zaventem = DESTINATIONS.find((d) => d.id === 'zav');
    // ~11 km away — Zaventem village and beyond must be priced normally.
    expect(airportAt({ lat: zaventem.lat + 0.1, lon: zaventem.lon })).toBeNull();
    expect(airportAt({ lat: 50.8798, lon: 4.7005 })).toBeNull(); // Leuven
    expect(airportAt(BUSINESS.routingOrigin)).toBeNull(); // Tienen
  });

  it('answers null rather than throwing on a missing coordinate', () => {
    expect(airportAt(null)).toBeNull();
    expect(airportAt({})).toBeNull();
    expect(airportAt({ lat: 'x', lon: 4 })).toBeNull();
  });
});
