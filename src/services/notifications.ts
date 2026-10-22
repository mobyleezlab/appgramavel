import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth";

export async function getNotifications(userId?: string) {
  const uid = userId ?? await getCurrentUserId();
  if (!uid) return { data: [], error: null };
  return supabase
    .from("notifications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(30);
}

export async function getUnreadCount(userId?: string) {
  const uid = userId ?? await getCurrentUserId();
  if (!uid) return { data: 0, error: null };
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("read", false);

  return { data: count ?? 0, error };
}

export async function markAllRead(userId?: string) {
  const uid = userId ?? await getCurrentUserId();
  if (!uid) return { error: null };
  return supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", uid)
    .eq("read", false);
}

export async function markRead(notificationId: string) {
  return supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
}
