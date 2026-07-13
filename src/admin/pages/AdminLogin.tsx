import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logoSrc from "@/assets/logo_gramavel_header.svg";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<"not_admin" | "invalid_credentials" | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoginError("invalid_credentials");
        setLoading(false);
        return;
      }

      const { data: role } = await supabase
        .from("admin_roles")
        .select("id, role, is_active")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .maybeSingle();



      if (!role) {
        await supabase.auth.signOut();
        setLoginError("not_admin");
        setLoading(false);
        return;
      }

      toast.success("Bem-vindo, admin!");
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-card">
        <CardHeader className="text-center space-y-3">
          <img src={logoSrc} alt="Gramável" className="h-6 mx-auto" width={160} height={24} />
          <CardTitle className="text-base font-semibold text-foreground">Painel Admin</CardTitle>
          <CardDescription>Acesso ao painel administrativo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  {loginError === "not_admin"
                    ? "Este e-mail não tem acesso ao painel admin."
                    : "E-mail ou senha incorretos."}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? "Verificando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
