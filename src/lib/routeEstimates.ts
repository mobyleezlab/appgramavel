/**
 * Multi-leg OSRM helper used by the route editor and details preview.
 */
import { distanceMeters } from "@/lib/routing";

export interface LegEstimate {
  distanceKm: number;
  durationMin: number; // by car
  coordinates: [number, number][]; // [lat,lng]
}

export interface RouteEstimate {
  totalDistanceKm: number;
  totalDurationMin: number;
  legs: LegEstimate[];
  fullCoordinates: [number, number][];
}

const SPEED_CAR_KMH = 50;

export async function getMultiLegRoute(
  points: { lat: number; lng: number }[],
): Promise<RouteEstimate | null> {
  if (points.length < 2) return null;

  // OSRM accepts multi-coordinate route in single call
  try {
    const coordsStr = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) throw new Error("OSRM failed");

    const route = data.routes[0];
    const fullCoordinates: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng],
    );
    const legs: LegEstimate[] = (route.legs ?? []).map((leg: any) => ({
      distanceKm: parseFloat((leg.distance / 1000).toFixed(2)),
      durationMin: Math.max(1, Math.ceil(leg.duration / 60)),
      coordinates: [],
    }));

    return {
      totalDistanceKm: parseFloat((route.distance / 1000).toFixed(2)),
      totalDurationMin: Math.max(1, Math.ceil(route.duration / 60)),
      legs,
      fullCoordinates,
    };
  } catch {
    // Haversine fallback
    let total = 0;
    const legs: LegEstimate[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const m = distanceMeters(points[i], points[i + 1]);
      const km = parseFloat((m / 1000).toFixed(2));
      total += km;
      legs.push({
        distanceKm: km,
        durationMin: Math.max(1, Math.ceil((km / SPEED_CAR_KMH) * 60)),
        coordinates: [
          [points[i].lat, points[i].lng],
          [points[i + 1].lat, points[i + 1].lng],
        ],
      });
    }
    return {
      totalDistanceKm: parseFloat(total.toFixed(2)),
      totalDurationMin: Math.max(1, Math.ceil((total / SPEED_CAR_KMH) * 60)),
      legs,
      fullCoordinates: points.map((p) => [p.lat, p.lng]),
    };
  }
}

export function formatKm(km: number) {
  if (!km) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatMin(min: number) {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}
