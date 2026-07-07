import {
  MoreVertical,
  Trash2,
  Edit3,
  Copy,
  Share2,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRouteRow, StopPriority } from "@/services/userRoutes";

interface Props {
  route: UserRouteRow;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}

const PRIORITY_DOT: Record<StopPriority, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

export function MyRouteCard({
  route,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
}: Props) {
  const stops = route.user_route_stops ?? [];
  const total = stops.length;
  const visited = stops.filter((s) => s.visited).length;

  const maxDay = stops.reduce(
    (acc, s) => (typeof s.planned_day === "number" && s.planned_day > acc ? s.planned_day : acc),
    0,
  );

  const priorityCounts = stops.reduce(
    (acc, s) => {
      const p = (s.priority ?? null) as StopPriority | null;
      if (p) acc[p] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 } as Record<StopPriority, number>,
  );

  const meta = [
    total > 0 ? `${visited} de ${total} visitados` : "Nenhuma parada",
    maxDay > 0 ? `${maxDay} ${maxDay === 1 ? "dia" : "dias"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={onOpen}
        className="flex-1 flex items-center gap-3 py-3 pl-4 pr-2 text-left min-w-0 active:bg-secondary/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-foreground truncate">
            {route.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{meta}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(["high", "medium", "low"] as StopPriority[]).map((p) =>
            priorityCounts[p] > 0 ? (
              <span
                key={p}
                className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[p]}`}
                aria-hidden
              />
            ) : null,
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 mr-1 rounded-full text-muted-foreground/60 hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Mais opções"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onEdit}>
            <Edit3 className="w-4 h-4 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="w-4 h-4 mr-2" /> Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onShare}>
            <Share2 className="w-4 h-4 mr-2" /> Compartilhar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
