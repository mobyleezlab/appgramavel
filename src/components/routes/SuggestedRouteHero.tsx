import { ChevronRight, Clock, MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  title: string;
  imageUrl: string | null;
  duration?: string | null;
  stopsCount: number;
  difficulty?: string | null;
  onClick: () => void;
  onStart?: () => void;
}

export function SuggestedRouteHero({
  title,
  imageUrl,
  duration,
  stopsCount,
  difficulty,
  onClick,
  onStart,
}: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" ? onClick() : null)}
      className="relative rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="aspect-[2/1] overflow-hidden bg-secondary">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="eager"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-white font-bold text-lg drop-shadow">{title}</h3>
        <div className="flex items-end justify-between gap-2 mt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {duration && (
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                <Clock className="w-3 h-3" />
                {duration}
              </Badge>
            )}
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
              <MapPin className="w-3 h-3" />
              {stopsCount} paradas
            </Badge>
            {difficulty && (
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs">
                {difficulty}
              </Badge>
            )}
          </div>
          {onStart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className="shrink-0 inline-flex items-center gap-1.5 bg-white/95 hover:bg-white text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-md active:scale-95 transition-transform"
              aria-label="Iniciar roteiro"
            >
              <Navigation className="w-3.5 h-3.5" />
              Iniciar
            </button>
          )}
        </div>
      </div>
      <div className="absolute top-3 right-3">
        <ChevronRight className="w-5 h-5 text-white/70" />
      </div>
    </div>
  );
}
