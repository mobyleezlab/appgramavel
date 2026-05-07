/**
 * Builds external map deep-links for "How to get there" actions.
 */
export type ExternalMap = "google" | "apple" | "waze";

export function buildMapsUrl(
  provider: ExternalMap,
  dest: { lat: number; lng: number; name?: string },
) {
  const q = `${dest.lat},${dest.lng}`;
  const name = dest.name ? encodeURIComponent(dest.name) : "";
  switch (provider) {
    case "google":
      return `https://www.google.com/maps/dir/?api=1&destination=${q}${name ? `&destination_place_id=${name}` : ""}`;
    case "apple":
      return `https://maps.apple.com/?daddr=${q}${name ? `&q=${name}` : ""}`;
    case "waze":
      return `https://waze.com/ul?ll=${q}&navigate=yes`;
  }
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
