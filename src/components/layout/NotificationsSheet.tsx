import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Award, MapPin, TrendingUp, Bell } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auth";
import { trackNotification } from "@/lib/notificationsTracking";
import type { ComponentType } from "react";

interface NotificationData {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  image_url: string | null;
  redirect_url: string | null;
  redirect_type: string | null;
  created_at: string | null;
}

const TYPE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  coupon: Ticket,
  badge: Award,
  nearby: MapPin,
  trending: TrendingUp,
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Há ${days}d`;
}

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    async function load() {
      setLoading(true);
      const userId = await getCurrentUserId();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      setNotifications(data ?? []);
      setLoading(false);
    }
    load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePopState = () => onOpenChange(false);
    window.history.pushState({ notifications: true }, "");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [open, onOpenChange]);

  const handleClick = async (n: NotificationData) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    trackNotification("notification_click", n.id);
    if (n.redirect_url) {
      onOpenChange(false);
      if (n.redirect_type === "external") {
        window.open(n.redirect_url, "_blank");
      } else {
        navigate(n.redirect_url);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 [&>button]:top-5 [&>button]:right-5 [&>button]:z-10">
        <SheetHeader className="px-4 pt-6 pb-4 border-b border-border/50 pr-12">
          <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            Notificações
            {unreadCount > 0 && (
              <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-4 py-4 border-b border-border/30">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] || Bell;
              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 px-4 py-4 transition-all cursor-pointer hover:bg-muted/50 border-l-4 ${
                    !notification.read ? "bg-primary/5 border-l-primary" : "border-l-transparent"
                  }`}
                  onClick={() => handleClick(notification)}
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-primary/10 shadow-sm shadow-primary/5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${!notification.read ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{notification.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1.5">{timeAgo(notification.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
