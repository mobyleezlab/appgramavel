import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight tracker for route-related events, written to `feed_events`.
 * Encodes label/id after a colon in event_type.
 *
 *  route_view:<route_id>
 *  route_start:<route_id>
 *  route_complete:<route_id>
 *  route_stop_visited:<route_id>
 *  route_banner_click:<banner_id>
 */
export async function trackRoute(
  base: string,
  label?: string | null,
  ids?: { establishmentId?: string | null }
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
    } as never);
  } catch {
    /* tracking nunca deve quebrar UX */
  }
}
