import { supabase } from "@/integrations/supabase/client";

export interface RecommendedPlace {
  id: string;
  name: string;
  slug: string;
  category: string;
  image_url: string | null;
  address: string | null;
  rating: number | null;
  total_reviews: number | null;
  reason: string;
}

export async function recommendPlaces(preferences: string, signal: AbortSignal): Promise<RecommendedPlace[]> {
  const { data, error } = await supabase.functions.invoke("recommend-places", { body: { preferences }, signal });
  if (error) {
    let message = "Não foi possível gerar sugestões agora. Tente novamente.";
    if (error.context instanceof Response) {
      try { const body = await error.context.json(); if (typeof body.error === "string") message = body.error; } catch { /* keep safe fallback */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  if (!Array.isArray(data?.recommendations)) throw new Error("Não foi possível carregar as sugestões.");
  return data.recommendations;
}