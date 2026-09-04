// Pure fare estimation logic — runs entirely in the browser.
// See brief_dev_taxi_qiss.md §5.1 and cdc_v1_taxi_qiss.md §7.4.
import { FARE } from '../config/business.js';

/**
 * @param {number} distanceKm real road distance in kilometers (never straight-line)
 * @param {number} rideHour hour of the ride, 0-23, local time
 * @returns {{ total: number, isNight: boolean, breakdown: { base: number, distance: number, night: number } }}
 */
export function estimateFare(distanceKm, rideHour) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new RangeError('distanceKm must be a finite, non-negative number');
  }
  if (typeof rideHour !== 'number' || !Number.isInteger(rideHour) || rideHour < 0 || rideHour > 23) {
    throw new RangeError('rideHour must be an integer between 0 and 23');
  }

  const isNight = rideHour >= FARE.nightStartHour || rideHour < FARE.nightEndHour;
  const base = FARE.baseFare;
  const distance = distanceKm * FARE.perKmRate;
  const night = isNight ? FARE.nightSurcharge : 0;

  return {
    total: round2(base + distance + night),
    isNight,
    breakdown: {
      base: round2(base),
      distance: round2(distance),
      night: round2(night),
    },
  };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
