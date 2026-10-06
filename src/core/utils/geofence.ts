/**
 * Geofencing distance calculation via Haversine Formula
 * Default Anchor: Kantor LLDIKTI Wilayah X (Jalan Khatib Sulaiman, Padang, Sumatera Barat)
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const LLDIKTI_X_COORDINATES: Coordinates = {
  latitude: -0.92348,
  longitude: 100.36214,
};

export const calculateDistanceMeters = (coord1: Coordinates, coord2: Coordinates): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth radius in meters

  const φ1 = toRad(coord1.latitude);
  const φ2 = toRad(coord2.latitude);
  const Δφ = toRad(coord2.latitude - coord1.latitude);
  const Δλ = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

export const isWithinGeofence = (
  userLocation: Coordinates,
  targetLocation: Coordinates = LLDIKTI_X_COORDINATES,
  allowedRadiusMeters: number = 50
): { valid: boolean; distance: number } => {
  const distance = calculateDistanceMeters(userLocation, targetLocation);
  return {
    valid: distance <= allowedRadiusMeters,
    distance,
  };
};
