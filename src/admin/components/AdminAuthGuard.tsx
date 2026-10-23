import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess, type AdminAccess } from "@/admin/lib/adminMfa";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AdminAccess | "loading">("loading");

  useEffect(() => {
    let active = true;
    const check = () => getAdminAccess().then((s) => active && setStatus(s)).catch(() => active && setStatus("signed_out"));
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(check, 0); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status !== "authorized") return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
