import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, MapPin, Users, Rss, Compass,
  Route, Bell, Ticket, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoSrc from "@/assets/logo_gramavel_header.svg";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Estabelecimentos", icon: MapPin, path: "/admin/estabelecimentos" },
  { label: "Usuários", icon: Users, path: "/admin/usuarios" },
  { label: "Feed", icon: Rss, path: "/admin/feed" },
  { label: "Explorar", icon: Compass, path: "/admin/explorar" },
  { label: "Roteiros", icon: Route, path: "/admin/roteiros" },
  { label: "Notificações", icon: Bell, path: "/admin/notificacoes" },
  { label: "Cupons", icon: Ticket, path: "/admin/cupons" },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 border-r border-border bg-card flex flex-col transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo area */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-border">
        {!collapsed && (
          <img src={logoSrc} alt="Gramável" className="h-[18px]" width={120} height={18} />
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} className="shrink-0">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        {!collapsed && (
          <p className="text-xs text-muted-foreground text-center">Admin Panel v1.0</p>
        )}
      </div>
    </aside>
  );
}
