import { supabase } from "@/integrations/supabase/client";

export type Period = 7 | 30 | 90 | "all";

function periodRange(days: Period) {
  const now = new Date();
  if (days === "all") {
    return { sinceIso: "1970-01-01T00:00:00Z", prevSinceIso: null, prevUntilIso: null };
  }
  const since = new Date();
  since.setDate(now.getDate() - days);
  const prevSince = new Date();
  prevSince.setDate(now.getDate() - days * 2);
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

async function countSince(table: string, column: string, sinceIso: string, untilIso?: string | null) {
  let q = supabase.from(table as never).select("*", { count: "exact", head: true }).gte(column, sinceIso);
  if (untilIso) q = q.lt(column, untilIso);
  const { count } = await q;
  return count ?? 0;
}

// ---------- Hero KPIs ----------
export async function getDashboardKPIs(period: Period = 7) {
  const { sinceIso, prevSinceIso, prevUntilIso } = periodRange(period);

  // active users = distinct user_id in feed_events (current period)
  const [eventsRes, prevEventsRes] = await Promise.all([
    supabase.from("feed_events").select("user_id, event_type").gte("created_at", sinceIso),
    prevSinceIso
      ? supabase.from("feed_events").select("user_id, event_type").gte("created_at", prevSinceIso).lt("created_at", prevUntilIso!)
      : Promise.resolve({ data: [] as { user_id: string | null; event_type: string }[] }),
  ]);
  const events = eventsRes.data ?? [];
  const prevEvents = (prevEventsRes as any).data ?? [];

  const activeUsers = new Set(events.filter(e => e.user_id).map(e => e.user_id)).size;
  const prevActiveUsers = new Set(prevEvents.filter((e: any) => e.user_id).map((e: any) => e.user_id)).size;

  const exploreSessions = events.filter(e => e.event_type === "explore_view").length;
  const prevExploreSessions = prevEvents.filter((e: any) => e.event_type === "explore_view").length;

  const feedClicks = events.filter(e => e.event_type === "click").length;
  const prevFeedClicks = prevEvents.filter((e: any) => e.event_type === "click").length;

  const [checkIns, prevCheckIns, couponsRedeemed, prevCouponsRedeemed, newUsers, prevNewUsers] = await Promise.all([
    countSince("check_ins", "created_at", sinceIso),
    prevSinceIso ? countSince("check_ins", "created_at", prevSinceIso, prevUntilIso) : Promise.resolve(0),
    (async () => {
      const { count } = await supabase.from("user_coupons").select("*", { count: "exact", head: true })
        .eq("status", "used").gte("used_at", sinceIso);
      return count ?? 0;
    })(),
    prevSinceIso ? (async () => {
      const { count } = await supabase.from("user_coupons").select("*", { count: "exact", head: true })
        .eq("status", "used").gte("used_at", prevSinceIso).lt("used_at", prevUntilIso!);
      return count ?? 0;
    })() : Promise.resolve(0),
    countSince("user_profiles", "created_at", sinceIso),
    prevSinceIso ? countSince("user_profiles", "created_at", prevSinceIso, prevUntilIso) : Promise.resolve(0),
  ]);

  return {
    activeUsers, exploreSessions, feedClicks, checkIns, couponsRedeemed, newUsers,
    deltas: {
      activeUsers: pctDelta(activeUsers, prevActiveUsers),
      exploreSessions: pctDelta(exploreSessions, prevExploreSessions),
      feedClicks: pctDelta(feedClicks, prevFeedClicks),
      checkIns: pctDelta(checkIns, prevCheckIns),
      couponsRedeemed: pctDelta(couponsRedeemed, prevCouponsRedeemed),
      newUsers: pctDelta(newUsers, prevNewUsers),
    },
  };
}

// ---------- Catalog health ----------
export async function getCatalogHealth() {
  const { data: ests } = await supabase
    .from("establishments")
    .select("id, image_url, logo_url, latitude, longitude, category, opening_hours, hours_monday, rating");

  const list = ests ?? [];
  const noPhoto = list.filter(e => !e.image_url && !e.logo_url).length;
  const noCoords = list.filter(e => e.latitude == null || e.longitude == null).length;
  const noHours = list.filter(e => !e.opening_hours && !e.hours_monday).length;
  const noCategory = list.filter(e => !e.category).length;
  const lowRating = list.filter(e => (e.rating ?? 0) > 0 && (e.rating ?? 0) < 3).length;

  const in7d = new Date(); in7d.setDate(in7d.getDate() + 7);
  const { count: expiringCoupons } = await supabase
    .from("coupons")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .lte("expires_at", in7d.toISOString())
    .gte("expires_at", new Date().toISOString());

  return {
    total: list.length,
    noPhoto, noCoords, noHours, noCategory, lowRating,
    expiringCoupons: expiringCoupons ?? 0,
  };
}

// ---------- Recent activity ----------
export type ActivityItem = {
  id: string;
  type: "user" | "checkin" | "review" | "post" | "coupon";
  title: string;
  subtitle?: string;
  createdAt: string;
};

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const [users, checkins, reviews, posts, coupons] = await Promise.all([
    supabase.from("user_profiles").select("id, name, created_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("check_ins").select("id, user_id, establishment_id, created_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("reviews").select("id, rating, establishment_id, created_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("posts").select("id, establishment_id, caption, created_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("user_coupons").select("id, coupon_id, used_at").eq("status", "used").not("used_at", "is", null).order("used_at", { ascending: false }).limit(limit),
  ]);

  // resolve names
  const estIds = new Set<string>();
  checkins.data?.forEach(r => r.establishment_id && estIds.add(r.establishment_id));
  reviews.data?.forEach(r => r.establishment_id && estIds.add(r.establishment_id));
  posts.data?.forEach(r => r.establishment_id && estIds.add(r.establishment_id));
  const couponIds = (coupons.data ?? []).map(c => c.coupon_id);

  const [estsRes, couponsRes] = await Promise.all([
    estIds.size ? supabase.from("establishments").select("id, name").in("id", Array.from(estIds)) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    couponIds.length ? supabase.from("coupons").select("id, title").in("id", couponIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);
  const estName = new Map((estsRes.data ?? []).map(e => [e.id, e.name]));
  const couponName = new Map((couponsRes.data ?? []).map(c => [c.id, c.title]));

  const items: ActivityItem[] = [];
  users.data?.forEach(u => items.push({
    id: `u-${u.id}`, type: "user",
    title: `Novo usuário: ${u.name ?? "sem nome"}`,
    createdAt: u.created_at ?? "",
  }));
  checkins.data?.forEach(c => items.push({
    id: `c-${c.id}`, type: "checkin",
    title: `Check-in em ${estName.get(c.establishment_id) ?? "—"}`,
    createdAt: c.created_at ?? "",
  }));
  reviews.data?.forEach(r => items.push({
    id: `r-${r.id}`, type: "review",
    title: `Avaliação ${r.rating}★ em ${estName.get(r.establishment_id) ?? "—"}`,
    createdAt: r.created_at ?? "",
  }));
  posts.data?.forEach(p => items.push({
    id: `p-${p.id}`, type: "post",
    title: `Novo post em ${estName.get(p.establishment_id) ?? "—"}`,
    subtitle: p.caption ?? undefined,
    createdAt: p.created_at ?? "",
  }));
  coupons.data?.forEach(uc => items.push({
    id: `uc-${uc.id}`, type: "coupon",
    title: `Cupom resgatado: ${couponName.get(uc.coupon_id) ?? "—"}`,
    createdAt: uc.used_at ?? "",
  }));

  return items
    .filter(i => i.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

// ---------- City distribution (users) ----------
export async function getCityDistribution() {
  const { data } = await supabase.from("user_profiles").select("city");
  const map = new Map<string, number>();
  (data ?? []).forEach(p => {
    const c = (p.city || "Desconhecido").trim();
    map.set(c, (map.get(c) ?? 0) + 1);
  });
  const total = (data ?? []).length;
  return Array.from(map.entries())
    .map(([city, count]) => ({ city, count, pct: total ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

// ---------- Engagement timeseries (impressions / clicks / checkins) ----------
export async function getEngagementTimeseries(period: Period) {
  const days = period === "all" ? 90 : period;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const [evRes, ciRes] = await Promise.all([
    supabase.from("feed_events").select("created_at, event_type").gte("created_at", sinceIso),
    supabase.from("check_ins").select("created_at").gte("created_at", sinceIso),
  ]);

  const map: Record<string, { impressions: number; clicks: number; checkins: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    map[d.toISOString().slice(0, 10)] = { impressions: 0, clicks: 0, checkins: 0 };
  }
  evRes.data?.forEach(e => {
    const k = (e.created_at ?? "").slice(0, 10);
    if (!map[k]) return;
    if (e.event_type === "impression") map[k].impressions++;
    if (e.event_type === "click") map[k].clicks++;
  });
  ciRes.data?.forEach(c => {
    const k = (c.created_at ?? "").slice(0, 10);
    if (map[k]) map[k].checkins++;
  });

  return Object.entries(map).map(([date, v]) => ({ date, ...v }));
}

// ---------- Dashboard insights ----------
export async function getDashboardInsights(period: Period = 7): Promise<
  { type: "positive" | "warning" | "info"; message: string }[]
> {
  const insights: { type: "positive" | "warning" | "info"; message: string }[] = [];
  const health = await getCatalogHealth();
  if (health.noCoords > 0) {
    insights.push({ type: "warning", message: `${health.noCoords} estabelecimento(s) sem coordenadas — não aparecem no mapa.` });
  }
  if (health.noPhoto > 0) {
    insights.push({ type: "warning", message: `${health.noPhoto} estabelecimento(s) sem foto reduzem o engajamento no feed.` });
  }
  if (health.expiringCoupons > 0) {
    insights.push({ type: "info", message: `${health.expiringCoupons} cupom(ns) expiram nos próximos 7 dias.` });
  }
  const kpis = await getDashboardKPIs(period);
  if ((kpis.deltas.activeUsers ?? 0) > 20) {
    insights.push({ type: "positive", message: `Usuários ativos cresceram ${kpis.deltas.activeUsers}% no período.` });
  }
  return insights.slice(0, 4);
}
