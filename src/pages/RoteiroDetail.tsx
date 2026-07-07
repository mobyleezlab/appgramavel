import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock,
  MapPin,
  Mountain,
  Sparkles,
  Edit3,
  CalendarDays,
  Check,
  GripVertical,
} from "lucide-react";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import RoutePreviewMap from "@/components/routes/RoutePreviewMap";
import { cn } from "@/lib/utils";

import {
  useCloneSuggestedRoute,
  useMarkStopVisited,
  useMyRoute,
  useSuggestedRoute,
  useUpdateStop,
} from "@/hooks/useRoutes";
import type { StopPriority } from "@/services/userRoutes";
import { toast } from "sonner";

const PRIORITY_META: Record<
  StopPriority,
  { label: string; dot: string; bar: string }
> = {
  high: {
    label: "Alta",
    dot: "bg-destructive",
    bar: "bg-destructive",
  },
  medium: {
    label: "Média",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  low: {
    label: "Baixa",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
};


interface StopItem {
  id: string;
  stop_order: number;
  visited: boolean;
  personal_note: string | null;
  planned_day: number | null;
  priority: StopPriority | null;
  establishment: any;
}

export default function RoteiroDetail() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isUser = params.get("type") === "user";

  const suggested = useSuggestedRoute(!isUser ? id : undefined);
  const mine = useMyRoute(isUser ? id : undefined);
  const clone = useCloneSuggestedRoute();
  const markVisited = useMarkStopVisited();
  const updateStop = useUpdateStop();

  const route: any = isUser ? mine.data : suggested.data;
  const loading = isUser ? mine.isLoading : suggested.isLoading;

  const stops = useMemo<StopItem[]>(() => {
    if (!route) return [];
    const list = isUser ? route.user_route_stops : route.route_stops;
    return (list ?? [])
      .slice()
      .sort((a: any, b: any) => a.stop_order - b.stop_order);
  }, [route, isUser]);

  const validStops = stops.filter((s: any) => s.establishment?.latitude != null);
  const visitedCount = isUser ? stops.filter((s) => s.visited).length : 0;

  // Local optimistic order used by dnd; synced from server data
  const [localStops, setLocalStops] = useState<StopItem[]>([]);
  useEffect(() => {
    if (isUser) setLocalStops(stops);
  }, [isUser, stops]);

  const grouped = useMemo(() => {
    if (!isUser) return null;
    const source = localStops.length ? localStops : stops;
    const map = new Map<number | null, StopItem[]>();
    for (const s of source) {
      const key = (s.planned_day as number | null) ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === null) return -1;
      if (b[0] === null) return 1;
      return (a[0] as number) - (b[0] as number);
    });
  }, [isUser, stops, localStops]);

  const maxDay = useMemo(() => {
    const nums = stops
      .map((s) => s.planned_day)
      .filter((d): d is number => typeof d === "number");
    return nums.length ? Math.max(...nums) : 0;
  }, [stops]);

  // inline note editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <GlobalHeader showBack />
        <main className="max-w-2xl mx-auto pb-20">
          <Skeleton className="aspect-[2/1]" />
          <div className="px-4 pt-4 space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Roteiro não encontrado</p>
      </div>
    );
  }

  const cover = isUser
    ? route.cover_url || stops[0]?.establishment?.image_url
    : route.image_url;

  const handleSaveToMyList = async () => {
    if (!id) return;
    try {
      const newId = await clone.mutateAsync(id);
      toast.success("Adicionado às suas listas");
      if (newId) navigate(`/roteiros/${newId}?type=user`);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível salvar");
    }
  };

  const toggleVisited = (stopId: string, next: boolean) => {
    markVisited.mutate({ stopId, visited: next });
  };

  const setDay = (stopId: string, day: number | null) => {
    updateStop.mutate({ stopId, input: { planned_day: day } });
  };

  const setPriority = (stopId: string, priority: StopPriority) => {
    updateStop.mutate({ stopId, input: { priority } });
  };

  const startEditNote = (stop: StopItem) => {
    setEditingNoteId(stop.id);
    setNoteDraft(stop.personal_note ?? "");
  };

  const commitNote = (stopId: string) => {
    const trimmed = noteDraft.trim();
    updateStop.mutate({
      stopId,
      input: { personal_note: trimmed || null },
    });
    setEditingNoteId(null);
  };

  const persistOrder = (ordered: StopItem[]) => {
    // Re-number stop_order globally based on new order, then persist changed rows.
    ordered.forEach((s, i) => {
      const newOrder = i + 1;
      if (s.stop_order !== newOrder) {
        updateStop.mutate({ stopId: s.id, input: { stop_order: newOrder } });
      }
    });
  };

  const handleDragEnd = (day: number | null) => (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setLocalStops((prev) => {
      // Reorder within the same day group
      const sameDay = prev.filter((s) => (s.planned_day ?? null) === day);
      const oldIdx = sameDay.findIndex((s) => s.id === e.active.id);
      const newIdx = sameDay.findIndex((s) => s.id === e.over!.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      const reorderedDay = arrayMove(sameDay, oldIdx, newIdx);

      // Rebuild global order: preserve day groups in existing order,
      // but for the targeted day use the reordered version.
      const seenDays = new Set<number | null>();
      const dayOrder: (number | null)[] = [];
      for (const s of prev) {
        const k = s.planned_day ?? null;
        if (!seenDays.has(k)) {
          seenDays.add(k);
          dayOrder.push(k);
        }
      }
      const next: StopItem[] = [];
      for (const d of dayOrder) {
        if (d === day) next.push(...reorderedDay);
        else next.push(...prev.filter((s) => (s.planned_day ?? null) === d));
      }
      persistOrder(next);
      return next;
    });
  };

  const dayOptions = Array.from({ length: Math.max(maxDay + 1, 3) }, (_, i) => i + 1);
  const days = new Set(
    stops.map((s) => s.planned_day).filter((d): d is number => !!d),
  ).size;

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader showBack onBack={() => navigate("/roteiros")} />

      <main className="max-w-2xl mx-auto pb-24">
        {/* Hero */}
        <div className="relative aspect-[2/1] overflow-hidden">
          {cover && <img src={cover} alt={route.title} className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h1 className="text-white font-bold text-xl">{route.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {route.duration && !isUser && (
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                  <Clock className="w-3 h-3" />{route.duration}
                </Badge>
              )}
              {route.difficulty && !isUser && (
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                  <Mountain className="w-3 h-3" />{route.difficulty}
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                <MapPin className="w-3 h-3" />{stops.length} paradas
              </Badge>
              {isUser && (
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                  <Check className="w-3 h-3" />{visitedCount}/{stops.length} visitados
                </Badge>
              )}
              {isUser && days > 0 && (
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs gap-1">
                  <CalendarDays className="w-3 h-3" />{days} {days === 1 ? "dia" : "dias"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-6">
          {route.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{route.description}</p>
          )}

          {/* Mini map (referência de localização, sem rota guiada) */}
          {validStops.length > 0 && (
            <div>
              <RoutePreviewMap
                stops={validStops.map((s: any) => ({
                  lat: s.establishment.latitude,
                  lng: s.establishment.longitude,
                  name: s.establishment.name,
                }))}
                variant={isUser ? "pins" : "route"}
                className="rounded-xl overflow-hidden border border-border"
                height={160}
              />
              {isUser && (
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  Visão geral dos locais — sem ordem de trajeto
                </p>
              )}
            </div>
          )}

          {/* CTA */}
          {!isUser ? (
            <Button
              className="w-full rounded-full gap-2"
              onClick={handleSaveToMyList}
              disabled={clone.isPending}
            >
              <Sparkles className="w-4 h-4" />
              Salvar na minha lista
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full rounded-full gap-2"
              onClick={() => navigate(`/roteiros/${id}/editar`)}
            >
              <Edit3 className="w-4 h-4" />
              Editar lista
            </Button>
          )}

          {/* Planner (user) OR simple list (suggested) */}
          {isUser && grouped ? (
            <div className="-mx-4">
              {grouped.map(([day, items]) => {
                const groupVisited = items.filter((s) => s.visited).length;
                return (
                  <section key={String(day)}>
                    <div className="flex items-baseline justify-between px-4 pt-6 pb-2">
                      <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {day === null ? "Sem dia definido" : `Dia ${day}`}
                      </h2>
                      <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                        {groupVisited}/{items.length}
                      </span>
                    </div>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd(day)}
                    >
                      <SortableContext
                        items={items.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="border-t border-border/40">
                          {items.map((s) => (
                            <StopRow
                              key={s.id}
                              stop={s}
                              editing={editingNoteId === s.id}
                              noteDraft={noteDraft}
                              setNoteDraft={setNoteDraft}
                              onStartEditNote={() => startEditNote(s)}
                              onCommitNote={() => commitNote(s.id)}
                              onCancelNote={() => setEditingNoteId(null)}
                              onToggleVisited={(v) => toggleVisited(s.id, v)}
                              onSetPriority={(p) => setPriority(s.id, p)}
                              onSetDay={(d) => setDay(s.id, d)}
                              dayOptions={dayOptions}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </section>
                );
              })}
            </div>

          ) : (
            <div>
              <h3 className="text-sm font-semibold mb-4">Paradas do roteiro</h3>
              <div className="relative pl-8 space-y-2">
                <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-primary/20" />
                {stops.map((s: any, i: number) => {
                  const e = s.establishment;
                  if (!e) return null;
                  return (
                    <div
                      key={i}
                      className="relative flex items-center gap-3 p-3 bg-card rounded-2xl border border-border/50"
                    >
                      <div className="absolute -left-8 w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold z-10 bg-primary text-primary-foreground">
                        {i + 1}
                      </div>
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-secondary">
                        {(e.image_url || e.logo_url) && (
                          <img
                            src={e.image_url || e.logo_url}
                            alt={e.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{e.category}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

/* -------- Sortable stop row (checklist card) -------- */

interface StopRowProps {
  stop: StopItem;
  editing: boolean;
  noteDraft: string;
  setNoteDraft: (v: string) => void;
  onStartEditNote: () => void;
  onCommitNote: () => void;
  onCancelNote: () => void;
  onToggleVisited: (v: boolean) => void;
  onSetPriority: (p: StopPriority) => void;
  onSetDay: (d: number | null) => void;
  dayOptions: number[];
}

function StopRow({
  stop,
  editing,
  noteDraft,
  setNoteDraft,
  onStartEditNote,
  onCommitNote,
  onCancelNote,
  onToggleVisited,
  onSetPriority,
  onSetDay,
  dayOptions,
}: StopRowProps) {
  const sortable = useSortable({ id: stop.id });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const e = stop.establishment;
  if (!e) return null;
  const priority = (stop.priority as StopPriority | null) ?? "medium";
  const hasPriority = !!stop.priority;
  const pMeta = PRIORITY_META[priority];
  const hasNote = !!stop.personal_note?.trim();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-start gap-3 pl-4 pr-2 py-3 border-b border-border/40 bg-background transition-colors",
        isDragging && "shadow-sm z-10 bg-card",
      )}
    >
      {/* Priority bar (tap to change) */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm",
              hasPriority ? pMeta.bar : "bg-transparent",
            )}
            aria-label={`Prioridade ${pMeta.label}`}
          />
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          {(Object.keys(PRIORITY_META) as StopPriority[]).map((p) => (
            <button
              key={p}
              onClick={() => onSetPriority(p)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-left"
            >
              <span className={cn("w-2 h-2 rounded-full", PRIORITY_META[p].dot)} />
              {PRIORITY_META[p].label}
              {priority === p && (
                <Check className="w-3 h-3 ml-auto text-primary" />
              )}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <div className="pt-0.5">
        <Checkbox
          checked={!!stop.visited}
          onCheckedChange={(v) => onToggleVisited(!!v)}
          className="h-5 w-5 rounded"
          aria-label={`Marcar ${e.name} como visitado`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[15px] leading-snug text-foreground",
            stop.visited && "line-through text-muted-foreground",
          )}
        >
          {e.name}
          {e.category && (
            <span className="text-xs text-muted-foreground font-normal"> · {e.category}</span>
          )}
        </p>

        {/* Personal note — inline editable, discreet gray */}
        {editing ? (
          <div className="mt-1.5">
            <Textarea
              autoFocus
              value={noteDraft}
              onChange={(ev) => setNoteDraft(ev.target.value.slice(0, 280))}
              onBlur={onCommitNote}
              onKeyDown={(ev) => {
                if (ev.key === "Escape") {
                  ev.preventDefault();
                  onCancelNote();
                }
                if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
                  ev.preventDefault();
                  onCommitNote();
                }
              }}
              rows={2}
              placeholder="Ex: reservar mesa, chegar antes do pôr-do-sol…"
              className="resize-none text-xs"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">
              {noteDraft.length}/280 · toque fora para salvar
            </p>
          </div>
        ) : hasNote ? (
          <button
            onClick={onStartEditNote}
            className="mt-0.5 block w-full text-left text-xs text-muted-foreground leading-snug"
          >
            {stop.personal_note}
          </button>
        ) : (
          <button
            onClick={onStartEditNote}
            className="mt-0.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Adicionar nota
          </button>
        )}

        {/* Day picker — very discreet */}
        <div className="mt-1">
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors">
                {stop.planned_day ? `Dia ${stop.planned_day}` : "Sem dia"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              <button
                onClick={() => onSetDay(null)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-left"
              >
                Sem dia
                {!stop.planned_day && <Check className="w-3 h-3 ml-auto text-primary" />}
              </button>
              {dayOptions.map((d) => (
                <button
                  key={d}
                  onClick={() => onSetDay(d)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-left"
                >
                  Dia {d}
                  {stop.planned_day === d && (
                    <Check className="w-3 h-3 ml-auto text-primary" />
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 self-center text-muted-foreground/30 hover:text-muted-foreground touch-none cursor-grab active:cursor-grabbing"
        aria-label="Reordenar parada"
      >
        <GripVertical className="w-4 h-4" />
      </button>

    </div>
  );
}
