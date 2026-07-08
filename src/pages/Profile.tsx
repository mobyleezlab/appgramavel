import { useState, useEffect, useRef } from "react";
import { MapPin, Ticket, Map, CheckCircle2, Camera, Star, Pencil, TrendingUp, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getTimeline } from "@/services/timeline";
import { getCheckIns } from "@/services/checkIns";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCoupons } from "@/contexts/CouponsContext";
import { toast } from "sonner";

const TIMELINE_COLORS: Record<string, string> = {
  visit: "bg-success/10 text-success",
  coupon: "bg-warning/10 text-warning",
  review: "bg-rating/10 text-rating",
  route: "bg-primary/10 text-primary",
};

const TIMELINE_ICONS: Record<string, typeof CheckCircle2 | typeof Star> = {
  visit: CheckCircle2,
  coupon: Ticket,
  review: Star,
  route: Map,
};

export default function Profile() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [checkInCount, setCheckInCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { savedPlaces } = useFavorites();
  const { savedCoupons } = useCoupons();

  useEffect(() => {
    Promise.all([
      getTimeline(),
      getCheckIns(),
    ]).then(([timelineRes, checkInsRes]) => {
      if (timelineRes.data && timelineRes.data.length > 0) {
        setTimeline(timelineRes.data.map((t: any) => ({
          id: t.id, type: t.type, action: t.action,
          place: t.establishment?.name || "",
          image: t.image_url || t.establishment?.logo_url || "",
          date: t.created_at,
        })));
      }
      setCheckInCount(checkInsRes.data?.length ?? 0);
      setLoading(false);
    });
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("user-avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao enviar foto");
      setAvatarPreview(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("user-avatars")
      .getPublicUrl(path);

    const { error: updateError } = await supabase.from("user_profiles").update({ 
      avatar_url: publicUrl,
      updated_at: new Date().toISOString()
    }).eq("id", user.id);

    if (updateError) {
      toast.error("Erro ao salvar referência da foto");
      setAvatarPreview(null);
      return;
    }

    await refreshProfile();
    setAvatarPreview(null);
    toast.success("Foto atualizada!");
  }

  const STATS = [
    { label: "Favoritos", value: String(savedPlaces.length), icon: Heart, to: "/perfil/favoritos" },
    { label: "Cupons", value: String(savedCoupons.length), icon: Ticket, to: "/perfil/cupons" },
    { label: "Check-ins", value: String(checkInCount), icon: CheckCircle2, to: "/perfil/checkins" },
  ];

  const displayName = profile?.name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Usuário";
  const avatarUrl = avatarPreview || (profile?.avatar_url ? `${profile.avatar_url}?t=${profile.updated_at ?? Date.now()}` : "");
  const city = profile?.city || "";
  const state = profile?.state || "";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader title="Meu Gramável" />

      <main className="max-w-2xl mx-auto pb-20 space-y-4 mt-[72px]">
        {/* Cover + Avatar Section */}
        <div className="relative">
          <div className="h-28 bg-gradient-primary relative overflow-hidden">
            {profile?.cover_url && (
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `url('${profile.cover_url}')`,
                backgroundSize: "cover", backgroundPosition: "center", mixBlendMode: "overlay"
              }} />
            )}
          </div>

          <div className="flex flex-col items-center -mt-11 relative z-10 px-4">
            <div className="p-[3px] rounded-full bg-gradient-to-tr from-primary to-primary/60 shadow-lg relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <Avatar className="w-[88px] h-[88px] border-[3px] border-background">
                {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <h1 className="text-lg font-bold text-foreground mt-2">{displayName}</h1>

            {(city || state) && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">
                  {[city, state].filter(Boolean).join(", ")}
                </span>
              </div>
            )}

            <div className="flex justify-center mt-4 mb-4">
              <Button variant="outline" size="sm" className="rounded-full gap-1.5 h-8 text-xs" onClick={() => navigate("/perfil/configuracoes")}>
                <Pencil className="w-3 h-3" />
                Editar perfil
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-around py-4 mx-4 bg-card rounded-xl border border-border/50 shadow-card">
          {STATS.map(({ label, value, icon: Icon, to }) => (
            <button key={label} onClick={() => navigate(to)} className="flex flex-col items-center hover:opacity-70 transition-opacity active:scale-95">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground leading-none">{value}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
            </button>
          ))}
        </div>

        {/* Timeline Preview */}
        {timeline.length > 0 && (
          <div className="px-4">
            <div className="relative pl-6">
              <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-border" />
              <div className="space-y-2">
                {timeline.slice(0, 3).map((item, idx) => {
                  const TimeIcon = TIMELINE_ICONS[item.type] || CheckCircle2;
                  return (
                    <div key={item.id} className="relative flex items-center gap-4 p-4 bg-card/60 rounded-xl border border-border/30 hover:bg-card transition-colors animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
                      <div className={`absolute -left-6 w-[18px] h-[18px] rounded-full flex items-center justify-center ring-2 ring-background ${TIMELINE_COLORS[item.type]}`}>
                        <TimeIcon className="w-3 h-3" />
                      </div>
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={item.image || "/placeholder.svg"} alt={item.place} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">
                          <span className="text-muted-foreground">{item.action}</span>{" "}
                          <span className="font-semibold">{item.place}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.date).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4 rounded-full gap-1.5 h-9 text-xs font-medium" onClick={() => navigate("/perfil/timeline")}>
              <TrendingUp className="w-3.5 h-3.5" />
              Ver linha do tempo completa
            </Button>
          </div>
        )}

        {/* Empty state for timeline */}
        {!loading && timeline.length === 0 && (
          <div className="px-4 space-y-2">
            <div className="relative pl-6">
              <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-border/40" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="relative flex items-center gap-4 p-4 bg-card/40 rounded-xl border border-border/20 mb-2">
                  <div className="absolute -left-6 w-[18px] h-[18px] rounded-full bg-muted ring-2 ring-background" />
                  <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4 rounded" />
                    <Skeleton className="h-2.5 w-1/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center pt-1">Sua linha do tempo está vazia. Explore e faça check-ins!</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
