import { useState, useEffect } from "react";
import { Compass, UtensilsCrossed, Wine, Camera, FerrisWheel, Ticket, CheckCircle2, Lock, CalendarDays } from "lucide-react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { MOCK_BADGES, type Badge as BadgeType } from "@/data/mock";
import { getUserBadges, getBadges } from "@/services/badges";
import type { ComponentType } from "react";

const BADGE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  compass: Compass,
  "utensils-crossed": UtensilsCrossed,
  wine: Wine,
  camera: Camera,
  "ferris-wheel": FerrisWheel,
  ticket: Ticket,
};

const BADGE_COLOR_PALETTES: Record<string, { bg: string; border: string; icon: string; ring: string }> = {
  compass: { bg: "bg-badge-explore/10", border: "border-badge-explore/20", icon: "text-badge-explore", ring: "hsl(var(--badge-explore))" },
  "utensils-crossed": { bg: "bg-badge-food/10", border: "border-badge-food/20", icon: "text-badge-food", ring: "hsl(var(--badge-food))" },
  wine: { bg: "bg-badge-drink/10", border: "border-badge-drink/20", icon: "text-badge-drink", ring: "hsl(var(--badge-drink))" },
  camera: { bg: "bg-badge-photo/10", border: "border-badge-photo/20", icon: "text-badge-photo", ring: "hsl(var(--badge-photo))" },
  "ferris-wheel": { bg: "bg-badge-leisure/10", border: "border-badge-leisure/20", icon: "text-badge-leisure", ring: "hsl(var(--badge-leisure))" },
  ticket: { bg: "bg-badge-event/10", border: "border-badge-event/20", icon: "text-badge-event", ring: "hsl(var(--badge-event))" },
};

function ProgressRing({ progress, total, color, size = 56 }: { progress: number; total: number; color: string; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / total) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-border" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<BadgeType[]>(MOCK_BADGES);

  useEffect(() => {
    Promise.all([getBadges(), getUserBadges()]).then(([allBadges, userBadges]) => {
      if (allBadges.data && allBadges.data.length > 0 && userBadges.data) {
        const userBadgeMap = new Map(
          userBadges.data.map((ub: any) => [ub.badge_id, ub])
        );
        const mapped: BadgeType[] = allBadges.data.map((b: any) => {
          const ub = userBadgeMap.get(b.id) as any;
          return {
            id: b.id,
            name: b.name,
            description: b.description || "",
            iconName: b.icon_name,
            color: "hsl(233, 100%, 69%)",
            earned: ub?.earned || false,
            progress: ub?.progress || 0,
            total: b.total || 10,
          };
        });
        setBadges(mapped);
      }
    });
  }, []);

  const earned = badges.filter((b) => b.earned);
  const inProgress = badges.filter((b) => !b.earned);

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader showBack title="Minhas Badges" />
      <main className="max-w-2xl mx-auto px-4 pb-20 pt-20 space-y-6">
        {/* Earned */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-4 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Conquistadas ({earned.length})
          </p>
          <div className="grid grid-cols-2 gap-4">
            {earned.map((b, i) => {
              const BadgeIcon = BADGE_ICONS[b.iconName] || Compass;
              const palette = BADGE_COLOR_PALETTES[b.iconName] || { bg: "bg-primary/10", border: "border-primary/30", icon: "text-primary", ring: "" };
              return (
                <div
                  key={b.id}
                  className={`relative p-4 rounded-xl border-2 ${palette.bg} ${palette.border} overflow-hidden animate-fade-in-scale`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer pointer-events-none" />
                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-success" />
                  <BadgeIcon className={`w-8 h-8 mb-2 ${palette.icon}`} />
                  <p className="font-semibold text-sm text-foreground">{b.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* In progress */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-4 flex items-center gap-1.5">
            <Lock className="w-4 h-4" />
            Em progresso ({inProgress.length})
          </p>
          <div className="grid grid-cols-2 gap-4">
            {inProgress.map((b, i) => {
              const BadgeIcon = BADGE_ICONS[b.iconName] || Compass;
              const palette = BADGE_COLOR_PALETTES[b.iconName] || { bg: "", border: "", icon: "", ring: "#888" };
              return (
                <div
                  key={b.id}
                  className="relative p-4 rounded-xl border-2 border-muted bg-muted/30 animate-fade-in-up"
                  style={{ animationDelay: `${i * 100 + 200}ms` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <BadgeIcon className="w-7 h-7 text-muted-foreground opacity-60" />
                    <div className="relative">
                      <ProgressRing progress={b.progress!} total={b.total!} color={palette.ring} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {b.progress}/{b.total}
                      </span>
                    </div>
                  </div>
                  <p className="font-semibold text-sm text-muted-foreground">{b.name}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
