import { RouteStop } from './types';

export interface FareBreakdown {
  distanceKm: number;
  distanceCharge: number;
  weightCharge: number;
  total: number;
  error: string | null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateDistanceCharge(km: number): number {
  let charge = 0;
  let remaining = km;
  if (remaining > 200) {
    charge += (remaining - 200) * 0.5;
    remaining = 200;
  }
  if (remaining > 100) {
    charge += (remaining - 100) * 1;
    remaining = 100;
  }
  if (remaining > 50) {
    charge += (remaining - 50) * 2;
    remaining = 50;
  }
  charge += remaining * 3;
  return charge;
}

const WEIGHT_TIERS: { maxKg: number; charge: number }[] = [
  { maxKg: 5, charge: 10 },
  { maxKg: 10, charge: 15 },
  { maxKg: 15, charge: 20 },
  { maxKg: 20, charge: 25 },
  { maxKg: 25, charge: 30 },
  { maxKg: 30, charge: 35 },
  { maxKg: 35, charge: 40 },
  { maxKg: 40, charge: 45 },
  { maxKg: 45, charge: 50 },
  { maxKg: 100, charge: 55 },
];

function calculateWeightCharge(kg: number): number | null {
  for (const tier of WEIGHT_TIERS) {
    if (kg <= tier.maxKg) return tier.charge;
  }
  return null;
}

const MIN_FARE = 40;

export function calculateFare(
  boardingStop: RouteStop | null,
  destinationStop: RouteStop | null,
  weightKg: string | number,
): FareBreakdown {
  const weight = typeof weightKg === 'string' ? parseFloat(weightKg) : weightKg;

  if (!weight || weight <= 0) {
    return { distanceKm: 0, distanceCharge: 0, weightCharge: 0, total: 0, error: 'Enter a valid weight.' };
  }

  if (weight > 100) {
    return { distanceKm: 0, distanceCharge: 0, weightCharge: 0, total: 0, error: 'Parcel weight exceeds 100 kg limit. Please contact the operator for heavy cargo.' };
  }

  if (
    !boardingStop ||
    !destinationStop ||
    boardingStop.latitude == null ||
    boardingStop.longitude == null ||
    destinationStop.latitude == null ||
    destinationStop.longitude == null
  ) {
    return { distanceKm: 0, distanceCharge: 0, weightCharge: 0, total: 0, error: 'Could not determine route distance. Missing stop coordinates.' };
  }

  const distanceKm = haversineKm(
    boardingStop.latitude,
    boardingStop.longitude,
    destinationStop.latitude,
    destinationStop.longitude,
  );

  const distanceCharge = calculateDistanceCharge(distanceKm);
  const weightCharge = calculateWeightCharge(weight);

  if (weightCharge == null) {
    return { distanceKm, distanceCharge: 0, weightCharge: 0, total: 0, error: 'Parcel weight exceeds 100 kg limit.' };
  }

  const total = Math.max(MIN_FARE, distanceCharge + weightCharge);

  return {
    distanceKm: Math.round(distanceKm),
    distanceCharge: Math.round(distanceCharge),
    weightCharge,
    total: Math.round(total),
    error: null,
  };
}
