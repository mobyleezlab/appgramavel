import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth";

export type UserRouteStatus = "saved" | "in_progress" | "completed";

export interface UserRouteRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: UserRouteStatus;
  cover_url?: string | null;
  estimated_duration_min?: number | null;
  estimated_distance_km?: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  user_route_stops: Array<{
    id: string;
    stop_order: number;
    visited: boolean;
    visited_at: string | null;
    establishment: any;
  }>;
}

export async function getUserRoutes(userId?: string) {
  const uid = userId ?? (await getCurrentUserId());
  if (!uid) return { data: [], error: null };
  return supabase
    .from("user_routes")
    .select(
      "*, user_route_stops(id, stop_order, visited, visited_at, establishment:establishments(*))",
    )
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
}

export async function getUserRouteById(id: string) {
  return supabase
    .from("user_routes")
    .select(
      "*, user_route_stops(id, stop_order, visited, visited_at, establishment:establishments(*))",
    )
    .eq("id", id)
    .single();
}

interface CreateUserRouteInput {
  title: string;
  description?: string | null;
  stopIds: string[];
  coverUrl?: string | null;
  estimatedDurationMin?: number | null;
  estimatedDistanceKm?: number | null;
}

export async function createUserRoute(input: CreateUserRouteInput, userId?: string) {
  const uid = userId ?? (await getCurrentUserId());
  if (!uid) return { data: null, error: new Error("not authenticated") };

  const insertPayload: Record<string, unknown> = {
    user_id: uid,
    title: input.title,
    description: input.description ?? null,
  };
  if (input.coverUrl !== undefined) insertPayload.cover_url = input.coverUrl;
  if (input.estimatedDurationMin !== undefined)
    insertPayload.estimated_duration_min = input.estimatedDurationMin;
  if (input.estimatedDistanceKm !== undefined)
    insertPayload.estimated_distance_km = input.estimatedDistanceKm;

  const { data: route, error: routeError } = await supabase
    .from("user_routes")
    .insert(insertPayload as any)
    .select("id")
    .single();

  if (routeError || !route) return { data: null, error: routeError };

  if (input.stopIds.length > 0) {
    const stops = input.stopIds.map((establishmentId, i) => ({
      user_route_id: route.id,
      establishment_id: establishmentId,
      stop_order: i + 1,
    }));
    const { error: stopsError } = await supabase.from("user_route_stops").insert(stops);
    if (stopsError) return { data: route, error: stopsError };
  }

  return { data: route, error: null };
}

interface UpdateUserRouteInput {
  title?: string;
  description?: string | null;
  coverUrl?: string | null;
  estimatedDurationMin?: number | null;
  estimatedDistanceKm?: number | null;
}

export async function updateUserRoute(routeId: string, input: UpdateUserRouteInput) {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.coverUrl !== undefined) payload.cover_url = input.coverUrl;
  if (input.estimatedDurationMin !== undefined)
    payload.estimated_duration_min = input.estimatedDurationMin;
  if (input.estimatedDistanceKm !== undefined)
    payload.estimated_distance_km = input.estimatedDistanceKm;
  return supabase.from("user_routes").update(payload as any).eq("id", routeId);
}

export async function replaceUserRouteStops(routeId: string, establishmentIds: string[]) {
  // RPC if available; fallback to manual replace
  const { data, error } = await supabase.rpc("replace_user_route_stops" as any, {
    p_user_route_id: routeId,
    p_establishment_ids: establishmentIds,
  });
  if (!error) return { data, error: null };
  // fallback
  await supabase.from("user_route_stops").delete().eq("user_route_id", routeId);
  if (establishmentIds.length > 0) {
    await supabase.from("user_route_stops").insert(
      establishmentIds.map((eid, i) => ({
        user_route_id: routeId,
        establishment_id: eid,
        stop_order: i + 1,
      })),
    );
  }
  return { data: { success: true } as any, error: null };
}

export async function updateUserRouteStatus(routeId: string, status: UserRouteStatus) {
  const updates: Record<string, unknown> = { status };
  if (status === "in_progress") updates.started_at = new Date().toISOString();
  if (status === "completed") updates.completed_at = new Date().toISOString();
  return supabase.from("user_routes").update(updates as any).eq("id", routeId);
}

export async function startUserRoute(routeId: string) {
  const { data, error } = await supabase.rpc("start_user_route" as any, {
    p_route_id: routeId,
  });
  if (error) {
    // fallback via update
    return updateUserRouteStatus(routeId, "in_progress");
  }
  return { data, error: null };
}

export async function cloneSuggestedRoute(suggestedId: string) {
  return supabase.rpc("clone_suggested_route" as any, { p_route_id: suggestedId });
}

export async function markStopVisited(stopId: string, visited: boolean) {
  return supabase
    .from("user_route_stops")
    .update({ visited, visited_at: visited ? new Date().toISOString() : null })
    .eq("id", stopId);
}

export async function deleteUserRoute(routeId: string) {
  return supabase.from("user_routes").delete().eq("id", routeId);
}
