import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Sparkles } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface AuthGateContextType {
  /**
   * Returns true when there is a logged-in user. Otherwise opens the
   * AuthGateSheet ("Entre para {motivo}") and returns false, so callers can
   * bail out: `if (!requireAuth("salvar este lugar")) return;`
   */
  requireAuth: (reason: string) => boolean;
}

const AuthGateContext = createContext<AuthGateContextType | null>(null);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const requireAuth = useCallback(
    (motivo: string): boolean => {
      if (user) return true;
      setReason(motivo);
      setOpen(true);
      return false;
    },
    [user]
  );

  const currentPath = `${location.pathname}${location.search}`;
  const redirectParam = encodeURIComponent(currentPath);

  const value = useMemo(() => ({ requireAuth }), [requireAuth]);

  return (
    <AuthGateContext.Provider value={value}>
      {children}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-w-2xl mx-auto">
          <DrawerHeader className="text-center pt-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <DrawerTitle className="text-lg font-bold">
              Entre para {reason}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Crie sua conta gratuita e guarde seus lugares, cupons e check-ins em Gramado e Canela.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="gap-2 pb-8">
            <Button
              className="w-full rounded-full gap-2"
              onClick={() => {
                setOpen(false);
                navigate(`/auth/login?redirect=${redirectParam}`);
              }}
            >
              <LogIn className="w-4 h-4" /> Entrar
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full gap-2"
              onClick={() => {
                setOpen(false);
                navigate(`/auth/register?redirect=${redirectParam}`);
              }}
            >
              <UserPlus className="w-4 h-4" /> Criar conta
            </Button>
            <button
              onClick={() => setOpen(false)}
              className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
            >
              Agora não
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </AuthGateContext.Provider>
  );
}

export function useRequireAuth() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useRequireAuth must be used within AuthGateProvider");
  return ctx.requireAuth;
}
