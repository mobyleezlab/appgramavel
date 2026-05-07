import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Establishment } from "@/data/mock";

interface Props {
  id: string;
  index: number;
  establishment: Pick<Establishment, "name" | "category" | "logo_url" | "image_url">;
  onRemove: () => void;
}

export function SortableStop({ id, index, establishment, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-card rounded-xl border border-border ${
        isDragging ? "shadow-lg z-10 opacity-80" : ""
      }`}
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
