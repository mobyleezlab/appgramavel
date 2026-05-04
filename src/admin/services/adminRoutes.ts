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
// KPIs
// =========================================================
export async function getRouteKPIs(period: Period = 30) {
  const { sinceIso, prevSinceIso, prevUntilIso } = periodRange(period);

  const [routesRes, urCurr, urPrev, stopsVisitedCurr, stopsVisitedPrev] = await Promise.all([
    supabase.from("routes").select("id", { count: "exact", head: true }),
    supabase
      .from("user_routes")
      .select("id, status, started_at, completed_at, created_at, title")
      .gte("created_at", sinceIso),
    prevSinceIso
      ? supabase
          .from("user_routes")
          .select("id, status, started_at, completed_at")
          .gte("created_at", prevSinceIso)
          .lt("created_at", prevUntilIso!)
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from("user_route_stops")
      .select("id", { count: "exact", head: true })
      .eq("visited", true)
      .gte("visited_at", sinceIso),
    prevSinceIso
      ? supabase
          .from("user_route_stops")
          .select("id", { count: "exact", head: true })
          .eq("visited", true)
          .gte("visited_at", prevSinceIso)
          .lt("visited_at", prevUntilIso!)
      : Promise.resolve({ count: 0 } as any),
  ]);

  const curr = (urCurr.data ?? []) as any[];
  const prev = (urPrev as any).data ?? [];

  const started = curr.length;
  const completed = curr.filter(r => r.status === "completed").length;
  const completionRate = started > 0 ? Math.round((completed / started) * 1000) / 10 : 0;

  // tempo médio de conclusão (h)
  const completedWithTimes = curr.filter(r => r.completed_at && r.started_at);
  const avgCompletionHours = completedWithTimes.length
    ? Math.round(
        (completedWithTimes.reduce((acc, r) => {
          return acc + (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime());
        }, 0) /
          completedWithTimes.length) /
          36e5 *
          10
      ) / 10
    : 0;

  // personalizados = título não bate com nenhum oficial
  const { data: officialRoutes } = await supabase.from("routes").select("title");
  const officialTitles = new Set((officialRoutes ?? []).map(r => (r.title ?? "").trim().toLowerCase()));
  const personalized = curr.filter(r => !officialTitles.has((r.title ?? "").trim().toLowerCase())).length;

  // Previous deltas
  const prevStarted = prev.length;
  const prevCompleted = prev.filter((r: any) => r.status === "completed").length;
  const prevCompletionRate = prevStarted > 0 ? (prevCompleted / prevStarted) * 100 : 0;
  const prevPersonalized = prev.filter((r: any) => !officialTitles.has((r.title ?? "").trim().toLowerCase())).length;

  return {
    totalSuggested: routesRes.count ?? 0,
    started,
    completed,
    completionRate,
    avgCompletionHours,
    personalized,
    stopsVisited: stopsVisitedCurr.count ?? 0,
    deltas: {
      started: pctDelta(started, prevStarted),
      completed: pctDelta(completed, prevCompleted),
      completionRate: pctDelta(completionRate, prevCompletionRate),
      personalized: pctDelta(personalized, prevPersonalized),
      stopsVisited: pctDelta(stopsVisitedCurr.count ?? 0, (stopsVisitedPrev as any).count ?? 0),
    },
  };
}

// =========================================================
// Performance dos roteiros sugeridos
// =========================================================
export async function getSuggestedRoutesPerformance(period: Period = 30) {
  const { sinceIso } = periodRange(period);

  const { data: routes } = await supabase
    .from("routes")
    .select("id, title, image_url, duration, difficulty, is_featured, sort_order, route_stops(id)")
    .order("sort_order");

  const { data: userRoutes } = await supabase
    .from("user_routes")
    .select("id, title, status, started_at, updated_at")
    .gte("created_at", sinceIso);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return (routes ?? []).map(r => {
    const matches = (userRoutes ?? []).filter(
      ur => (ur.title ?? "").trim().toLowerCase() === (r.title ?? "").trim().toLowerCase()
    );
    const started = matches.length;
    const completed = matches.filter(m => m.status === "completed").length;
    const abandoned = matches.filter(
      m => m.status === "in_progress" && m.updated_at && new Date(m.updated_at) < sevenDaysAgo
    ).length;

    return {
      id: r.id as string,
      title: r.title as string,
      image_url: r.image_url as string | null,
      duration: r.duration as string,
      difficulty: (r.difficulty ?? "Fácil") as string,
      is_featured: !!r.is_featured,
      stops: (r.route_stops as any[])?.length ?? 0,
      started,
      completed,
      abandoned,
      completionRate: started > 0 ? Math.round((completed / started) * 1000) / 10 : 0,
    };
  });
}

// =========================================================
// Roteiros personalizados dos usuários
// =========================================================
export async function listUserRoutes(period: Period = 30, limit = 50) {
  const { sinceIso } = periodRange(period);

  const { data } = await supabase
    .from("user_routes")
    .select("id, title, status, created_at, completed_at, user_id, user_route_stops(id, visited)")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit);

  const userIds = Array.from(new Set((data ?? []).map(d => d.user_id))).filter(Boolean) as string[];
  const { data: profiles } = userIds.length
    ? await supabase.from("user_profiles").select("id, name, avatar_url").in("id", userIds)
    : { data: [] as any[] };

  return (data ?? []).map(r => {
    const stops = (r.user_route_stops as any[]) ?? [];
    const profile = profiles?.find((p: any) => p.id === r.user_id);
    return {
      id: r.id as string,
      title: r.title as string,
      status: r.status as "saved" | "in_progress" | "completed",
      created_at: r.created_at as string,
      completed_at: r.completed_at as string | null,
      stopsTotal: stops.length,
      stopsVisited: stops.filter(s => s.visited).length,
      userName: profile?.name ?? "Usuário",
      userAvatar: profile?.avatar_url ?? null,
    };
  });
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
  await supabase.from("route_stops").delete().eq("route_id", id);
  await supabase.from("routes").delete().eq("id", id);
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

// Promove um roteiro de usuário para roteiro sugerido oficial
export async function promoteUserRouteToSuggested(userRouteId: string) {
  const { data: ur } = await supabase
    .from("user_routes")
    .select("title, description, user_route_stops(establishment_id, stop_order)")
    .eq("id", userRouteId)
    .single();
  if (!ur) throw new Error("Roteiro de usuário não encontrado");

  const stops = ((ur.user_route_stops as any[]) ?? [])
    .sort((a, b) => a.stop_order - b.stop_order)
    .map(s => ({ establishment_id: s.establishment_id }));

  return createRoute(
    {
      title: ur.title,
      description: ur.description,
      duration: "Personalizado",
      difficulty: "Fácil",
      is_featured: false,
    },
    stops
  );
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

  // Alta taxa de abandono
  const highAbandon = perf.find(r => r.started >= 5 && r.abandoned / r.started > 0.5);
  if (highAbandon) {
    insights.push({
      type: "warning",
      message: `"${highAbandon.title}" tem ${highAbandon.abandoned}/${highAbandon.started} abandonos (>50%) — revise duração ou paradas.`,
    });
  }

  // Roteiro nunca iniciado
  const dead = perf.find(r => r.started === 0);
  if (dead) {
    insights.push({
      type: "info",
      message: `"${dead.title}" não foi iniciado por nenhum usuário no período.`,
    });
  }

  // Top roteiro
  const top = [...perf].sort((a, b) => b.completed - a.completed)[0];
  if (top && top.completed > 0) {
    insights.push({
      type: "positive",
      message: `"${top.title}" lidera em conclusões (${top.completed}) — destaque-o no feed.`,
    });
  }

  // Roteiros personalizados em volume
  const { sinceIso } = periodRange(period);
  const { data: ur } = await supabase
    .from("user_routes")
    .select("id")
    .gte("created_at", sinceIso);
  if ((ur?.length ?? 0) >= 5) {
    insights.push({
      type: "info",
      message: `${ur!.length} usuários criaram roteiros personalizados — analise os padrões para oficializar novos.`,
    });
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
