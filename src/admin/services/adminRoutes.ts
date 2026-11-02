import { supabase } from "@/integrations/supabase/client";

export type Period = 7 | 30 | 90 | "all";

function periodRange(days: Period) {
  const now = new Date();
  if (days === "all") {
    return { sinceIso: "1970-01-01T00:00:00Z", prevSinceIso: null, prevUntilIso: null };
  }
  const since = new Date(); since.setDate(now.getDate() - days);
  const prevSince = new Date(); prevSince.setDate(now.getDate() - days * 2);
  return {
    sinceIso: since.toISOString(),
    prevSinceIso: prevSince.toISOString(),
    prevUntilIso: since.toISOString(),
  };
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

// =========================================================
// KPIs (somente roteiros sugeridos: routes + route_stops)
// =========================================================
export async function getRouteKPIs(_period: Period = 30) {
  const { data, error } = await supabase.from("routes").select("id, is_featured, route_stops(id)");
  if (error) throw error;
  const routes = data ?? [];
  const totalStops = routes.reduce((acc, r) => acc + ((r.route_stops as any[])?.length ?? 0), 0);
  return {
    totalSuggested: routes.length,
    featured: routes.filter(r => r.is_featured).length,
    totalStops,
    avgStops: routes.length ? Math.round((totalStops / routes.length) * 10) / 10 : 0,
  };
}

// =========================================================
// Roteiros sugeridos
// =========================================================
export async function getSuggestedRoutesPerformance(_period: Period = 30) {
  const { data: routes, error } = await supabase
    .from("routes")
    .select("id, title, image_url, duration, difficulty, is_featured, sort_order, route_stops(id)")
    .order("sort_order");
  if (error) throw error;

  return (routes ?? []).map(r => ({
    id: r.id as string,
    title: r.title as string,
    image_url: r.image_url as string | null,
    duration: r.duration as string,
    difficulty: (r.difficulty ?? "Fácil") as string,
    is_featured: !!r.is_featured,
    stops: (r.route_stops as any[])?.length ?? 0,
  }));
}

// =========================================================
// CRUD
// =========================================================
export async function createRoute(payload: {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  duration: string;
  difficulty?: string;
  image_url?: string | null;
  is_featured?: boolean;
  icon_name?: string | null;
}, stops: { establishment_id: string; note?: string | null }[]) {
  const { data: route, error } = await supabase
    .from("routes")
    .insert(payload as never)
    .select("id")
    .single();
  if (error || !route) throw error ?? new Error("Falha ao criar roteiro");

  if (stops.length > 0) {
    const rows = stops.map((s, i) => ({
      route_id: route.id,
      establishment_id: s.establishment_id,
      stop_order: i + 1,
      note: s.note ?? null,
    }));
    const { error: stopsErr } = await supabase.from("route_stops").insert(rows as never);
    if (stopsErr) throw stopsErr;
  }
  return route.id as string;
}

export async function updateRoute(
  id: string,
  payload: Partial<{
    title: string;
    subtitle: string | null;
    description: string | null;
    duration: string;
    difficulty: string;
    image_url: string | null;
    is_featured: boolean;
    icon_name: string | null;
  }>,
  stops?: { establishment_id: string; note?: string | null }[]
) {
  const { error } = await supabase.from("routes").update(payload as never).eq("id", id);
  if (error) throw error;

  if (stops) {
    await supabase.from("route_stops").delete().eq("route_id", id);
    if (stops.length > 0) {
      const rows = stops.map((s, i) => ({
        route_id: id,
        establishment_id: s.establishment_id,
        stop_order: i + 1,
        note: s.note ?? null,
      }));
      const { error: e2 } = await supabase.from("route_stops").insert(rows as never);
      if (e2) throw e2;
    }
  }
}

export async function deleteRoute(id: string) {
  const stops = await supabase.from("route_stops").delete().eq("route_id", id);
  if (stops.error) throw stops.error;
  const route = await supabase.from("routes").delete().eq("id", id);
  if (route.error) throw route.error;
}

export async function duplicateRoute(id: string) {
  const { data: src } = await supabase
    .from("routes")
    .select("*, route_stops(establishment_id, stop_order, note)")
    .eq("id", id)
    .single();
  if (!src) throw new Error("Roteiro não encontrado");

  const { route_stops, id: _id, created_at, ...rest } = src as any;
  const payload = { ...rest, title: `${rest.title} (cópia)`, is_featured: false };
  const { data: copy } = await supabase.from("routes").insert(payload as never).select("id").single();
  if (!copy) throw new Error("Falha ao duplicar");

  if (route_stops?.length) {
    const sorted = [...route_stops].sort((a: any, b: any) => a.stop_order - b.stop_order);
    const rows = sorted.map((s: any, i: number) => ({
      route_id: copy.id,
      establishment_id: s.establishment_id,
      stop_order: i + 1,
      note: s.note ?? null,
    }));
    await supabase.from("route_stops").insert(rows as never);
  }
  return copy.id as string;
}

export async function getRouteWithStops(id: string) {
  const { data } = await supabase
    .from("routes")
    .select("*, route_stops(id, establishment_id, stop_order, note, establishment:establishments(id, name, category, logo_url))")
    .eq("id", id)
    .single();
  return data;
}

// =========================================================
// Sugestões personalizadas (engine simples)
// =========================================================
export async function getPersonalizedSuggestions(period: Period = 30) {
  const { sinceIso } = periodRange(period);

  // 1. Top categorias por engajamento (cliques no feed/explore + reviews)
  const { data: events } = await supabase
    .from("feed_events")
    .select("event_type, establishment_id")
    .or("event_type.eq.click,event_type.like.explore_card_click%")
    .gte("created_at", sinceIso);

  // 2. Estabelecimentos completos com lat/lng
  const { data: ests } = await supabase
    .from("establishments")
    .select("id, name, category, latitude, longitude, rating, total_reviews, logo_url")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const clickByEst: Record<string, number> = {};
  (events ?? []).forEach(e => {
    if (e.establishment_id) clickByEst[e.establishment_id] = (clickByEst[e.establishment_id] || 0) + 1;
  });

  const scored = (ests ?? []).map(e => {
    const score =
      (clickByEst[e.id] ?? 0) * 0.5 +
      Number(e.rating ?? 0) * 5 +
      Number(e.total_reviews ?? 0) * 0.2;
    return { ...e, score, clicks: clickByEst[e.id] ?? 0 };
  });

  // 3. Agrupa top 12 por categoria
  const top = scored.sort((a, b) => b.score - a.score).slice(0, 25);
  const byCat: Record<string, typeof scored> = {};
  top.forEach(e => {
    const c = e.category ?? "Outros";
    if (!byCat[c]) byCat[c] = [];
    byCat[c].push(e);
  });

  // 4. Monta até 3 sugestões com 3-5 paradas próximas (Haversine ≤ 3km)
  const haversine = (a: any, b: any) => {
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  const suggestions: {
    title: string;
    category: string;
    stops: { id: string; name: string; logo_url: string | null; category: string }[];
  }[] = [];

  Object.entries(byCat).forEach(([cat, items]) => {
    if (suggestions.length >= 3) return;
    if (items.length < 2) return;
    const seed = items[0];
    const cluster = [seed, ...items.slice(1).filter(i => haversine(seed, i) <= 3)].slice(0, 5);
    if (cluster.length < 2) return;
    suggestions.push({
      title: `Tour ${cat} — Top picks`,
      category: cat,
      stops: cluster.map(c => ({ id: c.id, name: c.name, logo_url: c.logo_url, category: c.category })),
    });
  });

  return suggestions;
}

// =========================================================
// Insights automáticos
// =========================================================
export async function getRouteAdminInsights(period: Period = 30) {
  const insights: { type: "warning" | "info" | "positive"; message: string }[] = [];
  const perf = await getSuggestedRoutesPerformance(period);

  const empty = perf.filter(r => r.stops < 2);
  if (empty.length) {
    insights.push({
      type: "warning",
      message: `${empty.length} roteiro(s) têm menos de 2 paradas — complete-os antes de destacar.`,
    });
  }
  if (perf.length && !perf.some(r => r.is_featured)) {
    insights.push({ type: "info", message: "Nenhum roteiro está em destaque no app." });
  }
  return insights.slice(0, 4);
}

// =========================================================
// Establishments lite (para o editor)
// =========================================================
export async function listEstablishmentsLite() {
  const { data } = await supabase
    .from("establishments")
    .select("id, name, category, logo_url")
    .order("name");
  return data ?? [];
}
