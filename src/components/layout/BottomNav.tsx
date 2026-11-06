import { Home, Map, Ticket, User, LogIn } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { prefetchExploreData, prefetchFeedData } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Feed" },
  { to: "/map", icon: Map, label: "Explorar" },
  { to: "/coupons", icon: Ticket, label: "Cupons" },
  { to: "/profile", icon: User, label: "Perfil" },
];

const GUEST_ITEM = { to: "/auth/login?redirect=/profile", icon: LogIn, label: "Entrar" };

export function BottomNav() {
  const location = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();

  const items = user
    ? NAV_ITEMS
    : [...NAV_ITEMS.slice(0, 3), GUEST_ITEM];

  // Warm the cache the moment the user shows intent to navigate
  const handlePrefetch = (to: string) => {
    if (to === "/map") prefetchExploreData(qc);
    else if (to === "/") prefetchFeedData(qc);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]" aria-label="Navegação principal">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
        {items.map(({ to, icon: Icon, label }) => {
          const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to.split("?")[0]);
          return (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onPointerEnter={() => handlePrefetch(to)}
              onTouchStart={() => handlePrefetch(to)}
              onFocus={() => handlePrefetch(to)}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-colors",
                  active && "stroke-[2.5]"
                )}
              />
              <span className={cn(
                "text-xs mt-0.5",
                active ? "font-semibold" : "font-medium"
              )}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
