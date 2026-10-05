import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Locate } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { getVisitedEstablishmentIds } from "@/services/checkIns";

interface MapEstablishment {
  id: string;
  name: string;
  slug: string;
  category: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  logo_url: string | null;
  rating: number | null;
}

function createPinIcon(visited: boolean) {
  const color = visited ? "hsl(var(--success))" : "hsl(var(--primary))";
  const checkmark = visited
    ? `<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-60%) rotate(45deg);color:white;font-size:10px;font-weight:bold;">✓</span>`
    : "";
  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
    html: `<div style="position:relative">
      <div style="
        background:${color};
        width:32px;height:32px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
      "></div>
      ${checkmark}
    </div>`,
  });
}

function createUserIcon() {
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:40px;height:40px;background:hsl(233 100% 69% / 0.15);border-radius:50%;animation:pulse-ring 2s cubic-bezier(0.215,0.61,0.355,1) infinite;"></div>
        <div style="position:absolute;width:32px;height:32px;background:hsl(233 100% 69% / 0.2);border:1px solid hsl(233 100% 69% / 0.3);border-radius:50%;"></div>
        <div style="position:absolute;width:16px;height:16px;background:hsl(233,100%,69%);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(95,114,255,0.4);"></div>
      </div>
    `,
  });
}

function createPopupContent(est: MapEstablishment, visited: boolean) {
  const img = est.logo_url || est.image_url;
  const imgHtml = img
    ? `<img src="${img}" alt="${est.name}" style="width:100%;height:64px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />`
    : "";
  const visitedBadge = visited
    ? `<span style="display:inline-block;padding:2px 8px;background:hsl(var(--success) / 0.12);color:hsl(var(--success));border-radius:999px;font-size:11px;font-weight:600;">✓ Visitado</span>`
    : "";
  return `
    <div style="min-width:160px;padding:4px;">
      ${imgHtml}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
        <h4 style="font-weight:600;font-size:14px;margin:0;">${est.name}</h4>
        ${visitedBadge}
      </div>
      <p style="font-size:12px;color:hsl(215 16% 47%);margin:2px 0 8px;">${est.category}</p>
      <a href="/estabelecimento/${est.slug}" style="
        display:block;text-align:center;padding:8px;
        background:hsl(var(--primary));color:white;
        border-radius:999px;font-size:14px;font-weight:500;
        text-decoration:none;
      ">Ver mais</a>
    </div>
  `;
}

interface ExploreMapProps {
  onEstablishmentClick?: (est: MapEstablishment) => void;
}

export default function ExploreMap({ onEstablishmentClick }: ExploreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { coords } = useLocation();
  const navigate = useNavigate();
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [establishments, setEstablishments] = useState<MapEstablishment[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  const lat = coords?.lat ?? -29.3733;
  const lng = coords?.lng ?? -50.8767;

  // Fetch establishments + visited
  useEffect(() => {
    supabase
      .from("establishments")
      .select("id, name, slug, category, latitude, longitude, image_url, logo_url, rating")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .then(({ data }) => {
        if (data) setEstablishments(data as MapEstablishment[]);
      });

    getVisitedEstablishmentIds().then(setVisitedIds);
  }, []);

  // Listen for check-in events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.establishmentId) {
        setVisitedIds((prev) => new Set([...prev, detail.establishmentId]));
      }
    };
    window.addEventListener("checkin", handler);
    return () => window.removeEventListener("checkin", handler);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng] as L.LatLngExpression,
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19,  }
    ).addTo(map);

    L.control
      .attribution({ position: "bottomright", prefix: false })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    setTimeout(() => {
      const attr = mapRef.current?.querySelector(".leaflet-control-attribution");
      if (attr instanceof HTMLElement) {
        attr.style.opacity = "0.5";
        attr.style.backdropFilter = "blur(4px)";
        attr.style.background = "rgba(255,255,255,0.6)";
        attr.style.fontSize = "10px";
        attr.style.borderRadius = "4px";
        attr.style.padding = "2px 6px";
      }
    }, 100);

    map.on("moveend", () => setShowSearchArea(true));
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Markers
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    establishments.forEach((est) => {
      if (est.latitude == null || est.longitude == null) return;
      const visited = visitedIds.has(est.id);
      const marker = L.marker([est.latitude, est.longitude], {
        icon: createPinIcon(visited),
      }).addTo(map);

      marker.bindPopup(createPopupContent(est, visited), {
        closeButton: false,
        className: "custom-popup",
      });

      marker.on("click", () => onEstablishmentClick?.(est));
      markersRef.current.push(marker);
    });
  }, [establishments, visitedIds]);

  // User marker
  useEffect(() => {
    if (!mapInstance.current || !coords) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([coords.lat, coords.lng]);
    } else {
      userMarkerRef.current = L.marker([coords.lat, coords.lng], {
        icon: createUserIcon(),
        zIndexOffset: 1000,
      }).addTo(mapInstance.current);
    }
  }, [coords]);

  const handleLocateMe = useCallback(() => {
    if (!mapInstance.current) return;
    mapInstance.current.flyTo([lat, lng], 17, { duration: 0.8 });
  }, [lat, lng]);

  return (
    <div className="relative h-[45vh] min-h-[350px] rounded-xl border border-border shadow-card overflow-hidden">
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {showSearchArea && (
        <button
          onClick={() => setShowSearchArea(false)}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-full shadow-lg text-sm font-medium text-foreground hover:shadow-xl transition-shadow"
        >
          <Search className="w-4 h-4 text-primary" />
          Buscar nesta área
        </button>
      )}

      <button
        onClick={handleLocateMe}
        aria-label="Minha localização"
        className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
      >
        <Locate className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
}
