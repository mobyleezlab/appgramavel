import { useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock,
  MapPin,
  Mountain,
  Sparkles,
  Edit3,
  StickyNote,
  CalendarDays,
  Flag,
  Check,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
  { label: string; className: string; dot: string }
> = {
  high: {
    label: "Alta",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
  medium: {
    label: "Média",
    className: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  low: {
    label: "Baixa",
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
  },
};

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

  const [noteStop, setNoteStop] = useState<{ id: string; name: string; value: string } | null>(null);

  const route: any = isUser ? mine.data : suggested.data;
  const loading = isUser ? mine.isLoading : suggested.isLoading;

  const stops = useMemo(() => {
    if (!route) return [];
    const list = isUser ? route.user_route_stops : route.route_stops;
    return (list ?? [])
      .slice()
      .sort((a: any, b: any) => a.stop_order - b.stop_order);
  }, [route, isUser]);

  const validStops = stops.filter((s: any) => s.establishment?.latitude != null);
  const visitedCount = isUser ? stops.filter((s: any) => s.visited).length : 0;

  const grouped = useMemo(() => {
    if (!isUser) return null;
    const map = new Map<number | null, any[]>();
    for (const s of stops) {
      const key = (s.planned_day as number | null) ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // Order: nulls first, then 1..N
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === null) return -1;
      if (b[0] === null) return 1;
      return (a[0] as number) - (b[0] as number);
    });
  }, [isUser, stops]);

  const maxDay = useMemo(() => {
    const nums = stops
      .map((s: any) => s.planned_day)
      .filter((d: any) => typeof d === "number") as number[];
    return nums.length ? Math.max(...nums) : 0;
  }, [stops]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <GlobalHeader showBack />
        <main className="max-w-2xl mx-auto pb-20">
          <Skeleton className="aspect-[2/1]" />
          <div className="px-4 pt-4 space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 w-full" />
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

  const saveNote = () => {
    if (!noteStop) return;
    updateStop.mutate(
      { stopId: noteStop.id, input: { personal_note: noteStop.value.trim() || null } },
      {
        onSuccess: () => {
          toast.success("Nota salva");
          setNoteStop(null);
        },
      },
    );
  };

  const dayOptions = Array.from({ length: Math.max(maxDay + 1, 3) }, (_, i) => i + 1);
  const days = new Set(
    stops.map((s: any) => s.planned_day).filter((d: any) => !!d),
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

        <div className="px-4 pt-4 space-y-5">
          {route.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{route.description}</p>
          )}

          {/* Mini map (referência, sem rota) */}
          {validStops.length > 0 && (
            <RoutePreviewMap
              stops={validStops.map((s: any) => ({
                lat: s.establishment.latitude,
                lng: s.establishment.longitude,
                name: s.establishment.name,
              }))}
              className="rounded-xl overflow-hidden border border-border"
              height={180}
            />
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
            <div className="space-y-5">
              {grouped.map(([day, items]) => {
                const groupVisited = items.filter((s) => s.visited).length;
                return (
                  <section key={String(day)}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {day === null ? "Sem dia definido" : `Dia ${day}`}
                      </h3>
                      <span className="text-[11px] text-muted-foreground">
                        {groupVisited}/{items.length} visitados
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.map((s) => {
                        const e = s.establishment;
                        if (!e) return null;
                        const priority = (s.priority as StopPriority | null) ?? "medium";
                        const pMeta = PRIORITY_META[priority];
                        const hasNote = !!s.personal_note?.trim();
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              "flex items-start gap-3 p-3 bg-card rounded-2xl border border-border/60 transition-opacity",
                              s.visited && "opacity-70",
                            )}
                          >
                            <Checkbox
                              checked={!!s.visited}
                              onCheckedChange={(v) => toggleVisited(s.id, !!v)}
                              className="mt-1 h-5 w-5"
                              aria-label={`Marcar ${e.name} como visitado`}
                            />
                            <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-secondary">
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
                              <p
                                className={cn(
                                  "text-sm font-medium truncate",
                                  s.visited && "line-through text-muted-foreground",
                                )}
                              >
                                {e.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {e.category}
                              </p>

                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {/* Priority */}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      className={cn(
                                        "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                                        pMeta.className,
                                      )}
                                    >
                                      <Flag className="w-2.5 h-2.5" />
                                      {pMeta.label}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40 p-1" align="start">
                                    {(Object.keys(PRIORITY_META) as StopPriority[]).map((p) => (
                                      <button
                                        key={p}
                                        onClick={() => setPriority(s.id, p)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-left"
                                      >
                                        <span
                                          className={cn("w-2 h-2 rounded-full", PRIORITY_META[p].dot)}
                                        />
                                        {PRIORITY_META[p].label}
                                        {priority === p && (
                                          <Check className="w-3 h-3 ml-auto text-primary" />
                                        )}
                                      </button>
                                    ))}
                                  </PopoverContent>
                                </Popover>

                                {/* Day */}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground">
                                      <CalendarDays className="w-2.5 h-2.5" />
                                      {s.planned_day ? `Dia ${s.planned_day}` : "Sem dia"}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40 p-1" align="start">
                                    <button
                                      onClick={() => setDay(s.id, null)}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-left"
                                    >
                                      Sem dia
                                      {!s.planned_day && (
                                        <Check className="w-3 h-3 ml-auto text-primary" />
                                      )}
                                    </button>
                                    {dayOptions.map((d) => (
                                      <button
                                        key={d}
                                        onClick={() => setDay(s.id, d)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-left"
                                      >
                                        Dia {d}
                                        {s.planned_day === d && (
                                          <Check className="w-3 h-3 ml-auto text-primary" />
                                        )}
                                      </button>
                                    ))}
                                  </PopoverContent>
                                </Popover>

                                {/* Note */}
                                <button
                                  onClick={() =>
                                    setNoteStop({
                                      id: s.id,
                                      name: e.name,
                                      value: s.personal_note ?? "",
                                    })
                                  }
                                  className={cn(
                                    "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                                    hasNote
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "border-border bg-background text-muted-foreground",
                                  )}
                                >
                                  <StickyNote className="w-2.5 h-2.5" />
                                  {hasNote ? "Nota" : "Nota"}
                                </button>
                              </div>

                              {hasNote && (
                                <p className="mt-2 text-[11px] text-muted-foreground italic bg-secondary/50 rounded-md p-2 leading-snug">
                                  {s.personal_note}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

      {/* Nota sheet */}
      <Sheet open={!!noteStop} onOpenChange={(v) => !v && setNoteStop(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Nota — {noteStop?.name}</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Textarea
              value={noteStop?.value ?? ""}
              onChange={(e) =>
                setNoteStop((prev) =>
                  prev ? { ...prev, value: e.target.value.slice(0, 280) } : prev,
                )
              }
              placeholder="Ex: reservar mesa, chegar antes do pôr-do-sol…"
              rows={4}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">
              {noteStop?.value.length ?? 0}/280
            </p>
          </div>
          <SheetFooter>
            <Button className="w-full rounded-full" onClick={saveNote}>
              Salvar nota
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
