import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth";

export async function getCoupons() {
  return supabase
    .from("coupons")
    .select("*, establishment:establishments(id,name,logo_url)")
    .eq("status", "active")
    .eq("is_active", true);
}

export async function getAllCoupons() {
  return supabase
    .from("coupons")
    .select("*, establishment:establishments(id,name,logo_url)")
    .eq("is_active", true);
}

async function resolveUserId(userId?: string): Promise<string | null> {
  return userId ?? (await getCurrentUserId());
}

export async function getUserCoupons(userId?: string) {
  const uid = await resolveUserId(userId);
  if (!uid) return { data: [], error: null } as const;
  return supabase
    .from("user_coupons")
    .select("coupon_id, status, used_at")
    .eq("user_id", uid);
}

export async function saveCoupon(couponId: string, userId?: string) {
  const uid = await resolveUserId(userId);
  if (!uid) return { data: null, error: new Error("not-authenticated") } as const;
  return supabase
    .from("user_coupons")
    .insert({ user_id: uid, coupon_id: couponId, status: "saved" });
}

export async function unsaveCoupon(couponId: string, userId?: string) {
  const uid = await resolveUserId(userId);
  if (!uid) return { data: null, error: new Error("not-authenticated") } as const;
  return supabase
    .from("user_coupons")
    .delete()
    .eq("user_id", uid)
    .eq("coupon_id", couponId)
    .eq("status", "saved");
}

export async function useCouponService(couponId: string, userId?: string) {
  const uid = await resolveUserId(userId);
  if (!uid) return { data: null, error: new Error("not-authenticated") } as const;
  return supabase
    .from("user_coupons")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("user_id", uid)
    .eq("coupon_id", couponId)
    .eq("status", "saved");
}
