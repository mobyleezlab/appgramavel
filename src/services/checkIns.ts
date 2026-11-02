import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth";

export async function createCheckIn(
  establishmentId: string,
  coords: { lat: number; lng: number; accuracy?: number | null } | null | undefined,
  userId?: string
) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
    return { data: null, error: { code: "NO_COORDS", message: "Localização indisponível. Ative o GPS e tente novamente." } };
  }
  const uid = userId ?? await getCurrentUserId();
  return supabase.from("check_ins").insert({
    user_id: uid,
    establishment_id: establishmentId,
    latitude: coords.lat,
    longitude: coords.lng,
    accuracy_m: coords.accuracy != null && Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null,
  });
}

export async function getCheckIns(userId?: string) {
  const uid = userId ?? await getCurrentUserId();
  return supabase
    .from("check_ins")
    .select("*, establishment:establishments(id,name,logo_url)")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
}

export async function getVisitedEstablishmentIds(userId?: string): Promise<Set<string>> {
  const uid = userId ?? await getCurrentUserId();
  const { data } = await supabase
    .from("check_ins")
    .select("establishment_id")
    .eq("user_id", uid);
  return new Set(data?.map((c) => c.establishment_id) ?? []);
}
