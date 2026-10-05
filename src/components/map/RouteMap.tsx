import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map-styles.css";
import { getRoute, type RouteResult } from "@/lib/routing";

interface RouteMapProps {
  user: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number };
  onRouteCalculated?: (result: RouteResult | null) => void;
}

function createDestinationIcon() {
  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    html: `
      <div style="
        width:32px;height:32px;
        background:hsl(233,100%,69%);
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 4px 12px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="transform:rotate(45deg);width:10px;height:10px;background:white;border-radius:50%;"></div>
      </div>
    `,
  });
}

function createUserDot() {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `
      <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:24px;height:24px;background:hsl(233 100% 69% / 0.2);border-radius:50%;"></div>
        <div style="position:absolute;width:12px;height:12px;background:hsl(233,100%,69%);border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(95,114,255,0.4);"></div>
      </div>
    `,
  });
}

export default function RouteMap({ user, destination, onRouteCalculated }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const routeRequestedRef = useRef<string | null>(null);

  // Inicializa mapa uma vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19 }
    ).addTo(map);

    L.marker([destination.lat, destination.lng], { icon: createDestinationIcon() }).addTo(map);
    map.setView([destination.lat, destination.lng], 15);

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [destination.lat, destination.lng]);

  // Reage à chegada/mudança da localização do usuário
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!user) {
      onRouteCalculated?.(null);
      return;
    }

    // Marcador do usuário
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([user.lat, user.lng], {
        icon: createUserDot(),
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([user.lat, user.lng]);
    }

    // Evita refazer requisição para a mesma posição+destino arredondados
    const key = `${user.lat.toFixed(4)},${user.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
    if (routeRequestedRef.current === key) return;
    routeRequestedRef.current = key;

    let cancelled = false;
    getRoute(user, destination).then((result) => {
      if (cancelled || !mapRef.current) return;
      onRouteCalculated?.(result);

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }

      const points: L.LatLngExpression[] = result
        ? result.coordinates.map(([lat, lng]) => [lat, lng] as L.LatLngExpression)
        : [[user.lat, user.lng], [destination.lat, destination.lng]];

      const polyline = L.polyline(points, {
        color: "hsl(233,100%,69%)",
        weight: 4,
        opacity: 0.8,
        dashArray: result ? undefined : "8 8",
      }).addTo(map);
      polylineRef.current = polyline;

      map.fitBounds(polyline.getBounds(), { padding: [48, 48], maxZoom: 16 });
    }).catch(() => {
      if (!cancelled) onRouteCalculated?.(null);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.lat, user?.lng, destination.lat, destination.lng, onRouteCalculated]);

  return <div ref={containerRef} className="w-full h-full" />;
}
