import { ChevronRight, Clock, MapPin } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string | null;
  duration?: string | null;
  stopsCount: number;
  imageUrl: string | null;
  onClick: () => void;
}

export function SuggestedRouteRow({
  title,
  subtitle,
  duration,
  stopsCount,
  imageUrl,
  onClick,
}: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all active:scale-[0.99] text-left"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary shrink-0">
        {imageUrl && (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {duration}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {stopsCount} paradas
          </span>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  );
}
