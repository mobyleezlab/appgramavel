import { Home, Map, Ticket, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { prefetchExploreData, prefetchFeedData } from "@/lib/queries";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Feed" },
  { to: "/map", icon: Map, label: "Explorar" },
  { to: "/coupons", icon: Ticket, label: "Cupons" },
  { to: "/profile", icon: User, label: "Perfil" },
];


export function BottomNav() {
  const location = useLocation();
  const qc = useQueryClient();

  // Warm the cache the moment the user shows intent to navigate
  const handlePrefetch = (to: string) => {
    if (to === "/map") prefetchExploreData(qc);
    else if (to === "/") prefetchFeedData(qc);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]" aria-label="Navegação principal">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
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
