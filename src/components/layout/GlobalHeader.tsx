import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import logoSrc from "@/assets/logo_gramavel_header.svg";
import { NotificationsSheet } from "./NotificationsSheet";
import { getUnreadCount } from "@/services/notifications";

interface GlobalHeaderProps {
  showBack?: boolean;
  title?: string;
  onBack?: () => void;
}

export function GlobalHeader({ showBack, title = "Gramável", onBack }: GlobalHeaderProps) {
  const navigate = useNavigate();
  const { city } = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUnreadCount().then(({ data }) => setUnreadCount(data ?? 0));
  }, [notificationsOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left */}
          <div className="w-24 flex items-center">
            {showBack ? (
              <button
                onClick={() => onBack ? onBack() : navigate(-1)}
                className="p-3 -ml-2 rounded-full hover:bg-secondary transition-colors active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : (
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-medium">
                <MapPin className="w-3 h-3" />
                {city}
              </Badge>
            )}
          </div>

          {/* Center */}
          <img src={logoSrc} alt="Gramável" className="h-[18px]" width={120} height={18} />

          {/* Right */}
          <div className="w-24 flex justify-end">
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-3 rounded-full hover:bg-secondary transition-colors active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </header>

      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </>
  );
}
