import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, AlertCircle, Car, Bike, Footprints, Navigation2 } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import RouteMap from "./RouteMap";
import NavigationView from "./NavigationView";
import type { RouteResult } from "@/lib/routing";

function MotoIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      <path d="M5 14l4-7h4l3 5h3" />
      <path d="M9 7l1 3" />
      <path d="M13 10h3" />
    </svg>
  );
}

interface MapSheetProps {
  open: boolean;
  onClose: () => void;
  establishment: {
    name: string;
    latitude: number | null;
    longitude: number | null;
    distance_km?: number | null;
  };
}

const TRANSPORT_CHIPS = [
  { key: "car", Icon: Car, label: "Carro" },
  { key: "moto", Icon: MotoIcon, label: "Moto" },
  { key: "bike", Icon: Bike, label: "Bike" },
  { key: "walking", Icon: Footprints, label: "A pé" },
] as const;

function formatDuration(min: number) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

export default function MapSheet({ open, onClose, establishment }: MapSheetProps) {
  const { coords, loading, permissionState, requestLocation } = useLocation();
  const [routeData, setRouteData] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [navigating, setNavigating] = useState(false);

  const destLat = establishment.latitude ?? -29.3789;
  const destLng = establishment.longitude ?? -50.8732;

  // Reseta estado ao reabrir / mudar destino
  useEffect(() => {
    if (open) {
      setRouteData(null);
      setLoadingRoute(true);
    }
  }, [open, destLat, destLng]);

  const handleRouteCalculated = useCallback((result: RouteResult | null) => {
    setRouteData(result);
    setLoadingRoute(false);
  }, []);

  const handleOpenExternal = () => {
    const q = `${destLat},${destLng}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={open && !navigating} onOpenChange={(v) => !v && !navigating && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 space-y-1">
          <SheetTitle className="text-lg font-bold text-foreground">
            {establishment.name}
          </SheetTitle>
        </SheetHeader>

        {/* Transport chips */}
        <div className="px-4 pb-3">
          {loading || (!coords && permissionState !== "denied") ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-7 w-20 rounded-full bg-secondary animate-pulse shrink-0" />
              ))}
            </div>
          ) : loadingRoute && coords ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-7 w-20 rounded-full bg-secondary animate-pulse shrink-0" />
              ))}
            </div>
          ) : routeData ? (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4">
              {/* Distance chip */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 text-xs font-semibold shrink-0">
                <MapPin className="w-3.5 h-3.5" />
                {routeData.distanceKm} km
              </div>
              {/* Time per transport */}
              {TRANSPORT_CHIPS.map(({ key, Icon, label }) => (
                <div
                  key={key}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-foreground rounded-full border border-border text-xs font-medium shrink-0 shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">
                    {formatDuration(routeData.durationMin[key as keyof typeof routeData.durationMin])}
                  </span>
                </div>
              ))}
            </div>
          ) : coords ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5" />
                Não foi possível calcular a rota
              </span>
            </div>
          ) : permissionState === "denied" ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5" />
              Ative a localização nas configurações do navegador para ver a rota
            </span>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Não foi possível obter sua localização.</span>
              <button
                onClick={requestLocation}
                className="text-xs font-semibold text-primary hover:underline shrink-0"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0">
          <RouteMap
            user={coords}
            destination={{ lat: destLat, lng: destLng }}
            onRouteCalculated={handleRouteCalculated}
          />
        </div>

        {/* Bottom */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            className="w-full rounded-full gap-2"
            onClick={() => setNavigating(true)}
            disabled={!coords || loadingRoute || !routeData}
          >
            <Navigation2 className="w-4 h-4" />
            Iniciar navegação
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground gap-1"
            onClick={handleOpenExternal}
          >
            <ExternalLink className="w-3 h-3" />
            Abrir no Google Maps
          </Button>
        </div>
      </SheetContent>

      {navigating &&
        createPortal(
          <NavigationView
            destination={{ lat: destLat, lng: destLng, name: establishment.name }}
            initialRoute={routeData}
            onExit={() => {
              // Fecha overlay e Sheet pai no mesmo tick — evita "dois cliques"
              setNavigating(false);
              onClose();
            }}
          />,
          document.body,
        )}
    </Sheet>
  );
}
