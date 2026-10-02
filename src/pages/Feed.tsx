import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { CategoryBar } from "@/components/layout/CategoryBar";
import { PostCard } from "@/components/feed/PostCard";
import { ProximityCheckinCard } from "@/components/feed/ProximityCheckinCard";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPosts, queryKeys, prefetchExploreData, prefetchPostsFilter } from "@/lib/queries";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createCheckIn } from "@/services/checkIns";
import { toast } from "sonner";
import { CATEGORIES, type Post } from "@/data/mock";

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("cat");
  const searchQuery = searchParams.get("q") ?? "";

  const setSelectedCategory = useCallback(
    (cat: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (cat) next.set("cat", cat);
          else next.delete("cat");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [dismissedCheckin, setDismissedCheckin] = useState<string | null>(null);
  const [routeEstablishments, setRouteEstablishments] = useState<any[]>([]);
  const { coords } = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Cache por filtro: se já houver dados desse filtro, mostra na hora.
  // Caso contrário, mantém os posts do filtro anterior visíveis enquanto busca.
  const { data: rawPosts = [], isLoading: loading, isFetching } = useQuery({
    queryKey: queryKeys.posts({ category: selectedCategory, search: searchQuery }),
    queryFn: () => fetchPosts({ category: selectedCategory, search: searchQuery }),
    placeholderData: (prev) => prev,
  });

  // Skeleton só na primeiríssima carga (sem cache nem placeholder disponível)
  const showSkeleton = loading && rawPosts.length === 0;
  // Indicador sutil durante troca de filtro com cache anterior visível
  const showRefreshing = isFetching && !loading;

  const posts: Post[] = useMemo(
    () =>
      rawPosts.map((p: any) => ({
        id: p.id,
        image: p.image || "",
        caption: p.caption || "",
        establishment_id: p.establishment?.id || p.establishment_id,
        establishment_name: p.establishment?.name || "",
        establishment_slug: p.establishment?.slug || "",
        establishment_category: p.establishment?.category || "",
        establishment_avatar: p.establishment?.logo_url || "",
        likes: 0,
        user_id: "",
        user_name: "",
        user_avatar: "",
        rating: p.establishment?.rating || 0,
        total_reviews: p.establishment?.total_reviews || 0,
        distance_km: p.establishment?.distance_km || 0,
        is_popular: p.is_popular || p.establishment?.is_popular || false,
        reactions: (p.reactions || []).map((r: any) => ({ emoji: r.emoji, count: r.count || 0 })),
        recent_users: [],
        created_at: p.created_at || new Date().toISOString(),
        establishment: p.establishment,
      })),
    [rawPosts]
  );

  // Prefetch the next likely route (Explore) while user reads the feed
  useEffect(() => {
    const id = window.setTimeout(() => prefetchExploreData(qc), 600);
    return () => window.clearTimeout(id);
  }, [qc]);

  // Prefetch categorias adjacentes assim que a carga atual termina,
  // para que o próximo clique em filtro renderize instantaneamente do cache.
  useEffect(() => {
    if (loading) return;
    const labels = CATEGORIES.map((c) => c.label);
    const idx = selectedCategory ? labels.indexOf(selectedCategory) : -1;
    const neighbors: (string | null)[] = [];
    if (selectedCategory === null) {
      neighbors.push(labels[0], labels[1]);
    } else {
      neighbors.push(null); // "Todos" é o retorno mais comum
      if (idx >= 0) {
        if (labels[idx + 1]) neighbors.push(labels[idx + 1]);
        if (labels[idx - 1]) neighbors.push(labels[idx - 1]);
      }
    }
    const handle = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          neighbors.forEach((cat) => prefetchPostsFilter(qc, { category: cat }));
        })
      : (window.setTimeout(() => {
          neighbors.forEach((cat) => prefetchPostsFilter(qc, { category: cat }));
        }, 300) as unknown as number);
    return () => {
      if (window.cancelIdleCallback && typeof handle === "number") {
        try { window.cancelIdleCallback(handle); } catch { /* noop */ }
      } else {
        window.clearTimeout(handle as number);
      }
    };
  }, [loading, selectedCategory, qc]);

  // Load establishments from user's active routes (single nested query)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadRouteEstablishments() {
      const { data: routes } = await supabase
        .from("user_routes" as any)
        .select(
          "id, user_route_stops!inner(establishment_id, visited, establishment:establishments(id, name, slug, latitude, longitude))"
        )
        .eq("user_id", user!.id)
        .in("status", ["saved", "in_progress"])
        .eq("user_route_stops.visited", false);

      if (cancelled) return;
      if (!routes || routes.length === 0) {
        setRouteEstablishments([]);
        return;
      }

      const seen = new Set<string>();
      const ests: any[] = [];
      for (const r of routes) {
        for (const stop of (r as any).user_route_stops ?? []) {
          const est = stop.establishment;
          if (est && !seen.has(est.id)) {
            seen.add(est.id);
            ests.push(est);
          }
        }
      }
      setRouteEstablishments(ests);
    }
    loadRouteEstablishments();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Find nearest route establishment within 300m
  const nearbyCheckin = useMemo(() => {
    if (!coords || routeEstablishments.length === 0 || dismissedCheckin) return null;
    let nearest: { est: any; distance: number } | null = null;
    for (const est of routeEstablishments) {
      if (!est.latitude || !est.longitude) continue;
      const d = haversineMeters(coords.lat, coords.lng, Number(est.latitude), Number(est.longitude));
      if (d <= 300 && (!nearest || d < nearest.distance)) {
        nearest = { est, distance: d };
      }
    }
    return nearest;
  }, [coords, routeEstablishments, dismissedCheckin]);

  const handleCheckin = async () => {
    if (!nearbyCheckin || !user) return;
    try {
      await createCheckIn(nearbyCheckin.est.id, coords ? { lat: coords.lat, lng: coords.lng } : undefined, user.id);
      toast.success(`Check-in em ${nearbyCheckin.est.name} realizado!`);
      setDismissedCheckin(nearbyCheckin.est.id);
      window.dispatchEvent(new CustomEvent("checkin"));
    } catch {
      toast.error("Erro ao fazer check-in");
    }
  };

  const filteredPosts = posts;

  return (
    <div className="min-h-screen bg-background pt-14">
      <GlobalHeader />
      <CategoryBar selected={selectedCategory} onSelect={setSelectedCategory} />

      <main className="max-w-2xl mx-auto px-4 pb-20 pt-[88px]">
        {showRefreshing && (
          <div className="h-0.5 w-full bg-primary/20 overflow-hidden rounded-full mb-3" aria-hidden>
            <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
          </div>
        )}
        <div className={`space-y-4 transition-opacity duration-200 ${showRefreshing ? "opacity-70" : "opacity-100"}`}>
          {showSkeleton ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="w-full aspect-[4/5]" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))
          ) : (
            <>
              {filteredPosts.map((post, index) => (
                <PostCard key={post.id} post={post} isFirst={index === 0} />
              ))}
              {filteredPosts.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Nenhum post encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">Tente outra categoria</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {nearbyCheckin && (
        <ProximityCheckinCard
          name={nearbyCheckin.est.name}
          distance={Math.round(nearbyCheckin.distance)}
          onCheckin={handleCheckin}
        />
      )}

      <BottomNav />
    </div>
  );
}
