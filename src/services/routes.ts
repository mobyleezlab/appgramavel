import { supabase } from "@/integrations/supabase/client";

export interface SuggestedRouteRow {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  duration: string;
  difficulty: string | null;
  image_url: string | null;
  icon_name: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at: string;
  route_stops: Array<{
    stop_order: number;
    note: string | null;
    establishment: any;
  }>;
}

export async function getRoutes() {
  return supabase
    .from("routes")
    .select("*, route_stops(stop_order, note, establishment:establishments(*))")
    .order("sort_order", { ascending: true });
}

export async function getRouteById(id: string) {
  return supabase
    .from("routes")
    .select("*, route_stops(stop_order, note, establishment:establishments(*))")
    .eq("id", id)
    .single();
}
