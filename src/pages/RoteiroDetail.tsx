import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, Clock, MapPin, Star, Mountain, Navigation, Edit3, CheckCircle2, RotateCcw, Play, Image as ImageIcon } from "lucide-react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_ROUTES, MOCK_ESTABLISHMENTS, type RouteItem } from "@/data/mock";
import { toast } from "sonner";
import { trackRoute } from "@/lib/routesTracking";

export default function RoteiroDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { userStatus?: "in_progress" | "completed"; completedStops?: number } | null;
  const userStatus = navState?.userStatus;
  const completedStops = navState?.completedStops ?? 0;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    if (id) trackRoute("route_view", id);
    return () => clearTimeout(timer);
  }, [id]);

  const route = MOCK_ROUTES.find(r => r.id === id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <GlobalHeader showBack />
        <main className="max-w-2xl mx-auto pb-20 pt-20">
          <Skeleton className="w-full aspect-[2/1] rounded-b-3xl" />
          <div className="px-4 pt-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-40 rounded-full" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
        <BottomNav />
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

  const getEstablishmentForStop = (stopName: string) => {
    return MOCK_ESTABLISHMENTS.find(e => e.name === stopName);
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader onBack={() => navigate("/roteiros")} showBack />

      <main className="max-w-2xl mx-auto pb-20">
        {/* Hero banner */}
        <div className="relative aspect-[2/1] overflow-hidden">
          <img src={route.image} alt={route.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h1 className="text-white font-bold text-xl">{route.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                <Clock className="w-3 h-3" />
                {route.duration}
              </Badge>
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                <Mountain className="w-3 h-3" />
                {route.difficulty}
              </Badge>
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                <MapPin className="w-3 h-3" />
                {route.stops.length} paradas
              </Badge>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-5">
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{route.description}</p>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Paradas do roteiro</h3>
            <div className="relative pl-8">
              <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-primary/20" />
              <div className="space-y-1">
                {route.stops.map((stop, i) => (
                  <div
                    key={i}
                    className="relative flex items-center gap-3 p-4 bg-card rounded-2xl border border-border/50 animate-fade-in-up"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="absolute -left-8 w-[30px] h-[30px] rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-10">
                      {i + 1}
                    </div>
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      <img src={stop.image} alt={stop.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{stop.name}</p>
                      <p className="text-xs text-muted-foreground">{stop.category}</p>
                    </div>
                    <Navigation className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons (contextual by user status) */}
          <div className="space-y-2 pb-4">
            {userStatus === "in_progress" && (
              <>
                <p className="text-xs text-center text-muted-foreground">
                  {completedStops} de {route.stops.length} paradas concluídas
                </p>
                <Button
                  className="w-full rounded-full gap-2"
                  onClick={() => navigate(`/roteiros/${route.id}/navegar`)}
                >
                  <Play className="w-4 h-4" />
                  Continuar roteiro
                </Button>
              </>
            )}

            {userStatus === "completed" && (
              <>
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  Roteiro concluído
                </div>
                <Button
                  className="w-full rounded-full gap-2"
                  onClick={() => navigate(`/roteiros/${route.id}/navegar`)}
                >
                  <RotateCcw className="w-4 h-4" />
                  Refazer roteiro
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-full gap-2"
                  onClick={() => navigate("/perfil/check-ins")}
                >
                  <ImageIcon className="w-4 h-4" />
                  Ver memórias
                </Button>
              </>
            )}

            {!userStatus && (
              <Button
                className="w-full rounded-full gap-2"
                onClick={() => navigate(`/roteiros/${route.id}/navegar`)}
              >
                <Navigation className="w-4 h-4" />
                Iniciar roteiro
              </Button>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
