import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import logoSrc from "@/assets/logo_gramavel_header.svg";
import { getAdminAccess, getVerifiedTotpFactorId } from "@/admin/lib/adminMfa";

type Step = "credentials" | "enroll" | "verify";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("credentials");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startMfa = async () => {
    const existing = await getVerifiedTotpFactorId();
    if (existing) {
      setFactorId(existing);
      setStep("verify");
      return;
    }
    // Remove unfinished enrollments before starting a new one.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Admin ${Date.now()}` });
    if (error || !data) throw error ?? new Error("Não foi possível iniciar a verificação");
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep("enroll");
  };

  const routeByAccess = async () => {
    const access = await getAdminAccess();
    if (access === "authorized") navigate("/admin", { replace: true });
    else if (access === "needs_mfa") await startMfa();
    else if (access === "not_admin") {
      await supabase.auth.signOut();
      setError("Este e-mail não tem acesso ao painel admin.");
      setStep("credentials");
    }
  };

  useEffect(() => {
    routeByAccess().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError("E-mail ou senha incorretos."); return; }
      await routeByAccess();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (error) { setError("Código inválido ou expirado. Tente novamente."); return; }
      toast.success("Bem-vindo, admin!");
      navigate("/admin", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    setCode(""); setQr(null); setSecret(null); setFactorId(null);
    setStep("credentials");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-card">
        <CardHeader className="text-center space-y-3">
          <img src={logoSrc} alt="Gramável" className="h-6 mx-auto" width={160} height={24} />
          <CardTitle className="text-base font-semibold text-foreground">Painel Admin</CardTitle>
          <CardDescription>
            {step === "credentials" && "Acesso ao painel administrativo"}
            {step === "enroll" && "Configure a verificação em duas etapas (obrigatória)"}
            {step === "verify" && "Digite o código do seu app autenticador"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {step === "credentials" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <Input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {loading ? "Verificando..." : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              {step === "enroll" && (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    Escaneie o QR code com Google Authenticator, Microsoft Authenticator ou similar.
                  </p>
                  {qr && <img src={qr} alt="QR code da verificação em duas etapas" className="mx-auto w-44 h-44 rounded-2xl bg-card p-2 border" />}
                  {secret && (
                    <p className="text-xs text-muted-foreground break-all">
                      Ou digite a chave: <span className="font-mono text-foreground">{secret}</span>
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="admin-code">Código de 6 dígitos</Label>
                <Input
                  id="admin-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                />
              </div>
              <Button className="w-full" disabled={loading || code.length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                {loading ? "Verificando..." : "Verificar"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={handleCancel} disabled={loading}>
                Sair
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
