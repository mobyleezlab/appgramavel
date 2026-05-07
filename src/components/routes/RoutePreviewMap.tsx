/**
 * Read-only Leaflet preview that draws numbered pins for each stop and a polyline.
 * Used in route detail and editor.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Stop {
  lat: number;
  lng: number;
  name?: string;
}

interface Props {
  stops: Stop[];
  polyline?: [number, number][]; // [lat,lng]
  className?: string;
  height?: number;
}

function numberedIcon(n: number, isFirst: boolean, isLast: boolean) {
  const bg = isLast ? "hsl(142,71%,45%)" : "hsl(233,100%,69%)";
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    html: `
      <div style="
        width:30px;height:30px;background:${bg};
        border:3px solid white;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 4px 10px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="transform:rotate(45deg);color:white;font-weight:700;font-size:12px;line-height:1;">
          ${isFirst ? "A" : isLast ? "B" : n}
        </div>
      </div>
    `,
  });
}

export default function RoutePreviewMap({ stops, polyline, className, height = 192 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: false,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd" },
    ).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (stops.length === 0) return;

    stops.forEach((s, i) => {
      L.marker([s.lat, s.lng], {
        icon: numberedIcon(i + 1, i === 0, i === stops.length - 1 && stops.length > 1),
      }).addTo(group);
    });

    const points: L.LatLngExpression[] = (
      polyline && polyline.length > 1 ? polyline : stops.map((s) => [s.lat, s.lng])
    ) as L.LatLngExpression[];

    if (points.length > 1) {
      L.polyline(points, {
        color: "hsl(233,100%,69%)",
        weight: 4,
        opacity: 0.85,
        dashArray: polyline && polyline.length > 1 ? undefined : "6 8",
      }).addTo(group);
    }

    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
  }, [stops, polyline]);

  return <div ref={containerRef} className={className} style={{ height }} />;
}
