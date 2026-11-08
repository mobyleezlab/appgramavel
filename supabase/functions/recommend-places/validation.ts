export function validatePreferences(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length >= 5 && trimmed.length <= 1000 ? trimmed : null;
}

export interface Recommendation { id: string; reason: string }

export function validateRecommendations(value: unknown, allowedIds: Set<string>): Recommendation[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const results: Recommendation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || !("id" in item) || !("reason" in item)) continue;
    if (typeof item.id !== "string" || typeof item.reason !== "string" || !allowedIds.has(item.id) || seen.has(item.id)) continue;
    const reason = item.reason.trim();
    if (!reason || reason.length > 500) continue;
    seen.add(item.id);
    results.push({ id: item.id, reason });
    if (results.length === 5) break;
  }
  return results;
}

export function isRegionalPlace(latitude: number | null, longitude: number | null): boolean {
  if (latitude == null || longitude == null) return false;
  const radians = (n: number) => n * Math.PI / 180;
  return [[-29.3788, -50.8769], [-29.3656, -50.8151]].some(([lat, lng]) => {
    const a = Math.sin(radians(latitude - lat) / 2) ** 2
      + Math.cos(radians(lat)) * Math.cos(radians(latitude)) * Math.sin(radians(longitude - lng) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 20;
  });
}