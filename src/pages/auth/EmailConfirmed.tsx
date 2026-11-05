import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { consumePostAuthRedirect } from "@/lib/auth";
import logoSvg from "@/assets/logo_gramavel_header.svg";

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus("success");
        setTimeout(() => navigate(consumePostAuthRedirect()), 3000);
      } else {
        setStatus("error");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-6">
      <img src={logoSvg} alt="Gramável" className="h-10" />

      {status === "loading" && (
        <>
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">Verificando seu e-mail...</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">E-mail confirmado! 🎉</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Sua conta no Gramável foi verificada com sucesso. Você será redirecionado em instantes...
            </p>
          </div>
          <Button className="rounded-full" onClick={() => navigate(consumePostAuthRedirect())}>
            Começar a explorar
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Link inválido ou expirado</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Este link de confirmação não é mais válido. Faça login para reenviar o e-mail.
            </p>
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => navigate("/auth/login")}>
            Ir para o login
          </Button>
        </>
      )}
    </div>
  );
}
