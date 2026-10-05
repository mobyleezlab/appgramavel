import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map-styles.css";
import {
  ArrowUp, MoveUpLeft, MoveUpRight, CornerUpLeft, CornerUpRight,
  CornerLeftUp, CornerRightUp, Redo2, RotateCw, Flag, Navigation2,
  Volume2, VolumeX,
} from "lucide-react";
import { CloseButton } from "@/components/ui/CloseButton";
import {
  getRoute, distanceMeters, type RouteResult, type RouteStep,
} from "@/lib/routing";

interface NavigationViewProps {
  destination: { lat: number; lng: number; name: string };
  initialRoute: RouteResult | null;
  onExit: () => void;
}

function maneuverIcon(maneuver: string, modifier?: string) {
  const cls = "w-7 h-7 text-primary-foreground";
  if (maneuver === "arrive") return <Flag className={cls} />;
  if (maneuver === "depart") return <Navigation2 className={cls} />;
  if (maneuver === "roundabout" || maneuver === "rotary") return <RotateCw className={cls} />;
  switch (modifier) {
    case "left": return <CornerUpLeft className={cls} />;
    case "right": return <CornerUpRight className={cls} />;
    case "slight left": return <MoveUpLeft className={cls} />;
    case "slight right": return <MoveUpRight className={cls} />;
    case "sharp left": return <CornerLeftUp className={cls} />;
    case "sharp right": return <CornerRightUp className={cls} />;
    case "uturn": return <Redo2 className={`${cls} -scale-x-100`} />;
    default: return <ArrowUp className={cls} />;
  }
}

function fmtDistance(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function fmtTime(min: number) {
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function NavigationView({ destination, initialRoute, onExit }: NavigationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polylineGroupRef = useRef<L.LayerGroup | null>(null);

  const [route, setRoute] = useState<RouteResult | null>(initialRoute);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [distanceToManeuver, setDistanceToManeuver] = useState<number>(0);
  const [remainingM, setRemainingM] = useState<number>(initialRoute ? initialRoute.distanceKm * 1000 : 0);
  const [remainingS, setRemainingS] = useState<number>(
    initialRoute ? initialRoute.steps.reduce((a, s) => a + s.durationS, 0) : 0,
  );
  const [arrived, setArrived] = useState(false);
  const [muted, setMuted] = useState(false);
  const [recentering, setRecentering] = useState(true);
  const lastSpokenRef = useRef<number>(-1);
  const watchIdRef = useRef<number | null>(null);
  const recalcInProgressRef = useRef(false);
  const lastRecalcAtRef = useRef<number>(0);

  const exitNow = () => {
    try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch { /* ignore */ }
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    onExit();
  };

  // Inicializa mapa — tiles claros (CartoDB Voyager)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      zoomSnap: 0.25,
    });
    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19, subdomains: "abcd" },
    ).addTo(map);

    // Pin destino — gradiente do brand (transform consolidado)
    const destIcon = L.divIcon({
      className: "",
      iconSize: [36, 46],
      iconAnchor: [18, 44],
      html: `
        <div style="position:relative;width:36px;height:46px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.25));">
          <div style="position:absolute;left:1px;top:0;width:34px;height:34px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,hsl(233,100%,69%),hsl(236,100%,79%));border:2px solid white;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg);"><path d="M4 22V4a1 1 0 0 1 1-1h13l-3 5 3 5H5"/></svg>
          </div>
        </div>`,
    });
    L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);

    map.setView([destination.lat, destination.lng], 18);
    map.on("dragstart", () => setRecentering(false));

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

  // Polyline da rota — usa LayerGroup e remove corretamente ao recalcular
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;
    if (polylineGroupRef.current) {
      polylineGroupRef.current.remove();
      polylineGroupRef.current = null;
    }
    const points = route.coordinates.map(([lat, lng]) => [lat, lng] as L.LatLngExpression);
    const casing = L.polyline(points, {
      color: "#ffffff",
      weight: 10,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round",
    });
    const line = L.polyline(points, {
      color: "hsl(233,100%,69%)",
      weight: 6,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round",
    });
    const group = L.layerGroup([casing, line]).addTo(map);
    polylineGroupRef.current = group;
  }, [route]);

  // Watch geolocation (incluindo heading quando disponível)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy && pos.coords.accuracy > 50) return;
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)) {
          setHeading(pos.coords.heading);
        } else if (prevCoordsRef.current) {
          const prev = prevCoordsRef.current;
          const moved = distanceMeters(prev, next);
          if (moved > 3) {
            const φ1 = (prev.lat * Math.PI) / 180;
            const φ2 = (next.lat * Math.PI) / 180;
            const Δλ = ((next.lng - prev.lng) * Math.PI) / 180;
            const y = Math.sin(Δλ) * Math.cos(φ2);
            const x =
              Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
            const brng = (Math.atan2(y, x) * 180) / Math.PI;
            setHeading((brng + 360) % 360);
          }
        }
        prevCoordsRef.current = next;
        setCoords(next);
      },
      (err) => console.warn("watchPosition error", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
    watchIdRef.current = id;
    return () => {
      navigator.geolocation.clearWatch(id);
      watchIdRef.current = null;
    };
  }, []);

  // Marcador do usuário: criação/posição (sem depender de heading)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !coords) return;

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: "",
        iconSize: [56, 56],
        iconAnchor: [28, 28],
        html: `
          <div style="position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:48px;height:48px;background:hsl(233 100% 69% / 0.22);border-radius:50%;animation:nav-pulse 2.4s ease-out infinite;"></div>
            <div data-arrow style="position:relative;width:34px;height:34px;border-radius:50%;background:white;border:2px solid hsl(233,100%,69%);box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;transform:rotate(0deg);transition:transform 250ms ease;">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="hsl(233,100%,69%)" stroke="hsl(233,100%,69%)" stroke-width="1" stroke-linejoin="round"><path d="M12 2 L19 20 L12 16 L5 20 Z"/></svg>
            </div>
          </div>`,
      });
      userMarkerRef.current = L.marker([coords.lat, coords.lng], {
        icon: userIcon, zIndexOffset: 1000, interactive: false,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([coords.lat, coords.lng]);
    }
    if (recentering) {
      map.setView([coords.lat, coords.lng], 18, { animate: true });
    }
  }, [coords, recentering]);

  // Rotação da seta sem recriar o ícone (preserva transição CSS)
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker) return;
    const el = marker.getElement();
    const arrow = el?.querySelector<HTMLElement>("[data-arrow]");
    if (arrow) arrow.style.transform = `rotate(${heading}deg)`;
  }, [heading]);

  // Recalcular passo + distâncias + tempo restante real
  useEffect(() => {
    if (!coords || !route) return;
    const distToDest = distanceMeters(coords, destination);

    if (distToDest < 30 && !arrived) {
      setArrived(true);
      setRemainingM(0);
      setRemainingS(0);
      return;
    }
    // Reset "arrived" se o usuário se afastar novamente
    if (arrived && distToDest > 60) {
      setArrived(false);
    }
    if (arrived) return;

    let idx = stepIdx;
    while (idx < route.steps.length - 1) {
      const next = route.steps[idx + 1];
      const dToNext = distanceMeters(coords, { lat: next.location[0], lng: next.location[1] });
      const dToCurrent = distanceMeters(coords, {
        lat: route.steps[idx].location[0], lng: route.steps[idx].location[1],
      });
      if (dToNext < dToCurrent || dToNext < 25) idx++;
      else break;
    }
    if (idx !== stepIdx) setStepIdx(idx);

    const target = route.steps[idx + 1]?.location ?? [destination.lat, destination.lng];
    const dToManeuver = distanceMeters(coords, { lat: target[0], lng: target[1] });
    setDistanceToManeuver(dToManeuver);

    const remaining = route.steps.slice(idx).reduce((acc, s) => acc + s.distanceM, 0);
    setRemainingM(Math.max(remaining, distToDest));

    // Tempo restante real: soma dos steps + proporção do step atual baseada na distância
    const currentStep = route.steps[idx];
    const currentStepProgress = currentStep && currentStep.distanceM > 0
      ? Math.min(1, Math.max(0, dToManeuver / currentStep.distanceM))
      : 0;
    const futureSecs = route.steps.slice(idx + 1).reduce((a, s) => a + s.durationS, 0);
    const currentSecs = currentStep ? currentStep.durationS * currentStepProgress : 0;
    setRemainingS(Math.max(0, currentSecs + futureSecs));

    // Recalcular rota apenas se realmente desviou + debounce 8s + flag
    const dToCurrentStep = distanceMeters(coords, {
      lat: route.steps[idx].location[0], lng: route.steps[idx].location[1],
    });
    const dToNextStep = route.steps[idx + 1]
      ? distanceMeters(coords, {
          lat: route.steps[idx + 1].location[0], lng: route.steps[idx + 1].location[1],
        })
      : Infinity;
    const offRoute = Math.min(dToCurrentStep, dToNextStep) > 120;
    const now = Date.now();
    if (offRoute && !recalcInProgressRef.current && now - lastRecalcAtRef.current > 8000) {
      recalcInProgressRef.current = true;
      lastRecalcAtRef.current = now;
      getRoute(coords, destination)
        .then((r) => {
          if (r) {
            setRoute(r);
            setStepIdx(0);
            lastSpokenRef.current = -1;
          }
        })
        .finally(() => {
          recalcInProgressRef.current = false;
        });
    }
  }, [coords, route, stepIdx, arrived, destination]);

  // Voz: anunciar manobra
  useEffect(() => {
    if (muted || arrived) return;
    if (!route || stepIdx === lastSpokenRef.current) return;
    if (!("speechSynthesis" in window)) return;
    lastSpokenRef.current = stepIdx;
    const step = route.steps[stepIdx];
    if (!step) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(step.instruction);
      u.lang = "pt-BR";
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }, [stepIdx, route, muted, arrived]);

  useEffect(() => {
    if (arrived && !muted && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance("Você chegou ao destino.");
        u.lang = "pt-BR";
        window.speechSynthesis.speak(u);
      } catch { /* ignore */ }
    }
  }, [arrived, muted]);

  const currentStep: RouteStep | undefined = route?.steps[stepIdx];
  const nextStep: RouteStep | undefined = route?.steps[stepIdx + 1];

  const etaMin = remainingS / 60;
  const eta = new Date(Date.now() + remainingS * 1000);
  const etaLabel = eta.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
      {/* Mapa em vista padrão (top-down), sem perspectiva 3D */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Card de instrução flutuante no topo */}
      <div className="relative z-[1000] shrink-0 px-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="bg-primary text-primary-foreground rounded-2xl shadow-lg p-3 flex items-center gap-3">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-primary-foreground/15 flex items-center justify-center">
            {currentStep ? maneuverIcon(currentStep.maneuver, currentStep.modifier) : <Navigation2 className="w-6 h-6 text-primary-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-extrabold leading-none tracking-tight">
              {arrived ? "Chegou!" : fmtDistance(distanceToManeuver)}
            </div>
            <div className="text-[13px] text-primary-foreground/95 truncate mt-1">
              {arrived ? destination.name : (nextStep?.instruction ?? currentStep?.instruction ?? "Calculando rota…")}
            </div>
          </div>
          <CloseButton
            variant="overlay"
            size="md"
            label="Encerrar navegação"
            onClick={exitNow}
            className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground shrink-0"
          />
        </div>
      </div>

      {/* Botões flutuantes laterais */}
      <div className="relative z-[1000] flex-1 min-h-0 pointer-events-none">
        <button
          onClick={() => {
            setMuted((m) => {
              if (!m && "speechSynthesis" in window) window.speechSynthesis.cancel();
              return !m;
            });
          }}
          className="pointer-events-auto absolute right-3 top-3 w-11 h-11 rounded-full bg-card/95 backdrop-blur shadow-lg flex items-center justify-center border border-border/60 active:scale-95 transition"
          aria-label={muted ? "Ativar voz" : "Silenciar voz"}
        >
          {muted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-primary" />}
        </button>

        {!recentering && coords && (
          <button
            onClick={() => setRecentering(true)}
            className="pointer-events-auto absolute right-3 bottom-3 w-11 h-11 rounded-full bg-card/95 backdrop-blur shadow-lg flex items-center justify-center border border-border/60 active:scale-95 transition"
            aria-label="Recentralizar no meu local"
          >
            <Navigation2 className="w-5 h-5 text-primary" />
          </button>
        )}
      </div>

      {/* Card de ETA flutuante no rodapé */}
      <div className="relative z-[1000] shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl shadow-lg p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-foreground leading-none tracking-tight">
              {arrived ? "0 min" : fmtTime(etaMin)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5">
              {fmtDistance(remainingM)} · chegada {etaLabel}
            </div>
          </div>
          <div className="text-right min-w-0 max-w-[60%]">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Destino</div>
            <div className="text-sm font-semibold text-foreground truncate mt-1">{destination.name}</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes nav-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
    </div>
  );
}
