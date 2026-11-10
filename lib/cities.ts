/** Approximate city centres, used only to suggest the nearest active city. */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  raipur: { lat: 21.2514, lng: 81.6296 },
  bhilai: { lat: 21.2094, lng: 81.4285 },
  durg: { lat: 21.1904, lng: 81.2849 },
  bilaspur: { lat: 22.0797, lng: 82.1409 },
  korba: { lat: 22.3595, lng: 82.7501 },
  rajnandgaon: { lat: 21.0974, lng: 81.0337 },
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Returns the nearest city slug, or null if none is within maxKm. */
export function nearestCitySlug(
  point: { lat: number; lng: number },
  activeSlugs: string[],
  maxKm = 80
): string | null {
  let best: { slug: string; km: number } | null = null;
  for (const slug of activeSlugs) {
    const c = CITY_COORDS[slug];
    if (!c) continue;
    const km = haversineKm(point, c);
    if (!best || km < best.km) best = { slug, km };
  }
  return best && best.km <= maxKm ? best.slug : null;
}
