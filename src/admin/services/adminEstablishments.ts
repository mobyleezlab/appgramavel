import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Period = 7 | 30 | 90 | "all";
export type Quality = "all" | "no_photo" | "no_coords" | "no_hours" | "no_category" | "low_rating" | "no_impressions";
export type SortBy = "name" | "rating" | "impressions" | "favorites" | "checkins" | "recent";

function periodRange(days: Period) {
  const now = new Date();
  if (days === "all") return { sinceIso: "1970-01-01T00:00:00Z" };
  const since = new Date();
  since.setDate(now.getDate() - days);
  return { sinceIso: since.toISOString() };
}

export type EstRow = Tables<"establishments"> & {
  impressions: number;
  clicks: number;
  ctr: number;
  favorites: number;
  checkins: number;
  health: { complete: boolean; issues: string[] };
};

function computeHealth(e: Pick<Tables<"establishments">, "image_url" | "logo_url" | "latitude" | "longitude" | "opening_hours" | "hours_monday" | "category">): EstRow["health"] {
  const issues: string[] = [];
  if (!e.image_url && !e.logo_url) issues.push("Sem foto");
  if (e.latitude == null || e.longitude == null) issues.push("Sem coords");
  if (!e.opening_hours && !e.hours_monday) issues.push("Sem horário");
  if (!e.category) issues.push("Sem categoria");
  return { complete: issues.length === 0, issues };
}

// ---------- Catalog KPIs ----------
export async function getEstablishmentsKPIs(period: Period = 7) {
  const { sinceIso } = periodRange(period);

  const [estRes, eventsRes, couponsRes] = await Promise.all([
    supabase.from("establishments").select("id, image_url, logo_url, latitude, longitude, category, opening_hours, hours_monday, rating, is_open, is_popular"),
    supabase.from("feed_events").select("establishment_id, event_type").eq("event_type", "impression").gte("created_at", sinceIso),
    supabase.from("coupons").select("establishment_id").eq("status", "active"),
  ]);

  const list = estRes.data ?? [];
  const total = list.length;
  const open = list.filter(e => e.is_open).length;
  const populars = list.filter(e => e.is_popular).length;
  const ratings = list.map(e => e.rating ?? 0).filter(r => r > 0);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const incomplete = list.filter(e => computeHealth(e).issues.length > 0).length;
  const seen = new Set((eventsRes.data ?? []).map(e => e.establishment_id).filter(Boolean));
  const noImpressions = list.filter(e => !seen.has(e.id)).length;
  const withCoupon = new Set((couponsRes.data ?? []).map(c => c.establishment_id).filter(Boolean)).size;

  return { total, open, populars, avgRating, incomplete, noImpressions, withCoupon };
}

// ---------- List with enrichment ----------
export async function listEstablishments(opts: {
  search?: string;
  category?: string;
  status?: "all" | "open" | "closed" | "popular";
  quality?: Quality;
  sortBy?: SortBy;
  period?: Period;
} = {}): Promise<EstRow[]> {
  const { sinceIso } = periodRange(opts.period ?? 7);

  let q = supabase.from("establishments").select("*");
  if (opts.category && opts.category !== "Todos") q = q.eq("category", opts.category);
  if (opts.status === "open") q = q.eq("is_open", true);
  if (opts.status === "closed") q = q.eq("is_open", false);
  if (opts.status === "popular") q = q.eq("is_popular", true);
  const { data: ests } = await q;
  let list = ests ?? [];

  if (opts.search) {
    const s = opts.search.toLowerCase();
    list = list.filter(e => e.name.toLowerCase().includes(s) || e.slug?.toLowerCase().includes(s));
  }

  // Aggregate metrics per establishment
  const ids = list.map(e => e.id);
  const [evRes, favRes, ciRes] = await Promise.all([
    ids.length ? supabase.from("feed_events").select("establishment_id, event_type").in("establishment_id", ids).gte("created_at", sinceIso) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("user_favorites").select("establishment_id").in("establishment_id", ids).gte("created_at", sinceIso) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("check_ins").select("establishment_id").in("establishment_id", ids).gte("created_at", sinceIso) : Promise.resolve({ data: [] }),
  ]);

  const m: Record<string, { impressions: number; clicks: number; favorites: number; checkins: number }> = {};
  ids.forEach(id => { m[id] = { impressions: 0, clicks: 0, favorites: 0, checkins: 0 }; });
  (evRes.data ?? []).forEach((e: any) => {
    if (!e.establishment_id || !m[e.establishment_id]) return;
    if (e.event_type === "impression") m[e.establishment_id].impressions++;
    if (e.event_type === "click") m[e.establishment_id].clicks++;
  });
  (favRes.data ?? []).forEach((f: any) => { if (m[f.establishment_id]) m[f.establishment_id].favorites++; });
  (ciRes.data ?? []).forEach((c: any) => { if (m[c.establishment_id]) m[c.establishment_id].checkins++; });

  let rows: EstRow[] = list.map(e => {
    const d = m[e.id];
    return {
      ...e,
      impressions: d.impressions,
      clicks: d.clicks,
      ctr: d.impressions > 0 ? Math.round((d.clicks / d.impressions) * 1000) / 10 : 0,
      favorites: d.favorites,
      checkins: d.checkins,
      health: computeHealth(e),
    };
  });

  // Quality filter
  if (opts.quality && opts.quality !== "all") {
    rows = rows.filter(r => {
      switch (opts.quality) {
        case "no_photo": return !r.image_url && !r.logo_url;
        case "no_coords": return r.latitude == null || r.longitude == null;
        case "no_hours": return !r.opening_hours && !r.hours_monday;
        case "no_category": return !r.category;
        case "low_rating": return (r.rating ?? 0) > 0 && (r.rating ?? 0) < 3;
        case "no_impressions": return r.impressions === 0;
        default: return true;
      }
    });
  }

  // Sort
  const sortBy = opts.sortBy ?? "name";
  rows.sort((a, b) => {
    switch (sortBy) {
      case "rating": return (b.rating ?? 0) - (a.rating ?? 0);
      case "impressions": return b.impressions - a.impressions;
      case "favorites": return b.favorites - a.favorites;
      case "checkins": return b.checkins - a.checkins;
      case "recent": return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      case "name":
      default: return a.name.localeCompare(b.name);
    }
  });

  return rows;
}

// ---------- Performance for drawer ----------
export async function getEstablishmentPerformance(id: string, period: Period = 7) {
  const { sinceIso } = periodRange(period);
  const days = period === "all" ? 90 : period;

  const [estRes, evRes, favRes, ciRes, revRes, ucRes] = await Promise.all([
    supabase.from("establishments").select("*").eq("id", id).maybeSingle(),
    supabase.from("feed_events").select("event_type, created_at").eq("establishment_id", id).gte("created_at", sinceIso),
    supabase.from("user_favorites").select("id").eq("establishment_id", id).gte("created_at", sinceIso),
    supabase.from("check_ins").select("id").eq("establishment_id", id).gte("created_at", sinceIso),
    supabase.from("reviews").select("id, rating").eq("establishment_id", id).gte("created_at", sinceIso),
    (async () => {
      const { data: cps } = await supabase.from("coupons").select("id").eq("establishment_id", id);
      const ids = (cps ?? []).map(c => c.id);
      if (!ids.length) return { count: 0 };
      const { count } = await supabase.from("user_coupons").select("*", { count: "exact", head: true })
        .in("coupon_id", ids).eq("status", "used").gte("used_at", sinceIso);
      return { count: count ?? 0 };
    })(),
  ]);

  const events = evRes.data ?? [];
  const impressions = events.filter(e => e.event_type === "impression").length;
  const clicks = events.filter(e => e.event_type === "click").length;

  // timeseries
  const map: Record<string, { impressions: number; clicks: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    map[d.toISOString().slice(0, 10)] = { impressions: 0, clicks: 0 };
  }
  events.forEach(e => {
    const k = (e.created_at ?? "").slice(0, 10);
    if (!map[k]) return;
    if (e.event_type === "impression") map[k].impressions++;
    if (e.event_type === "click") map[k].clicks++;
  });
  const series = Object.entries(map).map(([date, v]) => ({ date, ...v }));

  return {
    establishment: estRes.data,
    impressions,
    clicks,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    favorites: favRes.data?.length ?? 0,
    checkins: ciRes.data?.length ?? 0,
    reviews: revRes.data?.length ?? 0,
    avgRating: revRes.data && revRes.data.length
      ? Math.round((revRes.data.reduce((s, r) => s + (r.rating ?? 0), 0) / revRes.data.length) * 10) / 10
      : 0,
    couponsRedeemed: ucRes.count,
    series,
  };
}

// ---------- Insights ----------
export async function getEstablishmentInsights(period: Period = 7) {
  const insights: { type: "positive" | "warning" | "info"; message: string }[] = [];
  const rows = await listEstablishments({ period });

  const noImp = rows.filter(r => r.impressions === 0).length;
  if (noImp > 0) insights.push({ type: "warning", message: `${noImp} estabelecimento(s) sem nenhuma impressão no período.` });

  const incomplete = rows.filter(r => !r.health.complete).length;
  if (incomplete > 0) insights.push({ type: "warning", message: `${incomplete} estabelecimento(s) com cadastro incompleto (foto/coords/horário).` });

  // top CTR by category
  const byCat: Record<string, { imp: number; clk: number }> = {};
  rows.forEach(r => {
    const c = r.category || "Outros";
    if (!byCat[c]) byCat[c] = { imp: 0, clk: 0 };
    byCat[c].imp += r.impressions;
    byCat[c].clk += r.clicks;
  });
  const cats = Object.entries(byCat)
    .filter(([, v]) => v.imp > 0)
    .map(([c, v]) => ({ c, ctr: (v.clk / v.imp) * 100 }))
    .sort((a, b) => b.ctr - a.ctr);
  if (cats.length > 0) {
    insights.push({ type: "positive", message: `${cats[0].c} é a categoria com maior CTR (${cats[0].ctr.toFixed(1)}%).` });
  }

  return insights.slice(0, 4);
}

// ---------- Bulk ops ----------
export async function bulkUpdate(ids: string[], patch: Partial<Tables<"establishments">>) {
  return supabase.from("establishments").update(patch).in("id", ids);
}

export async function togglePopular(id: string, value: boolean) {
  return supabase.from("establishments").update({ is_popular: value }).eq("id", id);
}

export async function duplicateEstablishment(id: string) {
  const { data: src } = await supabase.from("establishments").select("*").eq("id", id).maybeSingle();
  if (!src) return { error: new Error("Não encontrado") };
  const { id: _, created_at, updated_at, slug, name, ...rest } = src;
  const newName = `${name} (cópia)`;
  const newSlug = `${slug}-copy-${Date.now().toString(36)}`;
  return supabase.from("establishments").insert({ ...rest, name: newName, slug: newSlug } as never).select().single();
}
