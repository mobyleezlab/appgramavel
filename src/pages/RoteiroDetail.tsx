import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Clock, MapPin, Mountain, CheckCircle2, RotateCcw, Play, Navigation, Sparkles, Edit3 } from "lucide-react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import RoutePreviewMap from "@/components/routes/RoutePreviewMap";
import { HowToGetThereButton } from "@/components/routes/HowToGetThereButton";
import { useCloneSuggestedRoute, useMyRoute, useStartRoute, useSuggestedRoute } from "@/hooks/useRoutes";
import { getMultiLegRoute, formatKm, formatMin } from "@/lib/routeEstimates";
import { toast } from "sonner";

export default function RoteiroDetail() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isUser = params.get("type") === "user";

  const suggested = useSuggestedRoute(!isUser ? id : undefined);
  const mine = useMyRoute(isUser ? id : undefined);
  const startRoute = useStartRoute();
  const clone = useCloneSuggestedRoute();

  const route: any = isUser ? mine.data : suggested.data;
  const loading = isUser ? mine.isLoading : suggested.isLoading;

  const stops = useMemo(() => {
    if (!route) return [];
    const list = isUser ? route.user_route_stops : route.route_stops;
    return (list ?? [])
      .slice()
      .sort((a: any, b: any) => a.stop_order - b.stop_order)
      .map((s: any) => ({ ...s, establishment: s.establishment }));
  }, [route, isUser]);

  const validStops = stops.filter((s: any) => s.establishment?.latitude != null);
  const visitedCount = isUser ? stops.filter((s: any) => s.visited).length : 0;

  const [estimate, setEstimate] = useState<{ km: number; min: number; coords: [number, number][] } | null>(null);

  useEffect(() => {
    if (validStops.length < 2) return;
    const points = validStops.map((s: any) => ({ lat: s.establishment.latitude, lng: s.establishment.longitude }));
    getMultiLegRoute(points).then((r) => {
      if (r) setEstimate({ km: r.totalDistanceKm, min: r.totalDurationMin, coords: r.fullCoordinates });
    });
  }, [validStops.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <GlobalHeader showBack />
        <main className="max-w-2xl mx-auto pb-20">
          <Skeleton className="aspect-[2/1]" />
          <div className="px-4 pt-4 space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Roteiro não encontrado</p>
      </div>
    );
  }

  const cover = isUser
    ? route.cover_url || stops[0]?.establishment?.image_url
    : route.image_url;
  const userStatus: "saved" | "in_progress" | "completed" | undefined = isUser
    ? route.status
    : undefined;

  const handleStart = async () => {
    if (isUser && id) {
      try { await startRoute.mutateAsync(id); } catch { /* ok */ }
      navigate(`/roteiros/${id}/navegar?type=user`);
    } else {
      navigate(`/roteiros/${id}/navegar`);
    }
  };

  const handlePersonalize = async () => {
    if (!id) return;
    try {
      const newId = await clone.mutateAsync(id);
      toast.success("Roteiro adicionado aos seus");
      if (newId) navigate(`/roteiros/${newId}/editar`);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível clonar");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader showBack onBack={() => navigate("/roteiros")} />

      <main className="max-w-2xl mx-auto pb-32">
        {/* Hero */}
        <div className="relative aspect-[2/1] overflow-hidden">
          {cover && <img src={cover} alt={route.title} className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h1 className="text-white font-bold text-xl">{route.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {route.duration && (
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                  <Clock className="w-3 h-3" />{route.duration}
                </Badge>
              )}
              {route.difficulty && (
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                  <Mountain className="w-3 h-3" />{route.difficulty}
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                <MapPin className="w-3 h-3" />{stops.length} paradas
              </Badge>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-5">
          {route.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{route.description}</p>
          )}

          {/* Stats */}
          {estimate && (
            <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-around text-center">
              <div>
                <p className="text-xs text-muted-foreground">Distância</p>
                <p className="font-semibold">{formatKm(estimate.km)}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">~ Carro</p>
                <p className="font-semibold">{formatMin(estimate.min)}</p>
              </div>
              {isUser && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground">Progresso</p>
                    <p className="font-semibold">{visitedCount}/{stops.length}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mini map */}
          {validStops.length > 0 && (
            <RoutePreviewMap
              stops={validStops.map((s: any) => ({
                lat: s.establishment.latitude,
                lng: s.establishment.longitude,
                name: s.establishment.name,
              }))}
              polyline={estimate?.coords}
              className="rounded-xl overflow-hidden border border-border"
              height={192}
            />
          )}

          {/* Personalize CTA for suggested */}
          {!isUser && (
            <Button
              variant="outline"
              className="w-full rounded-full gap-2"
              onClick={handlePersonalize}
              disabled={clone.isPending}
            >
              <Sparkles className="w-4 h-4" />
              Personalizar este roteiro
            </Button>
          )}

          {/* Edit shortcut for user routes */}
          {isUser && (
            <Button
              variant="outline"
              className="w-full rounded-full gap-2"
              onClick={() => navigate(`/roteiros/${id}/editar`)}
            >
              <Edit3 className="w-4 h-4" />
              Editar roteiro
            </Button>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Paradas do roteiro</h3>
            <div className="relative pl-8 space-y-2">
              <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-primary/20" />
              {stops.map((s: any, i: number) => {
                const e = s.establishment;
                if (!e) return null;
                const visited = isUser && s.visited;
                return (
                  <div
                    key={i}
                    className="relative flex items-center gap-3 p-3 bg-card rounded-2xl border border-border/50"
                  >
                    <div className={`absolute -left-8 w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                      visited ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
                    }`}>
                      {visited ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-secondary">
                      {(e.image_url || e.logo_url) && (
                        <img src={e.image_url || e.logo_url} alt={e.name} className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {userStatus === "in_progress" ? (
            <Button className="w-full rounded-full gap-2" onClick={handleStart}>
              <Play className="w-4 h-4" /> Continuar roteiro
            </Button>
          ) : userStatus === "completed" ? (
            <Button className="w-full rounded-full gap-2" onClick={handleStart}>
              <RotateCcw className="w-4 h-4" /> Refazer roteiro
            </Button>
          ) : (
            <Button className="w-full rounded-full gap-2" onClick={handleStart}>
              <Navigation className="w-4 h-4" /> Iniciar roteiro
            </Button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
