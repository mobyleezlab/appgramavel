import { supabase } from "@/integrations/supabase/client";
import QRCode from "react-qr-code";

export async function getCoupons() {
  return supabase
    .from("coupons")
    .select("*, coupon_rules(*)")
    .order("created_at", { ascending: false });
}

export async function createCoupon(data: Record<string, unknown>) {
  return supabase.from("coupons").insert(data as never).select().single();
}

export async function updateCoupon(id: string, data: Record<string, unknown>) {
  return supabase.from("coupons").update(data as never).eq("id", id).select().single();
}

export async function setCouponVisibility(id: string, isActive: boolean) {
  return supabase.from("coupons").update({ is_active: isActive }).eq("id", id).select("id, is_active").single();
}

export async function deleteCoupon(id: string) {
  return supabase.from("coupons").delete().eq("id", id);
}

export async function upsertCouponRules(couponId: string, rules: Record<string, unknown>) {
  return supabase.from("coupon_rules").upsert({
    coupon_id: couponId,
    ...rules,
  } as never, { onConflict: "coupon_id" }).select().single();
}

export function generateQRDataUrl(code: string): string {
  // QR is rendered as a React component — this is a helper for the code value
  return code;
}
