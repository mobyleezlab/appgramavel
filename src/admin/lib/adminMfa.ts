import { supabase } from "@/integrations/supabase/client";

export type AdminAccess = "signed_out" | "not_admin" | "needs_mfa" | "authorized";

/** Admin access requires an active admin role AND a session verified with MFA (aal2). */
export async function getAdminAccess(): Promise<AdminAccess> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "signed_out";

  const { data: role } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!role) return "not_admin";

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return aal?.currentLevel === "aal2" ? "authorized" : "needs_mfa";
}

export async function getVerifiedTotpFactorId(): Promise<string | null> {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp?.find((f) => f.status === "verified")?.id ?? null;
}
