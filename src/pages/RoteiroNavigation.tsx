import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, SkipForward, PartyPopper, MapPin, Star, List, Map as MapIcon } from "lucide-react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RoutePreviewMap from "@/components/routes/RoutePreviewMap";
import { HowToGetThereButton } from "@/components/routes/HowToGetThereButton";
import {
  useMarkStopVisited,
  useMyRoute,
  useSuggestedRoute,
  useUpdateRouteStatus,
} from "@/hooks/useRoutes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function RoteiroNavigation() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isUser = params.get("type") === "user";

  const suggested = useSuggestedRoute(!isUser ? id : undefined);
  const mine = useMyRoute(isUser ? id : undefined);
  const route: any = isUser ? mine.data : suggested.data;

  const markVisited = useMarkStopVisited();
  const updateStatus = useUpdateRouteStatus();

  const stops = useMemo(() => {
    if (!route) return [];
    const list = isUser ? route.user_route_stops : route.route_stops;
    return (list ?? []).slice().sort((a: any, b: any) => a.stop_order - b.stop_order);
  }, [route, isUser]);

  // Local cursor — for non-user routes or transient skips
  const [localCursor, setLocalCursor] = useState(0);
  const [localVisited, setLocalVisited] = useState<boolean[]>([]);
  const [view, setView] = useState<"map" | "list">("map");
  const [showExit, setShowExit] = useState(false);
  const [showConclusion, setShowConclusion] = useState(false);

  useEffect(() => {
    if (stops.length === 0) return;
    if (isUser) {
      const firstUnvisited = stops.findIndex((s: any) => !s.visited);
      setLocalCursor(firstUnvisited === -1 ? stops.length - 1 : firstUnvisited);
      setLocalVisited(stops.map((s: any) => !!s.visited));
    } else {
      setLocalVisited(new Array(stops.length).fill(false));
    }
  }, [stops.length, isUser]);

  if (!route || stops.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  const current = stops[localCursor];
  const currentEst = current?.establishment;
  const isLast = localCursor === stops.length - 1;
  const allDone = localVisited.every(Boolean) && localVisited.length === stops.length;

  const advance = async (visited: boolean) => {
    const next = [...localVisited];
    next[localCursor] = visited;
    setLocalVisited(next);

    if (isUser && visited && current?.id) {
      try { await markVisited.mutateAsync({ stopId: current.id, visited: true }); } catch { /* ok */ }
    }

    if (isLast) {
      if (isUser && id && next.every(Boolean)) {
        try { await updateStatus.mutateAsync({ id, status: "completed" }); } catch { /* ok */ }
      }
      setShowConclusion(true);
    } else {
      setLocalCursor(localCursor + 1);
    }
  };

  if (showConclusion) {
    const visited = localVisited.filter(Boolean).length;
    const skipped = localVisited.length - visited;
    return (
      <div className="min-h-screen bg-background pt-14">
        <GlobalHeader showBack onBack={() => navigate("/roteiros")} />
        <main className="max-w-2xl mx-auto px-4 pb-20 pt-4">
          <div className="text-center space-y-4 animate-scale-in py-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <PartyPopper className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Roteiro concluído!</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Você completou <span className="font-semibold text-foreground">"{route.title}"</span>
            </p>
            <div className="flex items-center justify-center gap-6 pt-2">
              <div><p className="text-2xl font-bold text-primary">{visited}</p><p className="text-xs text-muted-foreground">Visitados</p></div>
              <div className="w-px h-8 bg-border" />
              <div><p className="text-2xl font-bold text-muted-foreground">{skipped}</p><p className="text-xs text-muted-foreground">Pulados</p></div>
            </div>
            <Button className="w-full rounded-full mt-6 max-w-xs mx-auto" onClick={() => navigate("/roteiros")}>
              Voltar aos roteiros
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const validStops = stops.filter((s: any) => s.establishment?.latitude != null);
  const validStopsCoords = validStops.map((s: any) => ({
    lat: s.establishment.latitude,
    lng: s.establishment.longitude,
    name: s.establishment.name,
  }));

  return (
    <div className="min-h-screen bg-background pt-14">
      <GlobalHeader showBack onBack={() => setShowExit(true)} />

      <main className="max-w-2xl mx-auto pb-20">
        {/* Toggle map/list */}
        <div className="px-4 pt-3 flex justify-end">
          <div className="inline-flex bg-secondary rounded-full p-1">
            <button
              onClick={() => setView("map")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium gap-1.5 inline-flex items-center transition-all",
                view === "map" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground",
              )}
            >
              <MapIcon className="w-3.5 h-3.5" /> Mapa
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium gap-1.5 inline-flex items-center transition-all",
                view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground",
              )}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>
        </div>

        {view === "map" && validStops.length > 0 && (
          <div className="px-4 pt-3">
            <RoutePreviewMap
              stops={validStopsCoords}
              className="rounded-xl overflow-hidden border border-border"
              height={300}
            />
          </div>
        )}

        {view === "list" && currentEst && (
          <div className="relative aspect-[4/5] overflow-hidden mt-3 mx-4 rounded-xl">
            {(currentEst.image_url || currentEst.logo_url) && (
              <img src={currentEst.image_url || currentEst.logo_url} alt={currentEst.name} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs">
                Parada {localCursor + 1} de {stops.length}
              </Badge>
              <h2 className="text-white font-bold text-xl">{currentEst.name}</h2>
              <p className="text-white/70 text-sm">{currentEst.category}</p>
            </div>
          </div>
        )}

        <div className="px-4 pt-4 space-y-3">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1">
            {stops.map((_: any, i: number) => (
              <div key={i} className="flex items-center gap-1">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  i < localCursor
                    ? localVisited[i] ? "bg-success" : "bg-muted-foreground/40"
                    : i === localCursor
                      ? "bg-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
                      : "bg-muted",
                )} />
                {i < stops.length - 1 && <div className={cn("w-4 h-0.5 rounded-full", i < localCursor ? "bg-primary/50" : "bg-muted")} />}
              </div>
            ))}
          </div>

          {/* Current stop info */}
          {currentEst && (
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div>
                <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                  Parada {localCursor + 1} de {stops.length}
                </Badge>
                <h2 className="font-bold text-lg mt-1">{currentEst.name}</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {currentEst.rating > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-4 h-4 text-rating fill-rating" />{currentEst.rating}
                  </span>
                )}
                {currentEst.address && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="w-4 h-4 text-primary" />{currentEst.address}
                  </span>
                )}
              </div>
              <HowToGetThereButton
                establishment={{
                  name: currentEst.name,
                  latitude: currentEst.latitude,
                  longitude: currentEst.longitude,
                  distance_km: currentEst.distance_km,
                }}
              />
            </div>
          )}

          {/* Actions */}
          {isLast ? (
            <Button className="w-full rounded-full gap-2" onClick={() => advance(true)}>
              <CheckCircle2 className="w-4 h-4" /> Concluir roteiro 🎉
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full gap-2" onClick={() => advance(false)}>
                <SkipForward className="w-4 h-4" /> Pular
              </Button>
              <Button className="flex-1 rounded-full gap-2" onClick={() => advance(true)}>
                <CheckCircle2 className="w-4 h-4" /> Já visitei
              </Button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />

      <AlertDialog open={showExit} onOpenChange={setShowExit}>
        <AlertDialogContent className="rounded-2xl max-w-xs mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do roteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              {isUser
                ? "Seu progresso já está salvo. Você pode retomar quando quiser."
                : "Seu progresso será perdido."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Continuar</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={() => navigate(`/roteiros/${id}${isUser ? "?type=user" : ""}`)}>
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
