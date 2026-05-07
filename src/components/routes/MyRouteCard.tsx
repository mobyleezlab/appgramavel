import { ChevronRight, MapPin, MoreVertical, Play, CheckCircle2, Bookmark } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, Edit3, Copy, Share2 } from "lucide-react";
import type { UserRouteRow } from "@/services/userRoutes";

interface Props {
  route: UserRouteRow;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}

export function MyRouteCard({ route, onOpen, onEdit, onDelete, onDuplicate, onShare }: Props) {
  const stops = route.user_route_stops ?? [];
  const total = stops.length;
  const visited = stops.filter((s) => s.visited).length;
  const progress = total > 0 ? Math.round((visited / total) * 100) : 0;

  const cover =
    route.cover_url ||
    stops.sort((a, b) => a.stop_order - b.stop_order)[0]?.establishment?.image_url ||
    stops[0]?.establishment?.logo_url ||
    null;

  const statusBadge = () => {
    if (route.status === "in_progress")
      return (
        <Badge className="bg-primary/10 text-primary border-0 gap-1 text-[10px] py-0 px-2">
          <Play className="w-3 h-3" /> Em andamento
        </Badge>
      );
    if (route.status === "completed")
      return (
        <Badge className="bg-success/10 text-success border-0 gap-1 text-[10px] py-0 px-2">
          <CheckCircle2 className="w-3 h-3" /> Concluído
        </Badge>
      );
    return (
      <Badge variant="secondary" className="gap-1 text-[10px] py-0 px-2">
        <Bookmark className="w-3 h-3" /> Salvo
      </Badge>
    );
  };

  return (
    <div className="relative bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <button
        onClick={onOpen}
        className="w-full flex items-stretch gap-3 p-3 active:scale-[0.99] transition-transform text-left"
      >
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary shrink-0">
          {cover && (
            <img src={cover} alt={route.title} className="w-full h-full object-cover" loading="lazy" />
          )}
        </div>
        <div className="flex-1 min-w-0 py-0.5 flex flex-col">
          <div className="flex items-start gap-2">
            <p className="font-semibold text-foreground text-sm truncate flex-1">
              {route.title}
            </p>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            {statusBadge()}
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {total} {total === 1 ? "parada" : "paradas"}
            </span>
          </div>
          <div className="mt-auto pt-2">
            <Progress value={progress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {visited}/{total} concluídas
            </p>
          </div>
        </div>
      </button>

      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 rounded-full bg-background/80 backdrop-blur hover:bg-secondary transition-colors"
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
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
