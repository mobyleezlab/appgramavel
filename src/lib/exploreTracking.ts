import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight tracker that writes to the existing `feed_events` table.
 * No `metadata` column exists, so labels are encoded in `event_type` after a colon.
 *
 * Examples:
 *   explore_view
 *   explore_filter:Pet friendly
 *   explore_category_click:Cafés
 *   explore_card_click:popular
 *   experience_view:<uuid>
 *   experience_click:<uuid>
 */
export async function trackExplore(
  base: string,
  label?: string,
  ids?: { establishmentId?: string | null; postId?: string | null }
) {
  try {
    const event_type = label ? `${base}:${label}` : base;
    const sessionId =
      typeof window !== "undefined"
        ? (window.sessionStorage.getItem("sid") ||
            (() => {
              const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
              window.sessionStorage.setItem("sid", id);
              return id;
            })())
        : null;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feed_events").insert({
      event_type,
      session_id: sessionId,
      user_id: user?.id ?? null,
      establishment_id: ids?.establishmentId ?? null,
      post_id: ids?.postId ?? null,
    } as never);
  } catch {
    // silencioso — tracking não pode quebrar UX
  }
}
