import { GripVertical, X, CalendarDays, Check, ChevronDown } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Establishment } from "@/data/mock";

interface Props {
  id: string;
  index: number;
  establishment: Pick<Establishment, "name" | "category" | "logo_url" | "image_url">;
  onRemove: () => void;
  /** Optional day planner integration */
  day?: number | null;
  dayOptions?: number[];
  onSetDay?: (d: number | null) => void;
  onAddDay?: () => void;
}

export function SortableStop({
  id,
  index,
  establishment,
  onRemove,
  day,
  dayOptions,
  onSetDay,
  onAddDay,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasPlanner = !!onSetDay && !!dayOptions;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 bg-card rounded-xl border border-border",
        isDragging && "shadow-lg z-10 opacity-80",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 -ml-1 text-muted-foreground touch-none cursor-grab active:cursor-grabbing"
        aria-label="Reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
        {index + 1}
      </div>
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary">
        {(establishment.logo_url || establishment.image_url) && (
          <img
            src={establishment.logo_url || establishment.image_url}
            alt={establishment.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{establishment.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{establishment.category}</p>
        {hasPlanner && (
          <div className="mt-1">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    day
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "border-dashed border-border bg-background text-muted-foreground",
                  )}
                >
                  <CalendarDays className="w-2.5 h-2.5" />
                  {day ? `Dia ${day}` : "Qual dia?"}
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                <button
                  onClick={() => onSetDay?.(null)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-left"
                >
                  Sem dia
                  {!day && <Check className="w-3 h-3 ml-auto text-primary" />}
                </button>
                {dayOptions!.map((d) => (
                  <button
                    key={d}
                    onClick={() => onSetDay?.(d)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-left"
                  >
                    Dia {d}
                    {day === d && <Check className="w-3 h-3 ml-auto text-primary" />}
                  </button>
                ))}
                {onAddDay && (
                  <button
                    onClick={onAddDay}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-left text-primary border-t border-border/50 mt-1 pt-2"
                  >
                    + Novo dia
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="p-2 -mr-1 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        aria-label="Remover parada"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
