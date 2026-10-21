// Where the accident happened, as a point: what Cari Rujukan measures each hospital's distance from.

export type Point = { lat: number; lng: number };

/** The accident's location, with how the person named it (an address, "Lokasi saya", or its coordinates). */
export type Origin = Point & { label: string };

/** URL params that carry the origin. */
export const ORIGIN_PARAMS = ["lat", "lng", "tempat"] as const;

export const formatCoords = (p: Point) => `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;

/** Reads the origin from any param source; null when there isn't a usable one. */
export const parseOrigin = (get: (key: string) => string | null | undefined): Origin | null => {
  const rawLat = get("lat");
  const rawLng = get("lng");
  if (!rawLat || !rawLng) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng, label: (get("tempat") ?? "").trim() || formatCoords({ lat, lng }) };
};

export const originParams = (origin: Origin): Record<string, string> => ({
  lat: origin.lat.toFixed(5),
  lng: origin.lng.toFixed(5),
  tempat: origin.label,
});

/** The params that say where the search is from, kept in every link among the results. */
export const locationParams = (origin: Origin | null, lokasi: string): Record<string, string> =>
  origin ? originParams(origin) : lokasi ? { lokasi } : {};

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distance between two points along the earth's surface. */
export const haversineKm = (a: Point, b: Point) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

/** "4,2 km" under ten, whole kilometres beyond. */
export const formatKm = (km: number) => `${(km < 10 ? Math.round(km * 10) / 10 : Math.round(km)).toLocaleString("id-ID")} km`;
