import { supabase } from "@/integrations/supabase/client";

/**
 * Tracker para eventos de notificações in-app.
 * Reusa `feed_events` codificando o id depois de `:`.
 *
 * Eventos:
 *   notification_open:<id>     — usuário abriu o sheet de notificações
 *   notification_view:<id>     — uma notificação ficou visível
 *   notification_click:<id>    — usuário tocou e seguiu o deep link
 */
export async function trackNotification(base: string, id?: string) {
  try {
    const event_type = id ? `${base}:${id}` : base;
    const sessionId =
      typeof window !== "undefined"
        ? (window.sessionStorage.getItem("sid") ||
            (() => {
              const sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
              window.sessionStorage.setItem("sid", sid);
              return sid;
            })())
        : null;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feed_events").insert({
      event_type,
      session_id: sessionId,
      user_id: user?.id ?? null,
    } as never);
  } catch {
    // tracking nunca pode quebrar UX
  }
}
