import {
  MoreVertical,
  CalendarDays,
  Trash2,
  Edit3,
  Copy,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  medium: "bg-primary",
  low: "bg-emerald-500",
};

const PRIORITY_LABEL: Record<StopPriority, string> = {
  high: "alta",
  medium: "média",
  low: "baixa",
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
  const progress = total > 0 ? Math.round((visited / total) * 100) : 0;

  const maxDay = stops.reduce(
    (acc, s) => (typeof s.planned_day === "number" && s.planned_day > acc ? s.planned_day : acc),
    0,
  );

  const priorityCounts = stops.reduce(
    (acc, s) => {
      const p = (s.priority ?? "medium") as StopPriority;
      acc[p] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 } as Record<StopPriority, number>,
  );

  return (
    <div className="relative bg-card rounded-2xl border border-border/70 shadow-card overflow-hidden">
      <button
        onClick={onOpen}
        className="w-full text-left p-4 active:scale-[0.995] transition-transform"
      >
        <div className="flex items-start justify-between gap-3 pr-8">
          <h3 className="font-semibold text-foreground text-[15px] leading-snug flex-1 min-w-0">
            {route.title}
          </h3>
        </div>

        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {maxDay > 0
              ? `${maxDay} ${maxDay === 1 ? "dia" : "dias"} planejados`
              : "Sem dias definidos"}
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="w-3 h-3" />
              <span className="tabular-nums">
                {visited} de {total} visitados
              </span>
            </span>
            <span className="text-muted-foreground tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {total > 0 && (
          <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
            {(["high", "medium", "low"] as StopPriority[]).map((p) =>
              priorityCounts[p] > 0 ? (
                <span key={p} className="inline-flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[p]}`} />
                  <span className="tabular-nums">
                    {priorityCounts[p]} {PRIORITY_LABEL[p]}
                  </span>
                </span>
              ) : null,
            )}
          </div>
        )}
      </button>

      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Mais opções"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
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
    </div>
  );
}
