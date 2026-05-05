import { supabase } from "@/integrations/supabase/client";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

// ---------- types ----------
export type Period = 7 | 30 | 90 | "all";

export type AudienceSegment =
  | { kind: "all" }
  | { kind: "city"; city: "Gramado" | "Canela" }
  | { kind: "engagement"; bucket: "active7" | "active30" | "inactive30" }
  | { kind: "ids"; ids: string[] };

export interface NotificationPayload {
  id?: string;
  title: string;
  body: string;
  type?: string;
  image_url?: string | null;
  redirect_type?: "internal" | "external" | null;
  redirect_url?: string | null;
  reference_id?: string | null;
  segment?: AudienceSegment;
  scheduled_at?: string | null;
}

// ---------- helpers ----------
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

function encodeSegment(seg?: AudienceSegment): { target: string; segment: string | null; target_ids: string[] | null } {
  if (!seg || seg.kind === "all") return { target: "all", segment: null, target_ids: null };
  if (seg.kind === "city") return { target: "segment", segment: `city:${seg.city}`, target_ids: null };
  if (seg.kind === "engagement") return { target: "segment", segment: `engagement:${seg.bucket}`, target_ids: null };
  return { target: "ids", segment: null, target_ids: seg.ids };
}

function decodeSegment(row: any): AudienceSegment {
  if (row?.target === "ids" && Array.isArray(row.target_ids)) return { kind: "ids", ids: row.target_ids };
  if (row?.segment?.startsWith?.("city:")) return { kind: "city", city: row.segment.split(":")[1] as any };
  if (row?.segment?.startsWith?.("engagement:")) return { kind: "engagement", bucket: row.segment.split(":")[1] as any };
  return { kind: "all" };
}

// ---------- audience ----------
export async function resolveAudience(seg: AudienceSegment): Promise<string[]> {
  if (seg.kind === "ids") return seg.ids;

  let query = supabase.from("user_profiles").select("id, city, last_seen_at");

  if (seg.kind === "city") {
    query = query.eq("city", seg.city);
  }

  const { data } = await query;
  let rows = data ?? [];

  if (seg.kind === "engagement") {
    const now = Date.now();
    const cutoff = (days: number) => now - days * 86400_000;
    if (seg.bucket === "active7") rows = rows.filter(r => r.last_seen_at && new Date(r.last_seen_at).getTime() >= cutoff(7));
    else if (seg.bucket === "active30") rows = rows.filter(r => r.last_seen_at && new Date(r.last_seen_at).getTime() >= cutoff(30));
    else rows = rows.filter(r => !r.last_seen_at || new Date(r.last_seen_at).getTime() < cutoff(30));
  }

  const ids = rows.map(r => r.id);
  return ids.length ? ids : [DEV_USER_ID];
}

export async function estimateAudience(seg: AudienceSegment): Promise<number> {
  const ids = await resolveAudience(seg);
  return ids.length;
}

// ---------- CRUD ----------
export async function getAdminNotifications() {
  return supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(200);
}

export async function createNotification(payload: NotificationPayload) {
  const { target, segment, target_ids } = encodeSegment(payload.segment);
  return supabase.from("admin_notifications").insert({
    title: payload.title,
    body: payload.body,
    type: payload.type || "manual",
    image_url: payload.image_url ?? null,
    redirect_type: payload.redirect_type ?? null,
    redirect_url: payload.redirect_url ?? null,
    reference_id: payload.reference_id ?? null,
    target,
    segment,
    target_ids,
    scheduled_at: payload.scheduled_at ?? null,
  } as never).select().single();
}

export async function updateNotification(id: string, payload: Partial<NotificationPayload>) {
  const patch: Record<string, unknown> = {
    title: payload.title,
    body: payload.body,
    image_url: payload.image_url,
    redirect_type: payload.redirect_type,
    redirect_url: payload.redirect_url,
    type: payload.type,
    scheduled_at: payload.scheduled_at,
  };
  if (payload.segment) {
    const { target, segment, target_ids } = encodeSegment(payload.segment);
    patch.target = target;
    patch.segment = segment;
    patch.target_ids = target_ids;
  }
  return supabase.from("admin_notifications").update(patch as never).eq("id", id).select().single();
}

export async function deleteNotification(id: string) {
  return supabase.from("admin_notifications").delete().eq("id", id);
}

export async function duplicateNotification(id: string) {
  const { data } = await supabase.from("admin_notifications").select("*").eq("id", id).single();
  if (!data) return { error: { message: "Não encontrada" } };
  const { id: _id, created_at, sent, sent_at, scheduled_at, ...rest } = data as any;
  return supabase.from("admin_notifications").insert({
    ...rest,
    title: `${rest.title} (cópia)`,
    sent: false,
    sent_at: null,
    scheduled_at: null,
  } as never).select().single();
}

// ---------- send ----------
export async function sendNotification(notifId: string) {
  const { data: notif } = await supabase.from("admin_notifications").select("*").eq("id", notifId).single();
  if (!notif) return { error: { message: "Notificação não encontrada" } };

  const seg = decodeSegment(notif);
  const userIds = await resolveAudience(seg);

  const rows = userIds.map(uid => ({
    user_id: uid,
    title: notif.title,
    body: notif.body,
    type: notif.type || "system",
    image_url: notif.image_url,
    redirect_type: notif.redirect_type,
    redirect_url: notif.redirect_url,
    reference_id: notif.reference_id ?? notifId,
  }));

  const { error } = await supabase.from("notifications").insert(rows as never);
  if (!error) {
    await supabase.from("admin_notifications")
      .update({ sent: true, sent_at: new Date().toISOString() } as never)
      .eq("id", notifId);
  }
  return { error, recipients: userIds.length };
}

export async function sendTestToCurrentUser(payload: NotificationPayload) {
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id ?? DEV_USER_ID;
  return supabase.from("notifications").insert({
    user_id: uid,
    title: `[TESTE] ${payload.title}`,
    body: payload.body,
    type: payload.type || "system",
    image_url: payload.image_url ?? null,
    redirect_type: payload.redirect_type ?? null,
    redirect_url: payload.redirect_url ?? null,
  } as never);
}

export async function cancelScheduled(id: string) {
  return supabase.from("admin_notifications")
    .update({ scheduled_at: null } as never)
    .eq("id", id);
}

export async function processDueScheduled() {
  const nowIso = new Date().toISOString();
  const { data: due } = await supabase
    .from("admin_notifications")
    .select("id")
    .eq("sent", false)
    .lte("scheduled_at", nowIso)
    .not("scheduled_at", "is", null);
  let sent = 0;
  for (const row of due ?? []) {
    const { error } = await sendNotification((row as any).id);
    if (!error) sent++;
  }
  return { processed: due?.length ?? 0, sent };
}

export async function resendToUnread(id: string) {
  const { data: notif } = await supabase.from("admin_notifications").select("*").eq("id", id).single();
  if (!notif) return { error: { message: "Não encontrada" } };

  const { data: unread } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("reference_id", id)
    .eq("read", false);

  const userIds = Array.from(new Set((unread ?? []).map(r => (r as any).user_id)));
  if (!userIds.length) return { error: null, recipients: 0 };

  const rows = userIds.map(uid => ({
    user_id: uid,
    title: notif.title,
    body: notif.body,
    type: notif.type || "system",
    image_url: notif.image_url,
    redirect_type: notif.redirect_type,
    redirect_url: notif.redirect_url,
    reference_id: id,
  }));
  const { error } = await supabase.from("notifications").insert(rows as never);
  return { error, recipients: userIds.length };
}

// ---------- analytics ----------
export async function getNotificationKPIs(period: Period = 7) {
  const { sinceIso, prevSinceIso, prevUntilIso } = periodRange(period);

  const { data: sentNow } = await supabase
    .from("admin_notifications")
    .select("id, sent_at, scheduled_at, sent")
    .gte("sent_at", sinceIso);
  const sentCount = sentNow?.length ?? 0;

  const { count: reach } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  const { count: readCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sinceIso)
    .eq("read", true);

  const { data: clickEvents } = await supabase
    .from("feed_events")
    .select("event_type")
    .gte("created_at", sinceIso)
    .like("event_type", "notification_click:%");
  const clicks = clickEvents?.length ?? 0;

  const { count: scheduledPending } = await supabase
    .from("admin_notifications")
    .select("*", { count: "exact", head: true })
    .eq("sent", false)
    .gte("scheduled_at", new Date().toISOString());

  const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);
  const { count: activeUsers } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true })
    .gte("last_seen_at", cutoff30.toISOString());

  // previous period
  let prevSent = 0, prevReach = 0, prevRead = 0, prevClicks = 0;
  if (prevSinceIso && prevUntilIso) {
    const { data: pSent } = await supabase
      .from("admin_notifications")
      .select("id")
      .gte("sent_at", prevSinceIso)
      .lt("sent_at", prevUntilIso);
    prevSent = pSent?.length ?? 0;

    const { count: pReach } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevSinceIso)
      .lt("created_at", prevUntilIso);
    prevReach = pReach ?? 0;

    const { count: pRead } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevSinceIso)
      .lt("created_at", prevUntilIso)
      .eq("read", true);
    prevRead = pRead ?? 0;

    const { data: pClicks } = await supabase
      .from("feed_events")
      .select("event_type")
      .gte("created_at", prevSinceIso)
      .lt("created_at", prevUntilIso)
      .like("event_type", "notification_click:%");
    prevClicks = pClicks?.length ?? 0;
  }

  const readRate = (reach ?? 0) > 0 ? ((readCount ?? 0) / (reach ?? 1)) * 100 : 0;
  const prevReadRate = prevReach > 0 ? (prevRead / prevReach) * 100 : 0;
  const ctr = (reach ?? 0) > 0 ? (clicks / (reach ?? 1)) * 100 : 0;
  const prevCtr = prevReach > 0 ? (prevClicks / prevReach) * 100 : 0;

  return {
    sent: { value: sentCount, delta: pctDelta(sentCount, prevSent) },
    reach: { value: reach ?? 0, delta: pctDelta(reach ?? 0, prevReach) },
    readRate: { value: readRate.toFixed(1), delta: pctDelta(Math.round(readRate * 10), Math.round(prevReadRate * 10)) },
    ctr: { value: ctr.toFixed(1), delta: pctDelta(Math.round(ctr * 10), Math.round(prevCtr * 10)) },
    scheduledPending: { value: scheduledPending ?? 0, delta: null },
    activeUsers: { value: activeUsers ?? 0, delta: null },
  };
}

export async function getNotificationPerformance(adminNotifId: string) {
  const { count: reach } = await supabase
    .from("notifications").select("*", { count: "exact", head: true })
    .eq("reference_id", adminNotifId);
  const { count: read } = await supabase
    .from("notifications").select("*", { count: "exact", head: true })
    .eq("reference_id", adminNotifId).eq("read", true);
  const { data: clicks } = await supabase
    .from("feed_events").select("event_type")
    .eq("event_type", `notification_click:${adminNotifId}`);
  return {
    reach: reach ?? 0,
    read: read ?? 0,
    clicks: clicks?.length ?? 0,
    readRate: (reach ?? 0) > 0 ? (((read ?? 0) / (reach ?? 1)) * 100).toFixed(1) : "0",
    ctr: (reach ?? 0) > 0 ? (((clicks?.length ?? 0) / (reach ?? 1)) * 100).toFixed(1) : "0",
  };
}

export async function listNotificationsWithPerformance(period: Period = 30) {
  const { sinceIso } = periodRange(period);
  const { data: list } = await supabase
    .from("admin_notifications")
    .select("*")
    .or(`created_at.gte.${sinceIso},scheduled_at.gte.${sinceIso}`)
    .order("created_at", { ascending: false })
    .limit(100);

  const enriched = await Promise.all((list ?? []).map(async (n: any) => {
    const perf = n.sent ? await getNotificationPerformance(n.id) : { reach: 0, read: 0, clicks: 0, readRate: "0", ctr: "0" };
    return { ...n, ...perf };
  }));
  return enriched;
}

export async function getNotificationInsights(period: Period = 30) {
  const list = await listNotificationsWithPerformance(period);
  const sent = list.filter(n => n.sent);
  const insights: { type: "positive" | "warning" | "info"; text: string }[] = [];

  if (!sent.length) {
    insights.push({ type: "info", text: "Nenhuma notificação enviada no período. Crie uma campanha para engajar usuários." });
    return insights;
  }

  // Best type by CTR
  const byType: Record<string, { reach: number; clicks: number }> = {};
  sent.forEach(n => {
    const t = n.type || "system";
    byType[t] = byType[t] || { reach: 0, clicks: 0 };
    byType[t].reach += n.reach;
    byType[t].clicks += n.clicks;
  });
  const types = Object.entries(byType)
    .map(([t, v]) => ({ t, ctr: v.reach ? (v.clicks / v.reach) * 100 : 0 }))
    .sort((a, b) => b.ctr - a.ctr);
  if (types.length >= 2 && types[0].ctr > 0 && types[1].ctr > 0) {
    const ratio = (types[0].ctr / Math.max(types[1].ctr, 0.1)).toFixed(1);
    insights.push({ type: "positive", text: `Notificações tipo "${types[0].t}" têm ${ratio}× mais cliques que "${types[1].t}".` });
  }

  // Best send hour
  const byHour: Record<number, { reach: number; clicks: number }> = {};
  sent.forEach(n => {
    if (!n.sent_at) return;
    const h = new Date(n.sent_at).getHours();
    byHour[h] = byHour[h] || { reach: 0, clicks: 0 };
    byHour[h].reach += n.reach;
    byHour[h].clicks += n.clicks;
  });
  const hours = Object.entries(byHour)
    .filter(([, v]) => v.reach >= 5)
    .map(([h, v]) => ({ h: Number(h), ctr: (v.clicks / v.reach) * 100 }))
    .sort((a, b) => b.ctr - a.ctr);
  if (hours.length) {
    insights.push({ type: "info", text: `Melhor janela de envio: ${hours[0].h}h–${hours[0].h + 1}h (CTR ${hours[0].ctr.toFixed(1)}%).` });
  }

  // Low read rate warning
  const lowRead = sent.filter(n => n.reach >= 10 && Number(n.readRate) < 20);
  if (lowRead.length) {
    insights.push({ type: "warning", text: `${lowRead.length} notificação(ões) com baixa taxa de leitura (<20%). Revise título ou horário.` });
  }

  return insights;
}

// ---------- templates ----------
export type Template = {
  key: string;
  label: string;
  type: string;
  title: string;
  body: string;
  redirect_type: "internal" | "external" | null;
  redirect_url: string | null;
};

export const NOTIFICATION_TEMPLATES: Template[] = [
  {
    key: "coupon",
    label: "Novo cupom",
    type: "coupon",
    title: "Novo cupom disponível! 🎟️",
    body: "Aproveite descontos exclusivos em estabelecimentos da região.",
    redirect_type: "internal",
    redirect_url: "/coupons",
  },
  {
    key: "badge",
    label: "Badge conquistado",
    type: "badge",
    title: "Você conquistou um novo badge! 🏅",
    body: "Confira sua coleção e continue explorando.",
    redirect_type: "internal",
    redirect_url: "/perfil/badges",
  },
  {
    key: "event",
    label: "Eventos do fim de semana",
    type: "promo",
    title: "Eventos imperdíveis neste fim de semana",
    body: "Veja os destaques de Gramado e Canela e monte seu roteiro.",
    redirect_type: "internal",
    redirect_url: "/",
  },
  {
    key: "nearby",
    label: "Lugar próximo",
    type: "nearby",
    title: "Tem um lugar incrível perto de você 📍",
    body: "Confira o que descobrimos por aí.",
    redirect_type: "internal",
    redirect_url: "/map",
  },
  {
    key: "trending",
    label: "Em alta esta semana",
    type: "trending",
    title: "Em alta esta semana 🔥",
    body: "Os lugares que todo mundo está visitando.",
    redirect_type: "internal",
    redirect_url: "/",
  },
];
